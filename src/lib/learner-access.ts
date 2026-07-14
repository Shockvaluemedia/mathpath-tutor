import { createHmac, randomInt } from "node:crypto";
import { getAuthSecret } from "./auth";
import type { DevelopmentalStage } from "./types";

const ACCESS_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ACCESS_CODE_LENGTH = 10;
const ACCESS_CODE_HASH_CONTEXT = "mathpath:learner-access:v1:";

export const LEARNER_ACCESS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface LearnerAccessCredentialRecord {
  id: string;
  learnerId: string;
  codeHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  learner: {
    id: string;
    name: string;
    grade: number;
    developmentalStage: DevelopmentalStage;
  };
}

export type LearnerAccessCredentialLookup = (
  codeHash: string
) => Promise<LearnerAccessCredentialRecord | null>;

export function generateLearnerAccessCode(): string {
  const characters = Array.from(
    { length: ACCESS_CODE_LENGTH },
    () => ACCESS_CODE_ALPHABET[randomInt(ACCESS_CODE_ALPHABET.length)]
  ).join("");

  return `${characters.slice(0, 5)}-${characters.slice(5)}`;
}

export function normalizeLearnerAccessCode(code: unknown): string | null {
  if (typeof code !== "string") return null;

  const normalized = code.trim().toUpperCase().replace(/[\s-]/g, "");
  if (normalized.length !== ACCESS_CODE_LENGTH) return null;

  return Array.from(normalized).every((character) =>
    ACCESS_CODE_ALPHABET.includes(character)
  )
    ? normalized
    : null;
}

export function hashLearnerAccessCode(
  code: string,
  secret: string = getAuthSecret()
): string {
  const normalized = normalizeLearnerAccessCode(code);
  if (!normalized) throw new Error("Invalid learner access code format");

  return createHmac("sha256", secret)
    .update(`${ACCESS_CODE_HASH_CONTEXT}${normalized}`)
    .digest("hex");
}

export function learnerAccessExpiresAt(now: Date = new Date()): Date {
  return new Date(now.getTime() + LEARNER_ACCESS_TTL_MS);
}

export function isLearnerAccessCredentialActive(
  credential: LearnerAccessCredentialRecord,
  now: Date = new Date()
): boolean {
  return credential.revokedAt === null && credential.expiresAt.getTime() > now.getTime();
}

function learnerNameMatches(studentName: string | undefined, learnerName: string): boolean {
  if (studentName === undefined) return true;

  const normalize = (name: string) => name.trim().replace(/\s+/g, " ").toLowerCase();
  return normalize(studentName) === normalize(learnerName);
}

export async function authenticateLearnerAccess({
  code,
  studentName,
  lookup,
  now = new Date(),
  secret = getAuthSecret(),
}: {
  code: unknown;
  studentName?: string;
  lookup: LearnerAccessCredentialLookup;
  now?: Date;
  secret?: string;
}): Promise<LearnerAccessCredentialRecord | null> {
  const normalized = normalizeLearnerAccessCode(code);
  if (!normalized) return null;

  const credential = await lookup(hashLearnerAccessCode(normalized, secret));
  if (
    !credential ||
    !isLearnerAccessCredentialActive(credential, now) ||
    !learnerNameMatches(studentName, credential.learner.name)
  ) {
    return null;
  }

  return credential;
}

export function learnerGradeBand(stage: DevelopmentalStage): string {
  if (stage === "EARLY_CHILDHOOD") return "EARLY_ELEMENTARY";
  if (stage === "MIDDLE") return "MIDDLE_SCHOOL";
  return stage;
}

export function learnerSessionEmail(learnerId: string): string {
  return `learner-${learnerId}@session.mathpath.invalid`;
}
