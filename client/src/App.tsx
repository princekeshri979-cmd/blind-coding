import { diffLines } from "diff";
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Braces, Check,
  Clock3, Download, EyeOff, FileCode2, Flag, LockKeyhole, LogOut, Play,
  RefreshCw, ShieldCheck, Sparkles, Trophy, Users, X,
} from "lucide-react";
import { FormEvent, Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, Outlet, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { api, draftKey, type AdminParticipant, type Challenge, type Language, loadParticipant, type LeaderboardEntry, type ParticipantSession, type Room, saveParticipant } from "./api";

const languages: { id: Language; label: string }[] = [
  { id: "cpp", label: "C++" },
  { id: "c", label: "C" },
  { id: "java", label: "Java" },
  { id: "python", label: "Python" },
];

const BlindMonaco = lazy(() => import("./BlindMonaco"));

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="inline-flex items-center gap-3" aria-label="BlindCode home">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-electric/30 bg-electric/10 text-electric"><EyeOff size={19} /></span>
      {!compact && <span className="leading-tight"><span className="block text-[15px] font-bold tracking-tight">blind<span className="text-electric">code</span></span><span className="block font-mono text-[9px] tracking-[.18em] text-slate-500">CODE WITHOUT SIGHT</span></span>}
    </Link>
  );
}

function Header() {
  return (
    <header className="relative z-20 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
      <Logo />
      <nav className="flex items-center gap-3 text-sm">
        <Link to="/instructions" className="hidden text-slate-400 transition hover:text-white sm:block">How it works</Link>
        <Link to="/admin/login" className="btn-secondary !rounded-full !px-4 !py-2 text-xs"><LockKeyhole size={13} /> Admin</Link>
      </nav>
    </header>
  );
}

function Footer() {
  return (
    <footer className="mx-auto flex max-w-7xl flex-col justify-between gap-2 border-t border-stroke px-5 py-6 text-xs text-slate-500 sm:flex-row sm:px-8">
      <span>Code Sastra · Optimix X Coding Club · REC Azamgarh</span>
      <span className="font-mono">THINK IN CODE. TRUST YOUR INSTINCT.</span>
    </footer>
  );
}

function Notice({ children, tone = "error" }: { children: string; tone?: "error" | "success" }) {
  return <div role="alert" className={`rounded-lg border px-3 py-2.5 text-sm ${tone === "error" ? "border-red-500/25 bg-red-950/30 text-red-300" : "border-neon/20 bg-neon/5 text-neon"}`}>{children}</div>;
}

function JoinRoom() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [teamName, setTeamName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await api<Omit<ParticipantSession, "name" | "teamName">>("/rooms/join", {
        method: "POST",
        body: JSON.stringify({ code, name, teamName }),
      });
      saveParticipant({ ...result, name: name.trim(), teamName: teamName.trim() });
      navigate("/instructions");
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Could not join this room.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid-bg relative">
      <Header />
      <section className="mx-auto grid min-h-[690px] max-w-7xl items-center gap-12 px-5 pb-16 pt-10 sm:px-8 lg:grid-cols-[1.2fr_.8fr] lg:gap-20 lg:pb-24">
        <div className="relative z-10">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-neon/20 bg-neon/[.06] px-3 py-1.5 text-xs text-neon"><span className="h-1.5 w-1.5 rounded-full bg-neon shadow-[0_0_12px_#a4f576]" /> A different kind of coding challenge</div>
          <h1 className="max-w-3xl text-5xl font-bold leading-[1.04] tracking-[-.055em] sm:text-7xl">Your code.<br />Your <span className="text-electric">instincts.</span></h1>
          <p className="mt-7 max-w-xl text-base leading-7 text-slate-400 sm:text-lg">Can you code without seeing a single character? Step into the dark, trust your muscle memory, and let your logic lead the way.</p>
          <div className="mt-9 flex flex-wrap gap-5 text-xs text-slate-400">
            <span className="inline-flex items-center gap-2"><Clock3 size={15} className="text-electric" /> 20 min challenge</span>
            <span className="inline-flex items-center gap-2"><Braces size={15} className="text-electric" /> 4 languages</span>
            <span className="inline-flex items-center gap-2"><Trophy size={15} className="text-electric" /> Live leaderboard</span>
          </div>
          <div className="mt-12 grid max-w-xl grid-cols-3 gap-4 border-t border-stroke pt-6">
            <div><p className="font-mono text-2xl font-medium text-white">01</p><p className="mt-1 text-xs text-slate-500">No peeking</p></div>
            <div><p className="font-mono text-2xl font-medium text-white">02</p><p className="mt-1 text-xs text-slate-500">Pure instinct</p></div>
            <div><p className="font-mono text-2xl font-medium text-white">03</p><p className="mt-1 text-xs text-slate-500">One shot</p></div>
          </div>
        </div>

        <div className="panel relative mx-auto w-full max-w-md p-6 sm:p-8">
          <div className="absolute -right-4 -top-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-electric/20 bg-panel text-electric shadow-xl"><ArrowDown size={19} /></div>
          <div className="mb-7">
            <p className="font-mono text-[10px] tracking-[.2em] text-electric">PARTICIPANT ACCESS</p>
            <h2 className="mt-2 text-2xl font-semibold">Enter the arena</h2>
            <p className="mt-2 text-sm text-slate-400">Your host will share the room access code.</p>
          </div>
          <form onSubmit={submit} className="space-y-5">
            <label className="block"><span className="label">Room access code</span><input className="field font-mono uppercase tracking-[.2em]" maxLength={8} autoComplete="off" placeholder="e.g. A1B2C3D4" value={code} onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-F0-9]/g, ""))} required /></label>
            <label className="block"><span className="label">Your name</span><input className="field" maxLength={80} autoComplete="name" placeholder="How should we call you?" value={name} onChange={(event) => setName(event.target.value)} required /></label>
            <label className="block"><span className="label">Team name</span><input className="field" maxLength={80} placeholder="Your crew" value={teamName} onChange={(event) => setTeamName(event.target.value)} required /></label>
            {error && <Notice>{error}</Notice>}
            <button disabled={busy} className="btn-primary w-full !py-3.5 disabled:cursor-wait disabled:opacity-60">{busy ? "Checking room…" : "Join room"} <ArrowRight size={16} /></button>
          </form>
          <div className="mt-5 flex items-center justify-center gap-2 text-[11px] text-slate-500"><ShieldCheck size={13} className="text-neon" /> No account or password needed</div>
        </div>
      </section>
      <div className="mx-auto max-w-7xl px-5 pb-12 sm:px-8">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { icon: EyeOff, title: "A true blind challenge", text: "The editor is entirely black. Your keystrokes are the only feedback." },
            { icon: Clock3, title: "Your own clock", text: "Every participant gets their full timer from the moment they start." },
            { icon: Trophy, title: "Precision wins", text: "Ranked by token-level similarity, then the fastest finish." },
          ].map(({ icon: Icon, title, text }) => <div key={title} className="rounded-xl border border-stroke/80 bg-panel/50 p-5"><Icon size={17} className="text-electric" /><h3 className="mt-4 text-sm font-semibold">{title}</h3><p className="mt-2 text-xs leading-5 text-slate-500">{text}</p></div>)}
        </div>
      </div>
      <Footer />
    </main>
  );
}

function Instructions() {
  const navigate = useNavigate();
  const [participant] = useState(loadParticipant);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (!participant) return <Navigate to="/" replace />;
  const participantSession = participant;

  async function begin() {
    setBusy(true);
    setError("");
    try {
      await api(`/participants/${participantSession.participantId}/start`, { method: "POST" });
      navigate("/workspace");
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Could not start the challenge.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10 sm:px-8">
        <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowLeft size={15} /> Back</Link>
        <div className="mb-8">
          <p className="font-mono text-xs tracking-[.18em] text-electric">ROOM {participant.roomCode}</p>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">Before you go blind.</h1>
          <p className="mt-3 text-slate-400">Welcome, {participant.name} of <span className="text-white">{participant.teamName}</span>. Read the brief, then start when you are ready.</p>
        </div>
        <section className="panel p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-stroke pb-6">
            <div><p className="font-mono text-xs tracking-[.16em] text-neon">{participant.challenge.difficulty.toUpperCase()} · CHALLENGE BRIEF</p><h2 className="mt-2 text-2xl font-semibold">{participant.challenge.title}</h2></div>
            <div className="rounded-lg border border-stroke bg-ink px-3 py-2 font-mono text-xs text-slate-300"><Clock3 size={13} className="mr-2 inline text-electric" />{Math.floor(participant.timeLimitSeconds / 60)} minutes</div>
          </div>
          <p className="mt-6 max-w-3xl leading-7 text-slate-300">{participant.challenge.prompt}</p>
          <div className="mt-7 grid gap-5 sm:grid-cols-2">
            <div className="rounded-xl border border-stroke bg-ink/70 p-4"><p className="label">Input format</p><p className="text-sm leading-6 text-slate-400">{participant.challenge.inputFormat}</p></div>
            <div className="rounded-xl border border-stroke bg-ink/70 p-4"><p className="label">Output format</p><p className="text-sm leading-6 text-slate-400">{participant.challenge.outputFormat}</p></div>
          </div>
          <div className="mt-7 space-y-3">
            <p className="label">Examples</p>
            {participant.challenge.examples.map((example, index) => <div key={index} className="grid gap-3 rounded-xl border border-stroke bg-ink/70 p-4 md:grid-cols-[1fr_1fr]">
              <div><p className="mb-2 font-mono text-[10px] tracking-wider text-slate-500">INPUT {index + 1}</p><pre className="whitespace-pre-wrap font-mono text-xs leading-5 text-slate-300">{example.input}</pre></div>
              <div><p className="mb-2 font-mono text-[10px] tracking-wider text-slate-500">EXPECTED OUTPUT</p><pre className="whitespace-pre-wrap font-mono text-xs leading-5 text-neon">{example.output}</pre>{example.explanation && <p className="mt-2 text-xs text-slate-500">{example.explanation}</p>}</div>
            </div>)}
          </div>
        </section>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {[
            ["01", "Choose your language", "C++, C, Java, or Python. You can switch any time."],
            ["02", "Trust your memory", "Your editor will be invisible. There is no code preview or autocomplete."],
            ["03", "One final submission", "Submit once, or let the timer submit your draft automatically."],
          ].map(([n, title, text]) => <div key={n} className="rounded-xl border border-stroke bg-panel/60 p-4"><span className="font-mono text-xs text-electric">{n}</span><h3 className="mt-2 text-sm font-semibold">{title}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{text}</p></div>)}
        </div>
        {error && <div className="mt-5"><Notice>{error}</Notice></div>}
        <div className="mt-7 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <p className="max-w-lg text-xs leading-5 text-slate-500"><ShieldCheck size={14} className="mr-1 inline text-neon" /> Your timer begins only when you press start. Refreshing will not reset it.</p>
          <button onClick={begin} disabled={busy} className="btn-primary min-w-48 disabled:opacity-60">{busy ? "Starting…" : "Start challenge"} <Play size={15} /></button>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function formatDuration(milliseconds: number): string {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function Workspace() {
  const navigate = useNavigate();
  const [participant] = useState(loadParticipant);
  const [started, setStarted] = useState<{ startedAt: number; expiresAt: number } | null>(null);
  const [language, setLanguage] = useState<Language>("cpp");
  const [code, setCode] = useState("");
  const codeRef = useRef("");
  const languageRef = useRef<Language>("cpp");
  const submitting = useRef(false);
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!participant) return;
    const saved = localStorage.getItem(draftKey(participant.participantId) + ".cpp") ?? "";
    setCode(saved);
    codeRef.current = saved;
    api<{ startedAt: number; expiresAt: number }>(`/participants/${participant.participantId}/start`, { method: "POST" })
      .then(setStarted)
      .catch((issue: unknown) => {
        setError(issue instanceof Error ? issue.message : "Could not load the challenge timer.");
      })
      .finally(() => setLoading(false));
  }, [participant?.participantId]);

  useEffect(() => {
    codeRef.current = code;
    if (!participant) return;
    localStorage.setItem(draftKey(participant.participantId) + `.${language}`, code);
    const timeout = window.setTimeout(() => {
      void api<void>(`/participants/${participant.participantId}/draft`, {
        method: "PUT",
        body: JSON.stringify({ code, language }),
      }).catch((issue: unknown) => setError(issue instanceof Error ? issue.message : "Could not save the draft to the server."));
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [code, language, participant]);

  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  const submit = useCallback(async (status: "manual" | "timeout") => {
    if (!participant || submitting.current) return;
    submitting.current = true;
    setError("");
    try {
      await api(`/participants/${participant.participantId}/submit`, {
        method: "POST",
        body: JSON.stringify({ code: codeRef.current, language: languageRef.current, status }),
      });
      languages.forEach((item) => localStorage.removeItem(draftKey(participant.participantId) + `.${item.id}`));
      navigate(`/results/${participant.participantId}`, { replace: true });
    } catch (issue) {
      try {
        await api(`/participants/${participant.participantId}/result`);
        languages.forEach((item) => localStorage.removeItem(draftKey(participant.participantId) + `.${item.id}`));
        navigate(`/results/${participant.participantId}`, { replace: true });
      } catch {
        submitting.current = false;
        setError(issue instanceof Error ? issue.message : "Submission failed. Your draft is still saved.");
      }
    }
  }, [navigate, participant]);

  useEffect(() => {
    if (!started) return;
    const interval = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= started.expiresAt) {
        window.clearInterval(interval);
        void submit("timeout");
      }
    }, 250);
    return () => window.clearInterval(interval);
  }, [started, submit]);

  if (!participant) return <Navigate to="/" replace />;
  if (loading) return <Loading text="Preparing your workspace…" />;
  if (!started) return <div className="mx-auto max-w-xl px-5 py-24"><Notice>{error || "Challenge could not be started."}</Notice><Link className="btn-secondary mt-5" to="/instructions"><ArrowLeft size={14} /> Return to instructions</Link></div>;
  const remaining = Math.max(0, started.expiresAt - now);

  function changeLanguage(next: Language) {
    if (participant) {
      localStorage.setItem(draftKey(participant.participantId) + `.${language}`, codeRef.current);
      const nextCode = localStorage.getItem(draftKey(participant.participantId) + `.${next}`) ?? "";
      setLanguage(next);
      setCode(nextCode);
      codeRef.current = nextCode;
    }
  }

  return (
    <div className="flex h-screen min-h-[560px] flex-col overflow-hidden bg-black">
      <header className="flex h-[62px] shrink-0 items-center justify-between border-b border-[#202020] bg-[#080808] px-4 sm:px-6">
        <div className="flex items-center gap-4"><Logo compact /><span className="hidden h-5 border-l border-[#303030] sm:block" /><span className="hidden text-xs text-neutral-500 sm:block">{participant.challenge.title}</span></div>
        <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 font-mono text-sm ${remaining <= 60000 ? "border-red-500/50 text-red-400 pulse-soft" : "border-neutral-800 text-neutral-300"}`}><Clock3 size={14} />{formatDuration(remaining)}</div>
        <button onClick={() => setShowConfirm(true)} disabled={submitting.current} className="flex items-center gap-2 rounded-lg bg-[#a4f576] px-3 py-2 text-xs font-bold text-black transition hover:bg-[#bdff96] disabled:opacity-50 sm:px-4"><Flag size={14} /> <span className="hidden sm:inline">Submit code</span><span className="sm:hidden">Submit</span></button>
      </header>
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-[#191919] bg-[#050505] px-4 sm:px-6">
        <div className="flex h-full items-center gap-1">{languages.map((item) => <button key={item.id} onClick={() => changeLanguage(item.id)} className={`h-full border-b-2 px-3 text-xs transition ${language === item.id ? "border-electric text-white" : "border-transparent text-neutral-600 hover:text-neutral-300"}`}>{item.label}</button>)}</div>
        <span className="flex items-center gap-2 font-mono text-[10px] tracking-wide text-neutral-600"><span className="h-1.5 w-1.5 rounded-full bg-neon" /> INVISIBLE MODE</span>
      </div>
      <main className="relative min-h-0 flex-1 bg-black" aria-label="Blind coding editor">
        <Suspense fallback={<div className="h-full w-full bg-black" aria-label="Loading editor" />}>
          <BlindMonaco language={language} value={code} onChange={setCode} />
        </Suspense>
        {error && <div className="absolute bottom-5 left-1/2 z-10 w-[min(90%,520px)] -translate-x-1/2"><Notice>{error}</Notice></div>}
        <div className="pointer-events-none absolute bottom-4 right-5 font-mono text-[10px] tracking-wider text-[#151515]">YOUR CODE IS SAFE · DRAFT SAVED LOCALLY</div>
      </main>
      {showConfirm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-5 backdrop-blur-sm" role="dialog" aria-modal="true"><div className="panel w-full max-w-sm p-6"><div className="flex items-start justify-between"><div><p className="font-mono text-[10px] tracking-widest text-electric">FINAL SUBMISSION</p><h2 className="mt-2 text-xl font-semibold">Ready to reveal?</h2></div><button aria-label="Close" onClick={() => setShowConfirm(false)} className="text-slate-500 hover:text-white"><X size={18} /></button></div><p className="mt-3 text-sm leading-6 text-slate-400">Your code will be scored and revealed. You cannot submit again.</p><div className="mt-6 flex justify-end gap-3"><button onClick={() => setShowConfirm(false)} className="btn-secondary">Keep coding</button><button onClick={() => { setShowConfirm(false); void submit("manual"); }} className="btn-primary">Submit once <ArrowRight size={14} /></button></div></div></div>}
    </div>
  );
}

function Loading({ text }: { text: string }) {
  return <div className="flex min-h-screen items-center justify-center gap-3 text-sm text-slate-400"><RefreshCw size={16} className="animate-spin text-electric" />{text}</div>;
}

interface ResultData {
  participant: { name: string; teamName: string };
  roomCode: string;
  challenge: { id: string; title: string };
  submission: { code: string; language: Language; score: number; submittedAt: number; durationMs: number; status: "manual" | "timeout" };
  referenceCode: string;
}

function CodeDiff({ reference, submitted }: { reference: string; submitted: string }) {
  const parts = diffLines(reference, submitted);
  const original: { text: string; changed: boolean }[] = [];
  const actual: { text: string; changed: boolean }[] = [];
  for (const part of parts) {
    const lines = part.value.replace(/\n$/, "").split("\n");
    if (part.added) actual.push(...lines.map((text) => ({ text, changed: true })));
    else if (part.removed) original.push(...lines.map((text) => ({ text, changed: true })));
    else {
      original.push(...lines.map((text) => ({ text, changed: false })));
      actual.push(...lines.map((text) => ({ text, changed: false })));
    }
  }
  const Panel = ({ title, lines, tone }: { title: string; lines: { text: string; changed: boolean }[]; tone: "removed" | "added" }) => (
    <div className="min-w-0 overflow-hidden rounded-xl border border-stroke bg-[#080b0f]">
      <div className="border-b border-stroke px-4 py-3 font-mono text-[10px] tracking-widest text-slate-500">{title}</div>
      <pre className="max-h-[420px] min-h-40 overflow-auto p-4 font-mono text-xs leading-6">{lines.length ? lines.map((line, index) => <span key={index} className={`block whitespace-pre-wrap break-all ${line.changed ? tone === "removed" ? "bg-red-500/10 text-red-300" : "bg-neon/10 text-neon" : "text-slate-400"}`}><span className="mr-3 inline-block w-4 select-none text-right text-slate-700">{line.changed ? tone === "removed" ? "−" : "+" : " "}</span>{line.text || " "}</span>) : <span className="text-slate-600">No code</span>}</pre>
    </div>
  );
  return <div className="grid gap-4 lg:grid-cols-2"><Panel title="REFERENCE SOLUTION" lines={original} tone="removed" /><Panel title="YOUR SUBMISSION" lines={actual} tone="added" /></div>;
}

function Results() {
  const { id = "" } = useParams();
  const [result, setResult] = useState<ResultData | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api<ResultData>(`/participants/${id}/result`).then(setResult).catch((issue: unknown) => setError(issue instanceof Error ? issue.message : "Could not load results."));
  }, [id]);
  if (error) return <div className="mx-auto max-w-xl px-5 py-24"><Notice>{error}</Notice><Link to="/" className="btn-secondary mt-5">Return home</Link></div>;
  if (!result) return <Loading text="Revealing your results…" />;
  const { submission } = result;
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10 sm:px-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
          <div><p className="font-mono text-xs tracking-[.16em] text-electric">SUBMISSION REVEALED · ROOM {result.roomCode}</p><h1 className="mt-3 text-3xl font-bold sm:text-4xl">The moment of truth.</h1><p className="mt-2 text-sm text-slate-400">{result.participant.name} · {result.participant.teamName} · {result.challenge.title}</p></div>
          <Link to={`/leaderboard/${result.roomCode}`} className="btn-secondary">Room leaderboard <Trophy size={15} /></Link>
        </div>
        <section className="mb-6 grid gap-3 sm:grid-cols-3">
          <div className="panel p-5"><p className="label">Code correction</p><p className="font-mono text-4xl font-medium text-neon">{submission.score.toFixed(2)}<span className="text-xl">%</span></p><p className="mt-2 text-xs text-slate-500">Token-based similarity · not functional correctness</p></div>
          <div className="panel p-5"><p className="label">Completion time</p><p className="font-mono text-4xl font-medium text-white">{formatDuration(submission.durationMs)}</p><p className="mt-2 text-xs text-slate-500">{new Date(submission.submittedAt).toLocaleTimeString()}</p></div>
          <div className="panel p-5"><p className="label">Submission</p><p className="mt-1 text-xl font-semibold capitalize text-white">{submission.status === "timeout" ? "Time expired" : "Manual"}</p><p className="mt-2 text-xs text-slate-500">{languages.find((item) => item.id === submission.language)?.label} · one submission recorded</p></div>
        </section>
        <div className="mb-3 flex items-center gap-2 text-sm font-medium"><FileCode2 size={16} className="text-electric" /> Code differences</div>
        <CodeDiff reference={result.referenceCode} submitted={submission.code} />
        <div className="mt-8 flex justify-between gap-4"><Link to="/" className="btn-secondary"><ArrowLeft size={14} /> Home</Link><Link to={`/leaderboard/${result.roomCode}`} className="btn-primary">See your rank <ArrowRight size={15} /></Link></div>
      </main>
      <Footer />
    </div>
  );
}

function Leaderboard() {
  const { code = "" } = useParams();
  const [data, setData] = useState<{ roomCode: string; status: string; entries: LeaderboardEntry[] } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    const load = () => api<{ roomCode: string; status: string; entries: LeaderboardEntry[] }>(`/rooms/${code}/leaderboard`)
      .then((result) => { if (alive) { setData(result); setError(""); } })
      .catch((issue: unknown) => { if (alive) setError(issue instanceof Error ? issue.message : "Could not load leaderboard."); });
    void load();
    const interval = window.setInterval(load, 5000);
    return () => { alive = false; window.clearInterval(interval); };
  }, [code]);
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10 sm:px-8">
        <Link to="/" className="mb-7 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowLeft size={15} /> Home</Link>
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="font-mono text-xs tracking-[.16em] text-electric">ROOM {code.toUpperCase()}</p><h1 className="mt-2 text-3xl font-bold">The leaderboard.</h1><p className="mt-2 text-sm text-slate-400">Ranked by code similarity, then the fastest finish.</p></div><span className="inline-flex items-center gap-2 rounded-full border border-neon/20 px-3 py-1.5 text-xs text-neon"><span className="h-1.5 w-1.5 rounded-full bg-neon pulse-soft" /> Live · refreshes every 5 seconds</span></div>
        {error && <Notice>{error}</Notice>}
        <div className="panel overflow-hidden">
          <div className="grid grid-cols-[48px_1fr_1fr_90px_90px] gap-3 border-b border-stroke px-4 py-3 font-mono text-[9px] tracking-widest text-slate-500 sm:grid-cols-[60px_1.2fr_1fr_140px_130px] sm:px-6 sm:text-[10px]"><span>RANK</span><span>PARTICIPANT</span><span>TEAM</span><span className="text-right">CORRECTION</span><span className="text-right">TIME</span></div>
          {!data ? <div className="p-8 text-center text-sm text-slate-500">Loading room scores…</div> : data.entries.length === 0 ? <div className="p-10 text-center"><Trophy className="mx-auto text-slate-600" size={25} /><p className="mt-3 text-sm text-slate-300">No submissions yet</p><p className="mt-1 text-xs text-slate-500">Scores appear here as soon as a participant submits.</p></div> : data.entries.map((entry) => <div key={`${entry.rank}-${entry.name}-${entry.teamName}`} className="grid grid-cols-[48px_1fr_1fr_90px_90px] items-center gap-3 border-b border-stroke/70 px-4 py-4 last:border-0 sm:grid-cols-[60px_1.2fr_1fr_140px_130px] sm:px-6">
            <span className={`font-mono text-sm ${entry.rank === 1 ? "text-neon" : "text-slate-500"}`}>{String(entry.rank).padStart(2, "0")}</span>
            <span className="truncate text-sm font-medium text-white">{entry.name}</span><span className="truncate text-xs text-slate-400">{entry.teamName}</span>
            <span className="text-right font-mono text-sm text-neon">{entry.score.toFixed(2)}%</span><span className="text-right font-mono text-xs text-slate-400">{formatDuration(entry.durationMs)}</span>
          </div>)}
        </div>
        <p className="mt-4 text-xs leading-5 text-slate-500">Similarity measures token-level code correction only. It does not indicate whether the program passes test cases.</p>
      </main>
      <Footer />
    </div>
  );
}

function AdminLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/admin/login", { method: "POST", body: JSON.stringify({ username, password }) });
      navigate("/admin", { replace: true });
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }
  return <div className="grid-bg flex min-h-screen flex-col"><Header /><main className="flex flex-1 items-center justify-center px-5 py-12"><div className="panel w-full max-w-md p-7 sm:p-9"><div className="mb-7 flex h-12 w-12 items-center justify-center rounded-xl border border-electric/25 bg-electric/10 text-electric"><LockKeyhole size={20} /></div><p className="font-mono text-[10px] tracking-[.2em] text-electric">ORGANIZER ACCESS</p><h1 className="mt-2 text-2xl font-bold">Admin sign in</h1><p className="mt-2 text-sm text-slate-400">Room controls and challenge management.</p><form onSubmit={submit} className="mt-7 space-y-5"><label className="block"><span className="label">Username</span><input className="field" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required /></label><label className="block"><span className="label">Password</span><input className="field" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>{error && <Notice>{error}</Notice>}<button className="btn-primary w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in securely"} <ArrowRight size={15} /></button></form><div className="mt-5 flex items-center gap-2 text-[11px] text-slate-500"><ShieldCheck size={13} className="text-neon" /> Secure, httpOnly session · expires after 8 hours</div></div></main><Footer /></div>;
}

function AdminLayout() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [username, setUsername] = useState("");
  useEffect(() => {
    api<{ username: string }>("/admin/me")
      .then((result) => { setUsername(result.username); setChecking(false); })
      .catch(() => navigate("/admin/login", { replace: true }));
  }, [navigate]);
  async function logout() {
    try { await api("/admin/logout", { method: "POST" }); }
    finally { navigate("/admin/login", { replace: true }); }
  }
  if (checking) return <Loading text="Verifying admin session…" />;
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-stroke bg-[#080b0f] px-5 py-4 sm:px-8">
        <div className="flex items-center gap-5"><Logo /><span className="hidden rounded-md border border-stroke px-2 py-1 font-mono text-[9px] tracking-widest text-slate-500 sm:inline">ADMIN</span></div>
        <nav className="flex items-center gap-2 text-xs"><Link to="/admin" className="btn-secondary !px-3 !py-2">Rooms</Link><Link to="/admin/challenges" className="btn-secondary !px-3 !py-2">Challenges</Link><span className="hidden px-2 text-slate-500 md:inline">{username}</span><button onClick={() => void logout()} aria-label="Sign out" className="btn-secondary !px-3 !py-2"><LogOut size={14} /><span className="hidden sm:inline">Sign out</span></button></nav>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-8 sm:px-8"><Outlet /></main>
      <Footer />
    </div>
  );
}

interface AdminChallenge extends Challenge {
  references: Record<Language, string>;
}

interface AdminSubmission extends LeaderboardEntry {
  code: string;
}

function AdminDashboard() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [challenges, setChallenges] = useState<AdminChallenge[]>([]);
  const [selectedChallengeId, setSelectedChallengeId] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [duration, setDuration] = useState(20);
  const [entries, setEntries] = useState<AdminSubmission[]>([]);
  const [participants, setParticipants] = useState<AdminParticipant[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const [nextRooms, nextChallenges] = await Promise.all([api<Room[]>("/admin/rooms"), api<AdminChallenge[]>("/admin/challenges")]);
    setRooms(nextRooms);
    setChallenges(nextChallenges);
    setSelectedChallengeId((current) => current || nextChallenges[0]?.id || "");
    setSelectedRoomId((current) => current || nextRooms[0]?.id || "");
  }, []);
  useEffect(() => { void refresh().catch((issue: unknown) => setError(issue instanceof Error ? issue.message : "Could not load dashboard.")); }, [refresh]);
  const selectedRoom = useMemo(() => rooms.find((room) => room.id === selectedRoomId) ?? null, [rooms, selectedRoomId]);
  useEffect(() => {
    if (!selectedRoom) { setEntries([]); setParticipants([]); return; }
    Promise.all([
      api<AdminSubmission[]>(`/admin/rooms/${selectedRoom.id}/results`),
      api<AdminParticipant[]>(`/admin/rooms/${selectedRoom.id}/participants`),
    ]).then(([nextEntries, nextParticipants]) => {
      setEntries(nextEntries);
      setParticipants(nextParticipants);
    }).catch((issue: unknown) => setError(issue instanceof Error ? issue.message : "Could not load room results."));
  }, [selectedRoom?.id]);

  async function createRoom(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try {
      const created = await api<{ id: string; code: string; status: string; challengeTitle: string }>("/admin/rooms", {
        method: "POST", body: JSON.stringify({ challengeId: selectedChallengeId, durationMinutes: duration }),
      });
      setMessage(`Room ${created.code} created. Activate it when participants are ready.`);
      await refresh();
      setSelectedRoomId(created.id);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Could not create room.");
    } finally { setBusy(false); }
  }

  async function changeStatus(room: Room, status: Room["status"]) {
    setError(""); setMessage("");
    try {
      await api(`/admin/rooms/${room.id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
      await refresh();
      setMessage(`Room ${room.code} is now ${status}.`);
    } catch (issue) { setError(issue instanceof Error ? issue.message : "Could not update room."); }
  }

  return (
    <div>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="font-mono text-xs tracking-[.18em] text-electric">ORGANIZER CONSOLE</p><h1 className="mt-2 text-3xl font-bold">Room dashboard</h1><p className="mt-2 text-sm text-slate-400">Create rooms, control entry, and track every submission.</p></div><Link to="/admin/challenges" className="btn-secondary">Manage challenges <ArrowUpRight size={15} /></Link></div>
      {(message || error) && <div className="mb-5"><Notice tone={message ? "success" : "error"}>{message || error}</Notice></div>}
      <section className="panel mb-8 p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-electric/10 text-electric"><Sparkles size={17} /></span><div><h2 className="font-semibold">Create a room</h2><p className="text-xs text-slate-500">A unique access code is generated automatically.</p></div></div>
        <form onSubmit={createRoom} className="grid gap-4 sm:grid-cols-[1fr_180px_auto] sm:items-end">
          <label><span className="label">Challenge</span><select className="field" value={selectedChallengeId} onChange={(event) => setSelectedChallengeId(event.target.value)} required><option value="" disabled>Select challenge</option>{challenges.map((challenge) => <option key={challenge.id} value={challenge.id}>{challenge.title} · {challenge.difficulty}</option>)}</select></label>
          <label><span className="label">Timer (minutes)</span><input className="field" type="number" min={1} max={180} value={duration} onChange={(event) => setDuration(Number(event.target.value))} required /></label>
          <button className="btn-primary" disabled={busy || !selectedChallengeId}>{busy ? "Creating…" : "Create room"} <ArrowRight size={15} /></button>
        </form>
      </section>
      <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-semibold">Event rooms <span className="ml-2 font-mono text-xs text-slate-500">{rooms.length}</span></h2><button onClick={() => void refresh()} className="btn-secondary !px-3 !py-2 text-xs"><RefreshCw size={13} /> Refresh</button></div>
      <div className="grid gap-3 lg:grid-cols-2">
        {rooms.length === 0 && <div className="panel p-8 text-center text-sm text-slate-500 lg:col-span-2">No rooms yet. Create your first room above.</div>}
        {rooms.map((room) => <article key={room.id} className={`panel p-5 ${selectedRoomId === room.id ? "border-electric/35" : ""}`}>
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-mono text-[10px] tracking-widest text-slate-500">ACCESS CODE</p><p className="mt-1 font-mono text-2xl font-medium tracking-[.15em] text-white">{room.code}</p><p className="mt-2 text-sm text-slate-400">{room.challenge_title}</p></div><span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${room.status === "active" ? "border-neon/30 bg-neon/5 text-neon" : room.status === "ended" ? "border-slate-700 text-slate-500" : "border-electric/20 text-electric"}`}>{room.status}</span></div>
          <div className="mt-5 grid grid-cols-3 gap-3 border-y border-stroke py-3 text-xs"><span className="text-slate-500">{Math.floor(room.time_limit_seconds / 60)} min</span><span className="inline-flex items-center gap-1 text-slate-400"><Users size={13} />{room.participant_count} participants</span><span className="text-right text-slate-400">{room.submission_count} submissions</span></div>
          <div className="mt-4 flex flex-wrap gap-2">
            {room.status === "draft" && <button onClick={() => void changeStatus(room, "active")} className="btn-primary !px-3 !py-2 text-xs"><Play size={13} /> Activate</button>}
            {room.status === "active" && <button onClick={() => void changeStatus(room, "closed")} className="btn-secondary !px-3 !py-2 text-xs"><LockKeyhole size={13} /> Close entry</button>}
            {(room.status === "active" || room.status === "closed") && <button onClick={() => void changeStatus(room, "ended")} className="btn-secondary !px-3 !py-2 text-xs"><Flag size={13} /> End room</button>}
            {room.status === "closed" && <button onClick={() => void changeStatus(room, "active")} className="btn-secondary !px-3 !py-2 text-xs">Reopen</button>}
            <button onClick={() => setSelectedRoomId(room.id)} className="btn-secondary !px-3 !py-2 text-xs"><Trophy size={13} /> Results</button>
            <button onClick={() => { window.location.href = `/api/admin/rooms/${room.id}/export.csv`; }} className="btn-secondary !px-3 !py-2 text-xs"><Download size={13} /> CSV</button>
          </div>
        </article>)}
      </div>
      {selectedRoom && <section className="panel mt-8 overflow-hidden">
        <div className="border-b border-stroke px-5 py-4"><h3 className="text-sm font-semibold">Participants <span className="ml-2 font-mono text-xs text-slate-500">{participants.length}</span></h3></div>
        {participants.length === 0 ? <p className="p-6 text-center text-sm text-slate-500">No participants have joined yet.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-xs"><thead className="bg-[#080b0f] font-mono text-[9px] tracking-widest text-slate-500"><tr><th className="px-5 py-3">PARTICIPANT</th><th className="px-3 py-3">TEAM</th><th className="px-3 py-3">STATE</th><th className="px-3 py-3">SCORE</th><th className="px-3 py-3">TIME</th></tr></thead><tbody>{participants.map((person) => <tr key={person.id} className="border-t border-stroke/70"><td className="px-5 py-3 text-white">{person.name}</td><td className="px-3 py-3 text-slate-400">{person.team_name}</td><td className="px-3 py-3 capitalize text-slate-400">{person.submission_status ?? (person.started_at ? "in progress" : "joined")}</td><td className="px-3 py-3 font-mono text-neon">{person.score === null ? "—" : `${person.score.toFixed(4)}%`}</td><td className="px-3 py-3 font-mono text-slate-300">{person.duration_ms === null ? "—" : formatDuration(person.duration_ms)}</td></tr>)}</tbody></table></div>}
        <div className="border-y border-stroke px-5 py-4"><h3 className="text-sm font-semibold">Ranked submissions <span className="ml-2 font-mono text-xs text-slate-500">{entries.length}</span></h3></div>
        {entries.length === 0 ? <p className="p-6 text-center text-sm text-slate-500">No submissions in this room yet.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead className="bg-[#080b0f] font-mono text-[9px] tracking-widest text-slate-500"><tr><th className="px-5 py-3">RANK</th><th className="px-3 py-3">PARTICIPANT</th><th className="px-3 py-3">TEAM</th><th className="px-3 py-3">SCORE</th><th className="px-3 py-3">TIME</th><th className="px-3 py-3">SUBMISSION</th><th className="px-3 py-3">CODE</th></tr></thead><tbody>{entries.map((entry) => <tr key={`${entry.rank}-${entry.name}`} className="border-t border-stroke/70 align-top"><td className="px-5 py-3 font-mono text-electric">{entry.rank}</td><td className="px-3 py-3 text-white">{entry.name}</td><td className="px-3 py-3 text-slate-400">{entry.teamName}</td><td className="px-3 py-3 font-mono text-neon">{entry.score.toFixed(4)}%</td><td className="px-3 py-3 font-mono text-slate-300">{formatDuration(entry.durationMs)}</td><td className="px-3 py-3 capitalize text-slate-400">{entry.status} · {languages.find((item) => item.id === entry.language)?.label}</td><td className="px-3 py-3"><details><summary className="cursor-pointer text-electric">Reveal</summary><pre className="mt-2 max-h-64 min-w-64 overflow-auto whitespace-pre-wrap rounded-lg border border-stroke bg-ink p-3 font-mono text-[11px] leading-5 text-slate-300">{entry.code}</pre></details></td></tr>)}</tbody></table></div>}
      </section>}
    </div>
  );
}

function ChallengeManagement() {
  const [challenges, setChallenges] = useState<AdminChallenge[]>([]);
  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState("Easy");
  const [prompt, setPrompt] = useState("");
  const [inputFormat, setInputFormat] = useState("");
  const [outputFormat, setOutputFormat] = useState("");
  const [exampleInput, setExampleInput] = useState("");
  const [exampleOutput, setExampleOutput] = useState("");
  const [references, setReferences] = useState<Record<Language, string>>({ cpp: "", c: "", java: "", python: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(() => api<AdminChallenge[]>("/admin/challenges").then(setChallenges), []);
  useEffect(() => { void refresh().catch((issue: unknown) => setError(issue instanceof Error ? issue.message : "Could not load challenges.")); }, [refresh]);

  async function createChallenge(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError(""); setSuccess("");
    try {
      await api("/admin/challenges", {
        method: "POST",
        body: JSON.stringify({
          title, difficulty, prompt, inputFormat, outputFormat,
          examples: [{ input: exampleInput, output: exampleOutput }],
          references,
        }),
      });
      setTitle(""); setPrompt(""); setInputFormat(""); setOutputFormat(""); setExampleInput(""); setExampleOutput("");
      setReferences({ cpp: "", c: "", java: "", python: "" });
      setSuccess("Challenge created. Reference solutions remain server-side.");
      await refresh();
    } catch (issue) { setError(issue instanceof Error ? issue.message : "Could not create challenge."); }
    finally { setBusy(false); }
  }

  return (
    <div>
      <div className="mb-7"><Link to="/admin" className="mb-5 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowLeft size={14} /> Rooms dashboard</Link><p className="font-mono text-xs tracking-[.18em] text-electric">CHALLENGE LIBRARY</p><h1 className="mt-2 text-3xl font-bold">Manage challenges</h1><p className="mt-2 text-sm text-slate-400">Reference solutions are private and never sent before submission.</p></div>
      {(error || success) && <div className="mb-5"><Notice tone={success ? "success" : "error"}>{success || error}</Notice></div>}
      <div className="grid items-start gap-7 lg:grid-cols-[.8fr_1.2fr]">
        <section className="panel p-5">
          <h2 className="mb-4 font-semibold">Available challenges <span className="ml-2 font-mono text-xs text-slate-500">{challenges.length}</span></h2>
          <div className="space-y-3">{challenges.map((challenge) => <article key={challenge.id} className="rounded-xl border border-stroke bg-ink/60 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-semibold">{challenge.title}</h3><p className="mt-1 text-[10px] uppercase tracking-widest text-slate-500">{challenge.difficulty}</p></div><span className="rounded border border-neon/20 px-2 py-1 text-[9px] text-neon">4 solutions</span></div><p className="mt-3 line-clamp-3 text-xs leading-5 text-slate-400">{challenge.prompt}</p></article>)}</div>
        </section>
        <form onSubmit={createChallenge} className="panel space-y-5 p-5 sm:p-6">
          <div><p className="font-mono text-[10px] tracking-widest text-electric">NEW CHALLENGE</p><h2 className="mt-1 text-lg font-semibold">Add to the library</h2></div>
          <div className="grid gap-4 sm:grid-cols-[1fr_150px]"><label><span className="label">Title</span><input className="field" value={title} onChange={(event) => setTitle(event.target.value)} minLength={3} maxLength={100} required /></label><label><span className="label">Difficulty</span><select className="field" value={difficulty} onChange={(event) => setDifficulty(event.target.value)}><option>Easy</option><option>Medium</option><option>Hard</option></select></label></div>
          <label className="block"><span className="label">Problem statement</span><textarea className="field min-h-24 resize-y" value={prompt} onChange={(event) => setPrompt(event.target.value)} minLength={20} maxLength={10000} required /></label>
          <div className="grid gap-4 sm:grid-cols-2"><label><span className="label">Input format</span><textarea className="field min-h-20 resize-y" value={inputFormat} onChange={(event) => setInputFormat(event.target.value)} required /></label><label><span className="label">Output format</span><textarea className="field min-h-20 resize-y" value={outputFormat} onChange={(event) => setOutputFormat(event.target.value)} required /></label></div>
          <div className="grid gap-4 sm:grid-cols-2"><label><span className="label">Example input</span><textarea className="field min-h-20 resize-y font-mono text-xs" value={exampleInput} onChange={(event) => setExampleInput(event.target.value)} required /></label><label><span className="label">Expected output</span><textarea className="field min-h-20 resize-y font-mono text-xs" value={exampleOutput} onChange={(event) => setExampleOutput(event.target.value)} required /></label></div>
          <div><p className="label">Reference solutions · private</p><div className="grid gap-3 sm:grid-cols-2">{languages.map((item) => <label key={item.id}><span className="mb-1 block text-[10px] text-slate-500">{item.label}</span><textarea className="field min-h-32 resize-y font-mono text-[11px]" value={references[item.id]} onChange={(event) => setReferences((current) => ({ ...current, [item.id]: event.target.value }))} required /></label>)}</div></div>
          <div className="flex items-center justify-between gap-3 border-t border-stroke pt-4"><span className="text-xs text-slate-500"><ShieldCheck size={13} className="mr-1 inline text-neon" /> Stored on server only</span><button className="btn-primary" disabled={busy}>{busy ? "Saving…" : "Save challenge"} <Check size={15} /></button></div>
        </form>
      </div>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<JoinRoom />} />
      <Route path="/instructions" element={<Instructions />} />
      <Route path="/workspace" element={<Workspace />} />
      <Route path="/results/:id" element={<Results />} />
      <Route path="/leaderboard/:code" element={<Leaderboard />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="challenges" element={<ChallengeManagement />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
