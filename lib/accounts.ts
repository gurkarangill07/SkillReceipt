export type AccountRole = "candidate" | "employer";
export type PublicAccount = {
  id: string; candidateId: string; name: string; email: string; role: AccountRole;
  visible: boolean; resume: { name: string; skills: string[]; uploadedAt: string } | null;
};
