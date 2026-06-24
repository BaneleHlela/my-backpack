// Wraps the Free Dictionary API (https://api.dictionaryapi.dev/api/v2/entries/en/{word}).
// searchWord() makes the HTTP request and returns the raw API entries.
// parseAndStoreTerm() is idempotent: it creates Term + Definition documents on first lookup,
// or returns the existing documents if the word was already searched before.
//
// The API can return multiple "entries" for the same word (each entry may cover different
// etymologies or parts of speech). We flatten all meanings from all entries into individual
// Definition documents, deduplicating synonyms/antonyms at the definition level.
import https from 'https';
import Term, { ITermDocument } from '../models/apps/language/vocabulary/term.model';
import Definition, { IDefinitionDocument } from '../models/apps/language/vocabulary/definition.model';

interface ApiDefinition {
  definition: string;
  example?: string;
  synonyms: string[];
  antonyms: string[];
}

interface ApiMeaning {
  partOfSpeech: string;
  definitions: ApiDefinition[];
  synonyms: string[];
  antonyms: string[];
}

interface ApiPhonetic {
  text?: string;
  audio?: string;
}

interface ApiEntry {
  word: string;
  phonetic?: string;
  origin?: string;
  phonetics?: ApiPhonetic[];
  meanings: ApiMeaning[];
}

export interface ParsedTerm {
  term: ITermDocument;
  definitions: IDefinitionDocument[];
  isNew: boolean;
}

// Fetches a word from the Free Dictionary API. Throws on 404 (word not found) or API errors.
export function searchWord(word: string): Promise<ApiEntry[]> {
  const normalised = word.toLowerCase().trim();
  const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(normalised)}`;

  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      let raw = '';
      res.on('data', (chunk: Buffer) => {
        raw += chunk.toString();
      });
      res.on('end', () => {
        if (res.statusCode === 404) {
          reject(new Error(`Word not found: "${word}"`));
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`Dictionary API returned status ${String(res.statusCode)}`));
          return;
        }
        try {
          const data = JSON.parse(raw) as ApiEntry[];
          resolve(data);
        } catch {
          reject(new Error('Failed to parse Dictionary API response'));
        }
      });
      res.on('error', (err: Error) => reject(err));
    });
    req.on('error', (err: Error) => reject(err));
  });
}

// Creates Term + Definition documents from raw API entries.
// Idempotent — returns existing documents if the word was previously stored.
export async function parseAndStoreTerm(
  entries: ApiEntry[],
  miniAppId: string
): Promise<ParsedTerm> {
  const first = entries[0];
  if (!first) throw new Error('No entries in API response');

  const word = first.word.toLowerCase().trim();

  const existing = await Term.findOne({ word });
  if (existing) {
    const definitions = await Definition.find({ termId: existing._id }).sort({ order: 1 });
    return { term: existing, definitions, isNew: false };
  }

  const audioUrl = first.phonetics?.find((p) => p.audio && p.audio.length > 0)?.audio;

  const term = new Term({
    word,
    miniAppId,
    phonetic: first.phonetic,
    origin: first.origin,
    audioUrl,
    source: 'dictionary_api',
  });
  await term.save();

  const definitionDocs: IDefinitionDocument[] = [];
  let order = 0;

  for (const entry of entries) {
    for (const meaning of entry.meanings) {
      for (const def of meaning.definitions) {
        // Merge synonyms/antonyms from the meaning level and the definition level
        const synonyms = Array.from(new Set([...meaning.synonyms, ...def.synonyms]));
        const antonyms = Array.from(new Set([...meaning.antonyms, ...def.antonyms]));

        const definition = new Definition({
          termId: term._id,
          partOfSpeech: meaning.partOfSpeech,
          definition: def.definition,
          examples: def.example ? [def.example] : [],
          synonyms,
          antonyms,
          order: order++,
        });
        await definition.save();
        definitionDocs.push(definition);
      }
    }
  }

  return { term, definitions: definitionDocs, isNew: true };
}
