export const dynamic = "force-dynamic";

// ── Firebase Admin (singleton, dynamic import so it never loads at build time) ─

async function getAdminDb() {
  const { initializeApp, cert, getApps } = await import("firebase-admin/app");
  const { getFirestore } = await import("firebase-admin/firestore");

  if (!getApps().length) {
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
    if (!privateKey) throw new Error("Missing env var: FIREBASE_ADMIN_PRIVATE_KEY");
    if (!process.env.FIREBASE_ADMIN_PROJECT_ID) throw new Error("Missing env var: FIREBASE_ADMIN_PROJECT_ID");
    if (!process.env.FIREBASE_ADMIN_CLIENT_EMAIL) throw new Error("Missing env var: FIREBASE_ADMIN_CLIENT_EMAIL");

    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        // Vercel may store the key with literal \n sequences — normalise to real newlines
        privateKey: privateKey.replace(/\\n/g, "\n"),
      }),
    });
  }
  return getFirestore();
}

// ── Types ──────────────────────────────────────────────────────────────────

interface ResultDoc {
  userId: string;
  puzzleDate: string;
  score: number;
  timeToComplete: number;
}

// ── Data fetching ──────────────────────────────────────────────────────────

async function fetchStats() {
  const db = await getAdminDb();
  const snap = await db.collection("results").get();
  const docs = snap.docs.map((d) => d.data() as ResultDoc);

  if (docs.length === 0) {
    return {
      total: 0,
      uniquePlayers: 0,
      todayPlays: 0,
      avgScore: 0,
      avgTime: 0,
      scoreDistribution: Array(11).fill(0) as number[],
      last7Days: [] as { date: string; count: number }[],
    };
  }

  const today = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();

  const uniquePlayers = new Set(docs.map((d) => d.userId)).size;
  const todayPlays = docs.filter((d) => d.puzzleDate === today).length;
  const avgScore = docs.reduce((s, d) => s + (d.score ?? 0), 0) / docs.length;
  const avgTime = docs.reduce((s, d) => s + (d.timeToComplete ?? 0), 0) / docs.length;

  const scoreDistribution = Array(11).fill(0) as number[];
  for (const d of docs) {
    const s = Math.min(10, Math.max(0, d.score ?? 0));
    scoreDistribution[s]++;
  }

  const last7Days: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const dt = new Date();
    dt.setDate(dt.getDate() - i);
    const dateStr = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
    last7Days.push({
      date: dateStr,
      count: docs.filter((d) => d.puzzleDate === dateStr).length,
    });
  }

  return { total: docs.length, uniquePlayers, todayPlays, avgScore, avgTime, scoreDistribution, last7Days };
}

// ── Page ──────────────────────────────────────────────────────────────────

export default async function StatsPage() {
  let stats: Awaited<ReturnType<typeof fetchStats>> | null = null;
  let errorMessage: string | null = null;

  try {
    stats = await fetchStats();
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : String(err);
  }

  // ── Error state ──────────────────────────────────────────────────────────
  if (errorMessage) {
    return (
      <div className="min-h-screen bg-[#F9F8F4] py-10 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-[24px] font-serif text-[#2C2C2A] mb-4">Chronology Daily — Stats</h1>
          <div className="bg-red-50 border border-red-200 rounded-[8px] px-4 py-4">
            <p className="text-[13px] font-medium text-red-700 mb-1">Failed to load stats</p>
            <pre className="text-[12px] text-red-600 whitespace-pre-wrap break-all">{errorMessage}</pre>
          </div>
          <div className="mt-4 bg-white border border-[#D3D1C7] rounded-[8px] px-4 py-3">
            <p className="text-[11px] text-[#B4B2A9] uppercase tracking-wide mb-2">Env var status</p>
            {["FIREBASE_ADMIN_PROJECT_ID", "FIREBASE_ADMIN_CLIENT_EMAIL", "FIREBASE_ADMIN_PRIVATE_KEY"].map((key) => (
              <p key={key} className="text-[12px] text-[#2C2C2A]">
                <span className="font-mono">{key}</span>:{" "}
                {process.env[key] ? <span className="text-green-700">set ({process.env[key]!.length} chars)</span> : <span className="text-red-600">MISSING</span>}
              </p>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Happy path ───────────────────────────────────────────────────────────
  const s = stats!;
  const maxDayCount = Math.max(...s.last7Days.map((d) => d.count), 1);
  const maxScoreCount = Math.max(...s.scoreDistribution, 1);

  function fmt(n: number, decimals = 1) {
    return n.toFixed(decimals);
  }

  function shortDate(dateStr: string) {
    const [, m, d] = dateStr.split("-");
    return `${parseInt(m)}/${parseInt(d)}`;
  }

  return (
    <div className="min-h-screen bg-[#F9F8F4] py-10 px-4">
      <div className="max-w-2xl mx-auto">

        <div className="mb-8">
          <h1 className="text-[24px] font-serif text-[#2C2C2A]">Chronology Daily — Stats</h1>
          <p className="text-[13px] text-[#B4B2A9] mt-0.5">Live data from Firestore results collection</p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6 sm:grid-cols-4">
          {[
            { label: "Total Games", value: s.total.toString() },
            { label: "Unique Players", value: s.uniquePlayers.toString() },
            { label: "Today's Plays", value: s.todayPlays.toString() },
            { label: "Avg Score", value: `${fmt(s.avgScore)}/10` },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white border border-[#D3D1C7] rounded-[8px] px-4 py-3">
              <p className="text-[11px] text-[#B4B2A9] uppercase tracking-wide">{label}</p>
              <p className="text-[28px] font-serif text-[#2C2C2A] leading-tight">{value}</p>
            </div>
          ))}
        </div>

        <div className="bg-white border border-[#D3D1C7] rounded-[8px] px-4 py-3 mb-6">
          <p className="text-[11px] text-[#B4B2A9] uppercase tracking-wide mb-0.5">Avg Time to Complete</p>
          <p className="text-[22px] font-serif text-[#2C2C2A]">
            {s.total === 0 ? "—" : `${fmt(s.avgTime / 60, 1)} min (${Math.round(s.avgTime)}s)`}
          </p>
        </div>

        <div className="bg-white border border-[#D3D1C7] rounded-[8px] px-4 py-4 mb-6">
          <p className="text-[11px] text-[#B4B2A9] uppercase tracking-wide mb-3">Daily Plays — Last 7 Days</p>
          {s.total === 0 ? (
            <p className="text-[13px] text-[#B4B2A9]">No data yet.</p>
          ) : (
            <div className="flex items-end gap-2 h-[80px]">
              {s.last7Days.map(({ date, count }) => (
                <div key={date} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-[#854F0B] rounded-sm"
                    style={{ height: `${Math.round((count / maxDayCount) * 64)}px`, minHeight: count > 0 ? "4px" : "0" }}
                  />
                  <span className="text-[10px] text-[#B4B2A9]">{shortDate(date)}</span>
                  <span className="text-[10px] text-[#2C2C2A] font-medium">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-[#D3D1C7] rounded-[8px] px-4 py-4">
          <p className="text-[11px] text-[#B4B2A9] uppercase tracking-wide mb-3">Score Distribution</p>
          {s.total === 0 ? (
            <p className="text-[13px] text-[#B4B2A9]">No data yet.</p>
          ) : (
            <div className="space-y-1.5">
              {s.scoreDistribution.map((count, score) => (
                <div key={score} className="flex items-center gap-2">
                  <span className="text-[12px] text-[#2C2C2A] w-8 text-right flex-shrink-0">{score}/10</span>
                  <div className="flex-1 bg-[#F1EFE8] rounded-sm h-[18px] overflow-hidden">
                    <div
                      className="h-full bg-[#854F0B] rounded-sm"
                      style={{ width: `${Math.round((count / maxScoreCount) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[12px] text-[#B4B2A9] w-6 flex-shrink-0">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
