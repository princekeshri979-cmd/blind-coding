# BlindCode — Code Without Sight

A live blind-coding event platform for Code Sastra, organized by Optimix X Coding Club, REC Azamgarh. Participants solve a challenge in a completely black Monaco editor; organizers manage rooms and results in a protected dashboard.

## Requirements

- Node.js 22.5 or newer and npm (uses the built-in `node:sqlite` module)
- A persistent local disk for SQLite (or a persistent volume in production)

## Local setup (Windows PowerShell)

```powershell
npm install
Copy-Item .env.example .env
```

Create a bcrypt password hash and a strong JWT signing secret:

```powershell
npm run admin:hash -- "replace-with-a-strong-password"
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Put the generated hash in `ADMIN_PASSWORD_HASH` and the random value in `JWT_SECRET` in `.env`. Set `ADMIN_USERNAME` to the organizer's login name. Keep `.env` private and out of source control.

Start the API and Vite development server:

```powershell
npm run dev
```

Open <http://localhost:5173>. The API listens on port `3001`; Vite proxies `/api` requests to it. Sign in at `/admin/login`, create a room (20 minutes is the default), and activate it before sharing its generated eight-character code.

## Build and run

```powershell
npm run typecheck
npm run build
npm start
```

The production server serves `client/dist` and the API on `PORT` (default `3001`). Configure `NODE_ENV=production`, `JWT_SECRET`, `ADMIN_USERNAME`, and `ADMIN_PASSWORD_HASH` in the deployment environment. Set `DATABASE_PATH` to a writable, persistent file path; the default is `server/data/blindcode.sqlite`. Back up this SQLite database to preserve rooms, participants, submissions, and results.

## Deployment notes

Deploy the Node service behind an HTTPS reverse proxy, route the public site and `/api` to the same origin, and mount durable storage for `DATABASE_PATH`. Set `NODE_ENV=production` so admin cookies are `Secure`; provide secrets through the host's secret manager, not a checked-in `.env`. For multiple application instances, use a shared database/service appropriate to the host rather than separate local SQLite files. Restrict database and backup access to trusted organizers.

## Event workflow

1. In **Admin → Challenges**, review the seeded challenges or add one with a statement, sample input/output, and reference solutions in all four supported languages.
2. In **Admin → Rooms**, select a challenge, choose a timer (1–180 minutes), create the room, and activate it. The code is unique and is not valid for entry until activation.
3. Participants enter the code, their name, and team name, read the instructions, and start their individual timer. Closing a room stops new entries; ending a room prevents further submissions.
4. Participants use the black editor, choose C++, C, Java, or Python, and submit once. A server-side timer also records the latest saved draft as a timeout submission if the participant disconnects after starting.
5. Results reveal the submitted code and a line-level comparison against the selected-language reference. The room leaderboard refreshes every five seconds. Admins can inspect the ranked results and download CSV.

## Security and scoring boundaries

- Admin credentials are checked against a bcrypt hash. Admin API routes use a signed, `httpOnly`, `SameSite=Strict` cookie that expires after eight hours; login attempts are rate limited.
- Challenge reference solutions are only returned by authenticated admin challenge-management routes or to a participant after that participant has submitted. The editor never receives a reference solution before submission.
- Official submission time, timeout status, token-based Levenshtein similarity, and ranking are calculated on the server. Scores retain full precision for ranking; the UI only rounds their display.
- Similarity is a code-correction measure, **not functional correctness**. No submitted code is executed on the application server, and this version does not claim test-case results.
- Participant drafts are saved in the browser and synchronized to the server while a challenge is active so they can survive refreshes and support timeout submission. The participant ID is a random, unguessable capability; avoid sharing result links before revealing them.
- Similarity uses normalized code tokens, excludes comments, and compares only the language used for the submission. Ties are sorted by full-precision score, then elapsed time, then submission time.

## Validation

```powershell
npm test
npm run typecheck
npm run build
```
