// Shared JSON-array extraction for the book-ingestion AI calls (chapterStructure.ts,
// chapterQuestions.ts). Both prompts put a large excerpt of book/chapter text at the very end
// of the prompt, immediately before generation — on a long or content-dense excerpt (a
// textbook's own worked examples and end-of-chapter question sets are a real, observed
// trigger), the model can drift into continuing the excerpt's own pattern (e.g. "answering" a
// quiz it just read) instead of following the instructions given earlier in the prompt. This is
// a known long-context "lost in the middle" failure mode, not a one-off — both callers now also
// repeat the strict output-format instruction immediately after the excerpt (recency-anchored,
// so the last thing the model reads before generating is the instruction, not the book's own
// content). This function is the second line of defense: if the model still prefaces the JSON
// with prose despite that, fall back to slicing out the first '[' ... last ']' substring and
// parsing that instead of failing outright.
export function cleanAndParseJsonArray(rawText: string, context: string): unknown[] {
  const stripped = rawText
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim();

  const tryParse = (text: string): unknown[] | null => {
    try {
      const parsed: unknown = JSON.parse(text);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  };

  const direct = tryParse(stripped);
  if (direct) return direct;

  const start = stripped.indexOf('[');
  const end = stripped.lastIndexOf(']');
  if (start !== -1 && end !== -1 && end > start) {
    const bracketed = tryParse(stripped.slice(start, end + 1));
    if (bracketed) return bracketed;
  }

  throw new Error(`AI returned invalid JSON for ${context}: ${rawText.substring(0, 200)}`);
}
