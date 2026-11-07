import { InputError } from "./validation";

export const RESUME_LIMIT = 2 * 1024 * 1024;
export const RESUME_SKILLS = ["SQL", "Python", "Excel", "Power BI", "Tableau", "Spark", "Airflow", "dbt", "ETL", "Data modeling", "PostgreSQL", "AWS"] as const;
export function detectResumeSkills(text: string): string[] {
  return RESUME_SKILLS.filter((skill) => new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text));
}

export async function readResumeBytes(request: Request): Promise<Uint8Array> {
  if (!request.body) throw new InputError("Choose a résumé file first.");
  const reader = request.body.getReader();
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > RESUME_LIMIT) throw new InputError("Please choose a résumé smaller than 2 MB.");
      chunks.push(value);
    }
    if (!size) throw new InputError("This file is empty. Choose a PDF, DOCX or TXT résumé.");
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return bytes;
  } finally { void reader.cancel().catch(() => {}); reader.releaseLock(); }
}

export async function resumeContext(name: string, bytes: Uint8Array): Promise<{ name: string; skills: string[] }> {
  if (name.length > 160 || !/\.(pdf|docx|txt)$/i.test(name)) throw new InputError("Choose a PDF, DOCX or TXT résumé, up to 2 MB.");
  if (!bytes.length || bytes.length > RESUME_LIMIT) throw new InputError("Choose a nonempty résumé smaller than 2 MB.");
  let text = "";
  try {
    if (/\.txt$/i.test(name)) text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    else if (/\.docx$/i.test(name)) {
      if (bytes[0] !== 80 || bytes[1] !== 75) throw new Error();
      const mammoth = await import("mammoth");
      text = (await mammoth.extractRawText({ buffer: Buffer.from(bytes) })).value;
    } else {
      if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") throw new Error();
      const { getDocumentProxy } = await import("unpdf");
      const document = await getDocumentProxy(bytes, { isEvalSupported: false, useSystemFonts: true, disableFontFace: true });
      try {
        if (document.numPages > 10) throw new InputError("Use a résumé with at most 10 pages.");
        for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
          const page = await document.getPage(pageNumber);
          const content = await page.getTextContent();
          text += content.items.map((item) => "str" in item ? item.str : "").join(" ") + "\n";
          if (text.length > 100_000) throw new InputError("Use a shorter résumé with less than 100,000 characters.");
        }
      } finally { await document.destroy(); }
    }
  } catch (error) {
    if (error instanceof InputError) throw error;
    throw new InputError("We couldn’t read this résumé. Try a text-based PDF, DOCX or UTF-8 TXT file.");
  }
  if (!text.trim() || text.length > 100_000) throw new InputError("Use a readable text-based résumé. Scanned-image PDFs are not supported yet.");
  // Return keywords only. Never return or persist the résumé text.
  return { name, skills: detectResumeSkills(text) };
}
