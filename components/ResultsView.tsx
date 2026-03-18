"use client";

import { useEffect, useState } from "react";
import { HistoricalEvent } from "./GameBoard";

interface ResultsViewProps {
  correctOrder: HistoricalEvent[];
  positions: boolean[];
  puzzleNumber: number;
  puzzleDate: string;
}

function formatYear(year: number): string {
  return year < 0 ? `${Math.abs(year)} BCE` : `${year} CE`;
}

function getTimeUntilMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const diff = midnight.getTime() - now.getTime();
  return {
    hours: Math.floor(diff / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  };
}

function CountdownTimer() {
  const [time, setTime] = useState(getTimeUntilMidnight);

  useEffect(() => {
    const id = setInterval(() => setTime(getTimeUntilMidnight()), 1000);
    return () => clearInterval(id);
  }, []);

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="text-center py-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
      <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold mb-1">
        Next puzzle in
      </p>
      <p className="text-3xl font-black text-slate-800 tabular-nums tracking-tight">
        {pad(time.hours)}:{pad(time.minutes)}:{pad(time.seconds)}
      </p>
    </div>
  );
}

function scoreLabel(score: number): string {
  if (score === 10) return "Perfect! 🎉";
  if (score >= 8) return "Great job!";
  if (score >= 5) return "Not bad!";
  return "Keep practicing!";
}

export default function ResultsView({
  correctOrder,
  positions,
  puzzleNumber,
}: ResultsViewProps) {
  const [copied, setCopied] = useState(false);

  const results = correctOrder.map((event, index) => ({
    event,
    correct: positions[index] ?? false,
  }));

  const score = results.filter((r) => r.correct).length;
  const emojiRow = results.map((r) => (r.correct ? "🟩" : "🟥")).join("");

  async function handleShare() {
    const text = `Chronology #${puzzleNumber}: ${score}/10\n${emojiRow}\nchronologydaily.com`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-4 pb-8">
      {/* Score header */}
      <div className="text-center py-6 bg-white rounded-2xl border border-slate-200 shadow-sm animate-pop-in">
        <div className="text-7xl font-black text-slate-900 leading-none tabular-nums">
          {score}
          <span className="text-slate-300 text-4xl font-bold">/10</span>
        </div>
        <p className="text-slate-500 text-sm mt-2 font-medium">
          {scoreLabel(score)}
        </p>
        <div className="text-2xl mt-4 tracking-widest leading-relaxed select-none">
          {emojiRow}
        </div>
      </div>

      {/* Countdown */}
      <CountdownTimer />

      {/* Share CTA */}
      <button
        onClick={handleShare}
        className={`w-full py-4 font-bold text-base rounded-2xl transition-all active:scale-[0.98] shadow-md ${
          copied
            ? "bg-green-600 text-white"
            : "bg-slate-900 hover:bg-slate-700 text-white"
        }`}
      >
        {copied ? "✓ Copied to clipboard!" : "Share Result"}
      </button>

      {/* Correct order */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest px-1 pt-1">
          Correct order
        </p>
        {results.map((result, index) => (
          <div
            key={result.event.id}
            className={`flex items-start gap-3 p-4 rounded-xl border animate-slide-up ${
              result.correct
                ? "bg-green-50 border-green-300"
                : "bg-red-50 border-red-200"
            }`}
            style={{ animationDelay: `${index * 40}ms` }}
          >
            <span
              className={`flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold text-white mt-0.5 ${
                result.correct ? "bg-green-600" : "bg-red-500"
              }`}
            >
              {index + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm font-semibold leading-snug ${
                  result.correct ? "text-green-900" : "text-red-900"
                }`}
              >
                {result.event.eventText}
              </p>
              <p
                className={`text-xs font-bold mt-0.5 ${
                  result.correct ? "text-green-600" : "text-red-500"
                }`}
              >
                {formatYear(result.event.year)}
              </p>
              {result.event.description && (
                <p
                  className={`text-xs mt-1 leading-snug ${
                    result.correct ? "text-green-700" : "text-red-600"
                  }`}
                >
                  {result.event.description}
                </p>
              )}
            </div>
            <span className="text-base flex-shrink-0 mt-0.5">
              {result.correct ? "🟩" : "🟥"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
