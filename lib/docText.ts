// Läser ut ren text ur en uppladdad PDF, Word-fil (.docx) eller textfil.
// Används av genereringen (kundens material från onboarding) och av
// chattredigerarens bilagor. Returnerar tom sträng om inget går att läsa.
export const TEXT_DOC_TYPES = ["text/plain", "text/markdown"];

export async function extractDocumentText(buf: Buffer, mimeType: string, fileName = ""): Promise<string> {
  if (mimeType === "application/pdf") {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(buf));
    const result = await extractText(pdf, { mergePages: true });
    return (Array.isArray(result.text) ? result.text.join("\n") : result.text).trim();
  }
  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const mammoth = await import("mammoth");
    return (await mammoth.extractRawText({ buffer: buf })).value.trim();
  }
  if (TEXT_DOC_TYPES.includes(mimeType) || /\.(txt|md)$/i.test(fileName)) {
    return buf.toString("utf8").trim();
  }
  throw new Error("unsupported");
}
