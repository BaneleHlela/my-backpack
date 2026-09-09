// Deterministic PDF -> raw text extraction (Phase 2a of the book-to-course pipeline). This is
// mechanical, exact work — it must never call Claude (see docs/content/book-to-course-design.md
// for the extraction-vs-judgment split this file is one half of; suggestChapterStructure.ts is
// the other, AI-judgment half).
import pdfParse from 'pdf-parse';
import { bucket } from '../../config/gcs';

export async function extractPdfText(gcsPath: string): Promise<string> {
  const [buffer] = await bucket.file(gcsPath).download();
  const data = await pdfParse(buffer);
  return data.text;
}
