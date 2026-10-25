export type Language = "cpp" | "c" | "java" | "python";
export type RoomStatus = "draft" | "active" | "closed" | "ended";

export interface Example {
  input: string;
  output: string;
  explanation?: string;
}

export interface Challenge {
  id: string;
  title: string;
  difficulty: string;
  prompt: string;
  inputFormat: string;
  outputFormat: string;
  examples: Example[];
}

export interface ParticipantSession {
  participantId: string;
  roomCode: string;
  name: string;
  teamName: string;
  challenge: Challenge;
  timeLimitSeconds: number;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  teamName: string;
  score: number;
  durationMs: number;
  status: "manual" | "timeout";
  language: Language;
  submittedAt: number;
}

export interface Room {
  id: string;
  code: string;
  status: RoomStatus;
  time_limit_seconds: number;
  created_at: number;
  challenge_title: string;
  participant_count: number;
  submission_count: number;
}

export interface AdminParticipant {
  id: string;
  name: string;
  team_name: string;
  joined_at: number;
  started_at: number | null;
  submission_status: "manual" | "timeout" | null;
  score: number | null;
  duration_ms: number | null;
  language: Language | null;
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: "Request failed." }));
    throw new Error(typeof body.error === "string" ? body.error : "Request failed.");
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

const participantStorageKey = "blindcode.participant";

export function saveParticipant(participant: ParticipantSession): void {
  localStorage.setItem(participantStorageKey, JSON.stringify(participant));
}

export function loadParticipant(): ParticipantSession | null {
  try {
    const raw = localStorage.getItem(participantStorageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ParticipantSession>;
    return typeof parsed.participantId === "string" && typeof parsed.roomCode === "string" &&
      typeof parsed.name === "string" && typeof parsed.teamName === "string" &&
      parsed.challenge && typeof parsed.timeLimitSeconds === "number"
      ? parsed as ParticipantSession
      : null;
  } catch {
    return null;
  }
}

export function draftKey(participantId: string): string {
  return `blindcode.draft.${participantId}`;
}
