import "dotenv/config";
import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import express, { type NextFunction, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import jwt from "jsonwebtoken";
import { randomBytes, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { db, transaction } from "./db.js";
import { canCompare, SimilarityLimitError, similarityPercent } from "./scoring.js";

type RoomStatus = "draft" | "active" | "closed" | "ended";
type Language = "cpp" | "c" | "java" | "python";
type AdminRequest = Request & { admin?: true };
type ChallengeRow = {
  id: string;
  title: string;
  difficulty: string;
  prompt: string;
  input_format: string;
  output_format: string;
  examples_json: string;
  references_json: string;
};
type ParticipantRow = {
  id: string;
  room_id: string;
  name: string;
  team_name: string;
  joined_at: number;
  started_at: number | null;
  room_code: string;
  room_status: RoomStatus;
  time_limit_seconds: number;
  challenge_id: string;
};

const app = express();
const port = Number(process.env.PORT ?? 3001);
const jwtSecret = process.env.JWT_SECRET ?? "";
const adminUsername = process.env.ADMIN_USERNAME ?? "admin";
const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH ?? "";
const cookieName = "blindcode_admin";

if (jwtSecret.length < 32) {
  throw new Error("JWT_SECRET must be set to a random string of at least 32 characters.");
}
if (!adminPasswordHash) {
  throw new Error("ADMIN_PASSWORD_HASH is required. Generate it with npm run admin:hash.");
}

app.disable("x-powered-by");
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      workerSrc: ["'self'", "blob:"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"],
    },
  },
}));
app.use(express.json({ limit: "256kb" }));
app.use(cookieParser());

function fail(res: Response, status: number, message: string): void {
  res.status(status).json({ error: message });
}

function requireAdmin(req: AdminRequest, res: Response, next: NextFunction): void {
  const token = req.cookies[cookieName] as string | undefined;
  if (!token) {
    fail(res, 401, "Admin sign-in required.");
    return;
  }
  try {
    jwt.verify(token, jwtSecret);
    req.admin = true;
    next();
  } catch {
    res.clearCookie(cookieName, { sameSite: "strict", httpOnly: true, secure: process.env.NODE_ENV === "production" });
    fail(res, 401, "Admin sign-in required.");
  }
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many sign-in attempts. Try again in 15 minutes." },
});

const getChallenge = db.prepare("SELECT * FROM challenges WHERE id = ?");
const getParticipant = db.prepare(`
  SELECT p.*, r.code AS room_code, r.status AS room_status, r.time_limit_seconds, r.challenge_id
  FROM participants p JOIN rooms r ON p.room_id = r.id WHERE p.id = ?
`);
const getSubmission = db.prepare("SELECT * FROM submissions WHERE participant_id = ?");
const publicChallenge = (challenge: ChallengeRow) => ({
  id: challenge.id,
  title: challenge.title,
  difficulty: challenge.difficulty,
  prompt: challenge.prompt,
  inputFormat: challenge.input_format,
  outputFormat: challenge.output_format,
  examples: JSON.parse(challenge.examples_json) as { input: string; output: string; explanation: string }[],
});

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.post("/api/admin/login", loginLimiter, async (req, res) => {
  const username = typeof req.body?.username === "string" ? req.body.username : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  const usernameValid = username.length <= 128 && username === adminUsername;
  const passwordValid = await bcrypt.compare(password, adminPasswordHash);
  if (!usernameValid || !passwordValid) {
    fail(res, 401, "Invalid username or password.");
    return;
  }

  const token = jwt.sign({ sub: "admin" }, jwtSecret, { expiresIn: "8h" });
  res.cookie(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 8 * 60 * 60 * 1000,
    path: "/",
  });
  res.json({ username: adminUsername });
});

app.post("/api/admin/logout", requireAdmin, (_req, res) => {
  res.clearCookie(cookieName, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/" });
  res.status(204).end();
});

app.get("/api/admin/me", requireAdmin, (_req, res) => res.json({ username: adminUsername }));

app.get("/api/admin/challenges", requireAdmin, (_req, res) => {
  const rows = db.prepare("SELECT * FROM challenges ORDER BY created_at DESC").all() as ChallengeRow[];
  res.json(rows.map((challenge) => ({
    ...publicChallenge(challenge),
    references: JSON.parse(challenge.references_json) as Record<Language, string>,
  })));
});

app.post("/api/admin/challenges", requireAdmin, (req, res) => {
  const { title, difficulty, prompt, inputFormat, outputFormat, examples, references } = req.body ?? {};
  if (
    typeof title !== "string" || title.trim().length < 3 || title.trim().length > 100 ||
    typeof prompt !== "string" || prompt.trim().length < 20 || prompt.length > 10000 ||
    typeof inputFormat !== "string" || typeof outputFormat !== "string" ||
    !Array.isArray(examples) || !references || typeof references !== "object"
  ) {
    fail(res, 400, "Challenge details are incomplete or invalid.");
    return;
  }
  const languages: Language[] = ["cpp", "c", "java", "python"];
  const validExamples = examples.length >= 1 && examples.length <= 10 && examples.every((example: unknown) =>
    example && typeof example === "object" &&
    typeof (example as Record<string, unknown>).input === "string" &&
    typeof (example as Record<string, unknown>).output === "string",
  );
  const validReferences = languages.every((language) =>
    typeof (references as Record<string, unknown>)[language] === "string" &&
    ((references as Record<string, string>)[language] as string).trim().length > 0 &&
    ((references as Record<string, string>)[language] as string).length <= 50000,
  );
  if (!validExamples || !validReferences) {
    fail(res, 400, "Provide 1–10 examples and reference code for C++, C, Java, and Python.");
    return;
  }
  if (languages.some((language) => !canCompare(references[language] as string, references[language] as string, language))) {
    fail(res, 400, "A reference solution contains too many tokens to score safely.");
    return;
  }

  const id = randomUUID();
  db.prepare(`
    INSERT INTO challenges (id,title,difficulty,prompt,input_format,output_format,examples_json,references_json,created_at)
    VALUES (?,?,?,?,?,?,?,?,?)
  `).run(id, title.trim(), ["Easy", "Medium", "Hard"].includes(difficulty) ? difficulty : "Easy",
    prompt.trim(), String(inputFormat).slice(0, 2000), String(outputFormat).slice(0, 2000),
    JSON.stringify(examples), JSON.stringify(references), Date.now());
  res.status(201).json({ id, title: title.trim() });
});

app.get("/api/admin/rooms", requireAdmin, (_req, res) => {
  const rooms = db.prepare(`
    SELECT r.id, r.code, r.status, r.time_limit_seconds, r.created_at, c.title AS challenge_title,
      COUNT(DISTINCT p.id) AS participant_count, COUNT(DISTINCT s.id) AS submission_count
    FROM rooms r JOIN challenges c ON c.id = r.challenge_id
    LEFT JOIN participants p ON p.room_id = r.id
    LEFT JOIN submissions s ON s.participant_id = p.id
    GROUP BY r.id ORDER BY r.created_at DESC
  `).all();
  res.json(rooms);
});

app.post("/api/admin/rooms", requireAdmin, (req, res) => {
  const challengeId = typeof req.body?.challengeId === "string" ? req.body.challengeId : "";
  const durationMinutes = Number(req.body?.durationMinutes ?? 20);
  const challenge = getChallenge.get(challengeId);
  if (!challenge) {
    fail(res, 400, "Select a valid challenge.");
    return;
  }
  if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 180) {
    fail(res, 400, "Timer must be between 1 and 180 minutes.");
    return;
  }

  let code = "";
  for (let attempt = 0; attempt < 5; attempt++) {
    code = randomBytes(4).toString("hex").toUpperCase();
    if (!db.prepare("SELECT 1 FROM rooms WHERE code = ?").get(code)) break;
    code = "";
  }
  if (!code) {
    fail(res, 500, "Could not generate a unique room code.");
    return;
  }
  const id = randomUUID();
  db.prepare("INSERT INTO rooms (id,code,challenge_id,status,time_limit_seconds,created_at) VALUES (?,?,?,'draft',?,?)")
    .run(id, code, challengeId, durationMinutes * 60, Date.now());
  res.status(201).json({ id, code, status: "draft", challengeTitle: (challenge as ChallengeRow).title });
});

app.patch("/api/admin/rooms/:id/status", requireAdmin, (req, res) => {
  const nextStatus = req.body?.status as RoomStatus;
  const room = db.prepare("SELECT status FROM rooms WHERE id = ?").get(req.params.id) as { status: RoomStatus } | undefined;
  if (!room) {
    fail(res, 404, "Room not found.");
    return;
  }
  const allowed: Record<RoomStatus, RoomStatus[]> = {
    draft: ["active"],
    active: ["closed", "ended"],
    closed: ["active", "ended"],
    ended: [],
  };
  if (!(nextStatus in allowed) || !allowed[room.status].includes(nextStatus)) {
    fail(res, 400, `Room cannot move from ${room.status} to ${String(nextStatus)}.`);
    return;
  }
  db.prepare("UPDATE rooms SET status = ? WHERE id = ?").run(nextStatus, req.params.id);
  res.json({ status: nextStatus });
});

app.get("/api/admin/rooms/:id/results", requireAdmin, (req, res) => {
  const room = db.prepare("SELECT id FROM rooms WHERE id = ?").get(req.params.id) as { id: string } | undefined;
  if (!room) {
    fail(res, 404, "Room not found.");
    return;
  }
  const submissions = db.prepare(`
    SELECT p.name, p.team_name, s.code, s.score, s.duration_ms, s.status, s.language, s.submitted_at
    FROM participants p JOIN submissions s ON s.participant_id = p.id
    WHERE p.room_id = ?
    ORDER BY s.score DESC, s.duration_ms ASC, s.submitted_at ASC
  `).all(room.id) as {
    name: string; team_name: string; code: string; score: number; duration_ms: number; status: string; language: Language; submitted_at: number;
  }[];
  res.json(submissions.map((submission, index) => ({
    rank: index + 1,
    name: submission.name,
    teamName: submission.team_name,
    code: submission.code,
    score: submission.score,
    durationMs: submission.duration_ms,
    status: submission.status,
    language: submission.language,
    submittedAt: submission.submitted_at,
  })));
});

app.get("/api/admin/rooms/:id/participants", requireAdmin, (req, res) => {
  const room = db.prepare("SELECT id FROM rooms WHERE id = ?").get(req.params.id) as { id: string } | undefined;
  if (!room) {
    fail(res, 404, "Room not found.");
    return;
  }
  const participants = db.prepare(`
    SELECT p.id, p.name, p.team_name, p.joined_at, p.started_at,
      s.status AS submission_status, s.score, s.duration_ms, s.language
    FROM participants p LEFT JOIN submissions s ON s.participant_id = p.id
    WHERE p.room_id = ? ORDER BY p.joined_at ASC
  `).all(room.id);
  res.json(participants);
});

function csvCell(value: string | number): string {
  const safe = String(value).replace(/^[\s]*[=+\-@]/, (prefix) => `${prefix[0]}'${prefix.slice(1)}`);
  return `"${safe.replaceAll('"', '""')}"`;
}

app.get("/api/admin/rooms/:id/export.csv", requireAdmin, (req, res) => {
  const room = db.prepare("SELECT code FROM rooms WHERE id = ?").get(req.params.id) as { code: string } | undefined;
  if (!room) {
    fail(res, 404, "Room not found.");
    return;
  }
  const results = getLeaderboardByCode(room.code);
  const rows = [
    ["Rank", "Participant", "Team", "Correction percentage", "Completion time (seconds)", "Status", "Language", "Submitted at"],
    ...results.map((result) => [
      result.rank, result.name, result.teamName, result.score, (result.durationMs / 1000).toFixed(3),
      result.status, result.language, new Date(result.submittedAt).toISOString(),
    ]),
  ];
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="blindcode-${room.code}.csv"`);
  res.send(`\uFEFF${csv}`);
});

app.post("/api/rooms/join", (req, res) => {
  const code = typeof req.body?.code === "string" ? req.body.code.trim().toUpperCase() : "";
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const teamName = typeof req.body?.teamName === "string" ? req.body.teamName.trim() : "";
  if (!/^[A-F0-9]{8}$/.test(code)) {
    fail(res, 400, "Enter an 8-character room code.");
    return;
  }
  if (name.length < 1 || name.length > 80 || teamName.length < 1 || teamName.length > 80) {
    fail(res, 400, "Participant and team names must be between 1 and 80 characters.");
    return;
  }
  const room = db.prepare(`
    SELECT r.id AS room_id, r.status, r.time_limit_seconds, r.challenge_id,
      c.id, c.title, c.difficulty, c.prompt, c.input_format, c.output_format, c.examples_json, c.references_json
    FROM rooms r JOIN challenges c ON c.id = r.challenge_id WHERE r.code = ?
  `).get(code) as (ChallengeRow & { room_id: string; challenge_id: string; status: RoomStatus; time_limit_seconds: number }) | undefined;
  if (!room || room.status !== "active") {
    fail(res, 404, "That room code is invalid or the room is not accepting participants.");
    return;
  }
  const id = randomUUID();
  db.prepare("INSERT INTO participants (id,room_id,name,team_name,joined_at) VALUES (?,?,?,?,?)")
    .run(id, room.room_id, name, teamName, Date.now());
  res.status(201).json({
    participantId: id,
    roomCode: code,
    challenge: publicChallenge(room),
    timeLimitSeconds: room.time_limit_seconds,
  });
});

app.post("/api/participants/:id/start", (req, res) => {
  const participant = getParticipant.get(req.params.id) as ParticipantRow | undefined;
  if (!participant) {
    fail(res, 404, "Participant not found.");
    return;
  }
  if (participant.room_status === "ended") {
    fail(res, 403, "This room no longer accepts challenge starts.");
    return;
  }
  if (getSubmission.get(participant.id)) {
    fail(res, 409, "This challenge has already been submitted.");
    return;
  }

  const now = Date.now();
  db.prepare("UPDATE participants SET started_at = ? WHERE id = ? AND started_at IS NULL")
    .run(now, participant.id);
  const started = getParticipant.get(participant.id) as ParticipantRow;
  const challenge = getChallenge.get(started.challenge_id) as ChallengeRow;
  res.json({
    startedAt: started.started_at,
    expiresAt: (started.started_at as number) + started.time_limit_seconds * 1000,
    challenge: publicChallenge(challenge),
  });
});

app.put("/api/participants/:id/draft", (req, res) => {
  const participant = getParticipant.get(req.params.id) as ParticipantRow | undefined;
  if (!participant) {
    fail(res, 404, "Participant not found.");
    return;
  }
  if (!participant.started_at || participant.room_status === "ended" || getSubmission.get(participant.id)) {
    fail(res, 409, "This challenge no longer accepts draft changes.");
    return;
  }
  const language = req.body?.language as Language;
  const code = typeof req.body?.code === "string" ? req.body.code : "";
  if (!["cpp", "c", "java", "python"].includes(language) || code.length > 100000) {
    fail(res, 400, "Choose a supported language and keep the draft under 100,000 characters.");
    return;
  }
  if (Date.now() >= participant.started_at + participant.time_limit_seconds * 1000) {
    fail(res, 409, "The timer has expired; the latest saved draft will be submitted.");
    return;
  }
  const challenge = getChallenge.get(participant.challenge_id) as ChallengeRow;
  const references = JSON.parse(challenge.references_json) as Record<Language, string>;
  if (!canCompare(code, references[language], language)) {
    fail(res, 413, "The code is too large to compare safely. Reduce the number of tokens and try again.");
    return;
  }
  db.prepare(`
    INSERT INTO participant_drafts (participant_id,code,language,updated_at) VALUES (?,?,?,?)
    ON CONFLICT(participant_id) DO UPDATE SET code=excluded.code,language=excluded.language,updated_at=excluded.updated_at
  `).run(participant.id, code, language, Date.now());
  res.status(204).end();
});

app.post("/api/participants/:id/submit", (req, res) => {
  const participant = getParticipant.get(req.params.id) as ParticipantRow | undefined;
  if (!participant) {
    fail(res, 404, "Participant not found.");
    return;
  }
  const existing = getSubmission.get(participant.id) as SubmissionRow | undefined;
  if (existing) {
    fail(res, 409, "A submission has already been recorded.");
    return;
  }
  if (!participant.started_at) {
    fail(res, 409, "Start the challenge before submitting.");
    return;
  }
  if (participant.room_status === "ended") {
    fail(res, 403, "This room has ended.");
    return;
  }
  const language = req.body?.language as Language;
  const code = typeof req.body?.code === "string" ? req.body.code : "";
  if (!["cpp", "c", "java", "python"].includes(language) || code.length > 100000) {
    fail(res, 400, "Choose a supported language and submit code under 100,000 characters.");
    return;
  }

  const now = Date.now();
  const deadline = participant.started_at + participant.time_limit_seconds * 1000;
  const status = now >= deadline ? "timeout" : "manual";
  const durationMs = status === "timeout" ? participant.time_limit_seconds * 1000 : Math.max(0, now - participant.started_at);
  const challenge = getChallenge.get(participant.challenge_id) as ChallengeRow;
  const references = JSON.parse(challenge.references_json) as Record<Language, string>;
  if (!canCompare(code, references[language], language)) {
    fail(res, 413, "The code is too large to compare safely. Reduce the number of tokens and try again.");
    return;
  }
  let score: number;
  try {
    score = similarityPercent(code, references[language], language);
  } catch (error) {
    if (error instanceof SimilarityLimitError) {
      fail(res, 413, error.message);
      return;
    }
    throw error;
  }
  const id = randomUUID();
  const inserted = db.prepare("INSERT OR IGNORE INTO submissions (id,participant_id,code,language,score,submitted_at,duration_ms,status) VALUES (?,?,?,?,?,?,?,?)")
    .run(id, participant.id, code, language, score, now, durationMs, status);
  if (Number(inserted.changes) === 0) {
    fail(res, 409, "A submission has already been recorded.");
    return;
  }
  db.prepare("DELETE FROM participant_drafts WHERE participant_id = ?").run(participant.id);
  res.status(201).json({ submissionId: id });
});

type SubmissionRow = {
  id: string;
  participant_id: string;
  code: string;
  language: Language;
  score: number;
  submitted_at: number;
  duration_ms: number;
  status: "manual" | "timeout";
};

app.get("/api/participants/:id/result", (req, res) => {
  const participant = getParticipant.get(req.params.id) as ParticipantRow | undefined;
  const submission = getSubmission.get(req.params.id) as SubmissionRow | undefined;
  if (!participant || !submission) {
    fail(res, 404, "Submission results are not available.");
    return;
  }
  const challenge = getChallenge.get(participant.challenge_id) as ChallengeRow;
  const references = JSON.parse(challenge.references_json) as Record<Language, string>;
  res.json({
    participant: { name: participant.name, teamName: participant.team_name },
    roomCode: participant.room_code,
    challenge: { id: challenge.id, title: challenge.title },
    submission: {
      code: submission.code,
      language: submission.language,
      score: submission.score,
      submittedAt: submission.submitted_at,
      durationMs: submission.duration_ms,
      status: submission.status,
    },
    referenceCode: references[submission.language],
  });
});

function getLeaderboardByCode(code: string) {
  const room = db.prepare("SELECT id FROM rooms WHERE code = ?").get(code) as { id: string } | undefined;
  if (!room) return [];
  const rows = db.prepare(`
    SELECT p.name, p.team_name, s.score, s.duration_ms, s.status, s.language, s.submitted_at
    FROM participants p JOIN submissions s ON s.participant_id = p.id
    WHERE p.room_id = ?
    ORDER BY s.score DESC, s.duration_ms ASC, s.submitted_at ASC
  `).all(room.id) as {
    name: string; team_name: string; score: number; duration_ms: number; status: string; language: Language; submitted_at: number;
  }[];
  return rows.map((row, index) => ({
    rank: index + 1,
    name: row.name,
    teamName: row.team_name,
    score: row.score,
    durationMs: row.duration_ms,
    status: row.status,
    language: row.language,
    submittedAt: row.submitted_at,
  }));
}

const submitExpiredParticipants = db.prepare(`
  SELECT p.id AS participant_id, p.started_at, r.time_limit_seconds, r.challenge_id,
    d.code, d.language, c.references_json
  FROM participants p
  JOIN rooms r ON r.id = p.room_id
  JOIN challenges c ON c.id = r.challenge_id
  LEFT JOIN participant_drafts d ON d.participant_id = p.id
  LEFT JOIN submissions s ON s.participant_id = p.id
  WHERE p.started_at IS NOT NULL AND r.status != 'ended' AND s.id IS NULL
    AND p.started_at + r.time_limit_seconds * 1000 <= ?
`);
setInterval(() => {
  try {
    const now = Date.now();
    const expired = submitExpiredParticipants.all(now) as {
      participant_id: string; started_at: number; time_limit_seconds: number; challenge_id: string;
      code: string | null; language: Language | null; references_json: string;
    }[];
    const insertExpired = db.prepare(`
      INSERT OR IGNORE INTO submissions (id,participant_id,code,language,score,submitted_at,duration_ms,status)
      VALUES (?,?,?,?,?,?,?,'timeout')
    `);
    const recordExpired = transaction(() => {
      for (const participant of expired) {
        const language = participant.language ?? "cpp";
        const code = participant.code ?? "";
        const references = JSON.parse(participant.references_json) as Record<Language, string>;
        insertExpired.run(
          randomUUID(), participant.participant_id, code, language,
          similarityPercent(code, references[language], language),
          participant.started_at + participant.time_limit_seconds * 1000,
          participant.time_limit_seconds * 1000,
        );
        db.prepare("DELETE FROM participant_drafts WHERE participant_id = ?").run(participant.participant_id);
      }
    });
    if (expired.length > 0) recordExpired();
  } catch (error) {
    console.error("Could not auto-submit expired participant drafts:", error);
  }
}, 1000);

app.get("/api/rooms/:code/leaderboard", (req, res) => {
  const code = req.params.code.toUpperCase();
  const room = db.prepare("SELECT code,status FROM rooms WHERE code = ?").get(code) as { code: string; status: RoomStatus } | undefined;
  if (!room) {
    fail(res, 404, "Room not found.");
    return;
  }
  res.json({ roomCode: room.code, status: room.status, entries: getLeaderboardByCode(code) });
});

const clientDist = join(process.cwd(), "client", "dist");
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (_req, res, next) => {
    if (_req.path.startsWith("/api/")) {
      next();
      return;
    }
    res.sendFile(join(clientDist, "index.html"));
  });
}

app.use((_req, res) => fail(res, 404, "Not found."));
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled request error:", error);
  fail(res, 500, "An unexpected server error occurred.");
});

app.listen(port, () => {
  console.log(`BlindCode API listening on http://localhost:${port}`);
});
