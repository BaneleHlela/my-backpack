// Wraps the Merriam-Webster Collegiate Dictionary API.
// searchWord() makes the HTTP request and normalises Merriam-Webster's response into the
// dictionary shape used by the rest of the vocabulary service.
// parseAndStoreTerm() is idempotent: it creates Term + Definition documents on first lookup,
// or returns the existing documents if the word was already searched before.
import https from 'https';
import Term, { ITermDocument } from '../models/apps/language/vocabulary/term.model';
import Definition, { IDefinitionDocument } from '../models/apps/language/vocabulary/definition.model';

interface MerriamWebsterPronunciation {
  mw?: string;
  sound?: {
    audio?: string;
  };
}

interface MerriamWebsterEntry {
  meta?: {
    id?: string;
    uuid?: string;
    stems?: string[];
  };
  hwi?: {
    hw?: string;
    prs?: MerriamWebsterPronunciation[];
  };
  fl?: string;
  shortdef?: string[];
  suppl?: {
    examples?: Array<{ t?: string }>;
  };
}

interface DictionaryApiDefinition {
  sourceEntryId?: string;
  sourceEntryUuid?: string;
  sourceSenseKey?: string;
  definition: string;
  example?: string;
  synonyms: string[];
  antonyms: string[];
}

interface DictionaryApiMeaning {
  partOfSpeech: string;
  definitions: DictionaryApiDefinition[];
  synonyms: string[];
  antonyms: string[];
}

interface DictionaryApiPhonetic {
  text?: string;
  audio?: string;
}

interface DictionaryApiEntry {
  word: string;
  phonetic?: string;
  origin?: string;
  phonetics?: DictionaryApiPhonetic[];
  meanings: DictionaryApiMeaning[];
}

export interface ParsedTerm {
  term: ITermDocument;
  definitions: IDefinitionDocument[];
  isNew: boolean;
}

const MERRIAM_WEBSTER_API_KEY = process.env.MERRIAM_WEBSTER_API_KEY;
const DICTIONARY_API_TIMEOUT_MS = 8000;
const DICTIONARY_API_BASE_URL = 'https://www.dictionaryapi.com/api/v3/references/collegiate/json';

if (!MERRIAM_WEBSTER_API_KEY) {
  console.warn('MERRIAM_WEBSTER_API_KEY is not configured; vocabulary searches will fail until it is set.');
}

function buildAudioUrl(audio: string): string {
  let subdirectory: string;

  if (audio.startsWith('bix')) {
    subdirectory = 'bix';
  } else if (audio.startsWith('gg')) {
    subdirectory = 'gg';
  } else if (/^[0-9_]/.test(audio)) {
    subdirectory = 'number';
  } else {
    subdirectory = audio.charAt(0);
  }

  return `https://media.merriam-webster.com/audio/prons/en/us/mp3/${subdirectory}/${audio}.mp3`;
}

function stripMarkup(text: string): string {
  return text
    .replace(/\{\/?.*?\|/g, '')
    .replace(/\{\/?.*?\}/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function toDictionaryEntries(entries: MerriamWebsterEntry[]): DictionaryApiEntry[] {
  return entries
    .filter((entry) => Array.isArray(entry.shortdef) && entry.shortdef.length > 0)
    .map((entry) => {
      const word = (entry.meta?.id ?? entry.hwi?.hw ?? entry.meta?.stems?.[0] ?? '').replace(/:\d+$/, '').replace(/\*/g, '').trim();
      const pronunciation = entry.hwi?.prs?.find((p) => p.mw)?.mw;
      const audio = entry.hwi?.prs?.find((p) => p.sound?.audio)?.sound?.audio;
      const examples = (entry.suppl?.examples ?? [])
        .map((example) => example.t)
        .filter((example): example is string => Boolean(example))
        .map(stripMarkup);

      return {
        word,
        phonetic: pronunciation,
        phonetics: audio ? [{ audio: buildAudioUrl(audio) }] : [],
        meanings: [
          {
            partOfSpeech: entry.fl ?? 'unknown',
            definitions: (entry.shortdef ?? []).map((definition, index) => ({
              definition: stripMarkup(definition),
              sourceEntryId: entry.meta?.id,
              sourceEntryUuid: entry.meta?.uuid,
              sourceSenseKey: 'shortdef:' + index,
              example: examples[index] ?? examples[0],
              synonyms: [],
              antonyms: [],
            })),
            synonyms: [],
            antonyms: [],
          },
        ],
      };
    });
}

// Fetches a word from Merriam-Webster's Collegiate Dictionary API.
// Merriam-Webster returns either dictionary entries or an array of spelling suggestions.
export function searchWord(word: string): Promise<DictionaryApiEntry[]> {
  const normalised = word.toLowerCase().trim();

  if (!normalised) {
    return Promise.reject(new Error('Word not found: ""'));
  }

  if (!MERRIAM_WEBSTER_API_KEY) {
    return Promise.reject(new Error('Merriam-Webster API key is not configured'));
  }

  const url = `${DICTIONARY_API_BASE_URL}/${encodeURIComponent(normalised)}?key=${encodeURIComponent(MERRIAM_WEBSTER_API_KEY)}`;

  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      let raw = '';

      res.on('data', (chunk: Buffer) => {
        raw += chunk.toString();
      });

      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`Merriam-Webster API returned status ${String(res.statusCode)}`));
          return;
        }

        try {
          const data = JSON.parse(raw) as unknown;

          if (!Array.isArray(data)) {
            reject(new Error('Invalid Merriam-Webster API response'));
            return;
          }

          const entries = data.filter(
            (item): item is MerriamWebsterEntry => typeof item === 'object' && item !== null
          );
          const parsedEntries = toDictionaryEntries(entries);

          if (parsedEntries.length === 0) {
            const suggestions = data.filter((item): item is string => typeof item === 'string');
            const suggestionText = suggestions.length > 0
              ? ` Suggestions: ${suggestions.slice(0, 5).join(', ')}`
              : '';
            reject(new Error(`Word not found: "${word}".${suggestionText}`));
            return;
          }

          resolve(parsedEntries);
        } catch {
          reject(new Error('Failed to parse Merriam-Webster API response'));
        }
      });

      res.on('error', (err: Error) => reject(err));
    });

    req.on('error', (err: Error) => reject(err));
    req.setTimeout(DICTIONARY_API_TIMEOUT_MS, () => {
      req.destroy(new Error('Merriam-Webster API request timed out'));
    });
  });
}

// Creates Term + Definition documents from normalised dictionary entries.
// Idempotent — returns existing documents if the word was previously stored.
export async function parseAndStoreTerm(
  entries: DictionaryApiEntry[],
  miniAppId: string
): Promise<ParsedTerm> {
  const first = entries[0];
  if (!first) throw new Error('No entries in API response');

  const word = first.word.toLowerCase().trim();

  const existing = await Term.findOne({ word, miniAppId });
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

  // Related headwords returned alongside a lookup must not become meanings of the first word.
  for (const entry of entries.filter((e) => e.word.toLowerCase().trim() === word)) {
    for (const meaning of entry.meanings) {
      for (const def of meaning.definitions) {
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
          sourceProvider: 'merriam-webster',
          sourceEntryId: def.sourceEntryId,
          sourceEntryUuid: def.sourceEntryUuid,
          sourceSenseKey: def.sourceSenseKey,
        });
        await definition.save();
        definitionDocs.push(definition);
      }
    }
  }

  return { term, definitions: definitionDocs, isNew: true };
}
