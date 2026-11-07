import "server-only";
import { PRIVATE_HEADERS, unavailable } from "./http";
import { getAccounts } from "./accounts";
export async function downloadResume(token: string | undefined, candidateId?: string) {
  const file = await getAccounts().resume(token, candidateId);
  if (!file) return unavailable();
  const extension = file.metadata.name.split(".").pop()!.toLowerCase();
  const type = extension === "pdf" ? "application/pdf" : extension === "docx" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "text/plain; charset=utf-8";
  return new Response(new Uint8Array(file.bytes), { headers: { ...PRIVATE_HEADERS, "Content-Type": type, "X-Content-Type-Options": "nosniff", "Content-Disposition": `attachment; filename="resume.${extension}"; filename*=UTF-8''${encodeURIComponent(file.metadata.name)}` } });
}
