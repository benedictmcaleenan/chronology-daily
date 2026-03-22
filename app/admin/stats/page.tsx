export const dynamic = "force-dynamic";

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";
import { join } from "path";

// ── Firebase Admin (singleton) ─────────────────────────────────────────────

function getAdminDb() {
  if (!getApps().length) {
    const serviceAccount = JSON.parse(
      readFileSync(join(process.cwd(), "serviceAccountKey.json"), "utf-8")
    );
    initializeApp({ credential: cert(serviceAccount) });
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
  const db = getAdminDb();
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

  // Last 7 days
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
  const stats = await fetchStats();

  const maxDayCount = Math.max(...stats.last7Days.map((d) => d.count), 1);
  const maxScoreCount = Math.max(...stats.scoreDistribution, 1);

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

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-[24px] font-serif text-[#2C2C2A]">Chronology Daily — Stats</h1>
          <p className="text-[13px] text-[#B4B2A9] mt-0.5">Live data from Firestore results collection</p>
        </div>

        {/* Top stats */}
        <div className="grid grid-cols-2 gap-3 mb-6 sm:grid-cols-4">
          {[
            { label: "Total Games", value: stats.total.toString() },
            { label: "Unique Players", value: stats.uniquePlayers.toString() },
            { label: "Today's Plays", value: stats.todayPlays.toString() },
            { label: "Avg Score", value: `${fmt(stats.avgScore)}/10` },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white border border-[#D3D1C7] rounded-[8px] px-4 py-3">
              <p className="text-[11px] text-[#B4B2A9] uppercase tracking-wide">{label}</p>
              <p className="text-[28px] font-serif text-[#2C2C2A] leading-tight">{value}</p>
            </div>
          ))}
        </div>

        {/* Avg time */}
        <div className="bg-white border border-[#D3D1C7] rounded-[8px] px-4 py-3 mb-6">
          <p className="text-[11px] text-[#B4B2A9] uppercase tracking-wide mb-0.5">Avg Time to Complete</p>
          <p className="text-[22px] font-serif text-[#2C2C2A]">
            {stats.total === 0 ? "—" : `${fmt(stats.avgTime / 60, 1)} min (${Math.round(stats.avgTime)}s)`}
          </p>
        </div>

        {/* Daily plays — last 7 days */}
        <div className="bg-white border border-[#D3D1C7] rounded-[8px] px-4 py-4 mb-6">
          <p className="text-[11px] text-[#B4B2A9] uppercase tracking-wide mb-3">Daily Plays — Last 7 Days</p>
          {stats.total === 0 ? (
            <p className="text-[13px] text-[#B4B2A9]">No data yet.</p>
          ) : (
            <div className="flex items-end gap-2 h-[80px]">
              {stats.last7Days.map(({ date, count }) => (
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

        {/* Score distribution */}
        <div className="bg-white border border-[#D3D1C7] rounded-[8px] px-4 py-4">
          <p className="text-[11px] text-[#B4B2A9] uppercase tracking-wide mb-3">Score Distribution</p>
          {stats.total === 0 ? (
            <p className="text-[13px] text-[#B4B2A9]">No data yet.</p>
          ) : (
            <div className="space-y-1.5">
              {stats.scoreDistribution.map((count, score) => (
                <div key={score} className="flex items-center gap-2">
                  <span className="text-[12px] text-[#2C2C2A] w-8 text-right flex-shrink-0">{score}/10</span>
                  <div className="flex-1 bg-[#F1EFE8] rounded-sm h-[18px] overflow-hidden">
                    <div
                      className="h-full bg-[#854F0B] rounded-sm transition-all"
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
