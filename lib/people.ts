import type { ReceiptEvidence } from "./contracts";

export type CandidateProfile = {
  id: string;
  name: string;
  resume: { name: string; skills: string[] } | null;
  visible: boolean;
  createdAt: string;
};

export type CandidateSearchResult = {
  candidate: CandidateProfile;
  topScore: number;
  assessments: number;
  testedSkills: string[];
  latestAt: string;
  examplesOnly: boolean;
};

export type CandidateReport = {
  candidate: CandidateProfile;
  reports: ReceiptEvidence[];
};
