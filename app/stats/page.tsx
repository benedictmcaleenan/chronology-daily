"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ensureAnonymousAuth } from "@/lib/firebase";

interface ResultDoc {
  userId: string;
  puzzleDate: string;
  score: number;
  timeToComplete: number;
}

interface Stats {
  total: number;
  uniquePlayers: number;
  todayPlays: number;
  avgScore: number;
  avgTime: number;
  scoreDistribution: number[];
  last7Days: { date: string; count: number }[];
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dateStrOffset(daysAgo: number) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function shortDate(dateStr: string) {
  const [, m, d] = dateStr.split("-");
  return `${parseInt(m)}/${parseInt(d)}`;
}

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        await ensureAnonymousAuth();
        const snap = await getDocs(collection(db, "results"));
        const docs = snap.docs.map((d) => d.data() as ResultDoc);

        const today = todayStr();
        const uniquePlayers = new Set(docs.map((d) => d.userId)).size;
        const todayPlays = docs.filter((d) => d.puzzleDate === today).length;
        const avgScore = docs.length ? docs.reduce((s, d) => s + (d.score ?? 0), 0) / docs.length : 0;
        const avgTime = docs.length ? docs.reduce((s, d) => s + (d.timeToComplete ?? 0), 0) / docs.length : 0;

        const scoreDistribution = Array(11).fill(0) as number[];
        for (const d of docs) {
          scoreDistribution[Math.min(10, Math.max(0, d.score ?? 0))]++;
        }

        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = dateStrOffset(6 - i);
          return { date, count: docs.filter((d) => d.puzzleDate === date).length };
        });

        setStats({ total: docs.length, uniquePlayers, todayPlays, avgScore, avgTime, scoreDistribution, last7Days });
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    }
    load();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-[#F9F8F4] py-10 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-[24px] font-serif text-[#2C2C2A] mb-4">Chronology Daily — Stats</h1>
          <div className="bg-red-50 border border-red-200 rounded-[8px] px-4 py-4">
            <p className="text-[13px] font-medium text-red-700 mb-1">Failed to load stats</p>
            <pre className="text-[12px] text-red-600 whitespace-pre-wrap break-all">{error}</pre>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-[#F9F8F4] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#D3D1C7] border-t-[#854F0B] rounded-full animate-spin" />
      </div>
    );
  }

  const maxDayCount = Math.max(...stats.last7Days.map((d) => d.count), 1);
  const maxScoreCount = Math.max(...stats.scoreDistribution, 1);

  return (
    <div className="min-h-screen bg-[#F9F8F4] py-10 px-4">
      <div className="max-w-2xl mx-auto">

        <div className="mb-8">
          <h1 className="text-[24px] font-serif text-[#2C2C2A]">Chronology Daily — Stats</h1>
          <p className="text-[13px] text-[#B4B2A9] mt-0.5">Live data from Firestore</p>
        </div>

        {/* Top stats */}
        <div className="grid grid-cols-2 gap-3 mb-6 sm:grid-cols-4">
          {[
            { label: "Total Games", value: stats.total.toString() },
            { label: "Unique Players", value: stats.uniquePlayers.toString() },
            { label: "Today's Plays", value: stats.todayPlays.toString() },
            { label: "Avg Score", value: `${stats.avgScore.toFixed(1)}/10` },
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
            {stats.total === 0 ? "—" : `${(stats.avgTime / 60).toFixed(1)} min (${Math.round(stats.avgTime)}s)`}
          </p>
        </div>

        {/* Daily plays */}
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
