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
    <p className="text-[12px] text-[#888] text-center tabular-nums">
      Next puzzle in{" "}
      <span className="text-[#111] font-medium">
        {pad(time.hours)}:{pad(time.minutes)}:{pad(time.seconds)}
      </span>
    </p>
  );
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
    <div className="flex flex-col pt-2 pb-4 overflow-y-auto">
      {/* ── Score ─────────────────────────────────────────────────────── */}
      <div className="text-center pt-4 pb-3">
        <div className="leading-none">
          <span className="text-[32px] font-medium text-[#111]">{score}</span>
          <span className="text-[32px] font-normal text-[#aaa]">/10</span>
        </div>
        <p className="text-[12px] text-[#888] mt-1">correct positions</p>
        <p className="text-[20px] mt-2 tracking-widest select-none">{emojiRow}</p>
      </div>

      {/* ── Share ─────────────────────────────────────────────────────── */}
      <button
        onClick={handleShare}
        aria-label="Share your result"
        className={`w-full py-3 text-[14px] transition-colors ${
          copied
            ? "bg-[#111] text-white"
            : "bg-[#111] text-white hover:bg-[#333]"
        }`}
      >
        {copied ? "✓ Copied!" : "Share Result"}
      </button>

      {/* ── Countdown ─────────────────────────────────────────────────── */}
      <div className="mt-3 mb-1">
        <CountdownTimer />
      </div>

      {/* ── Divider ───────────────────────────────────────────────────── */}
      <div className="mt-3 h-[2px] bg-[#111]" />

      {/* ── Result rows ───────────────────────────────────────────────── */}
      <div>
        {results.map((result, index) => (
          <div
            key={result.event.id}
            className={`flex items-start min-h-[44px] border-t border-[#eee] pl-2 border-l-2 ${
              result.correct ? "border-l-[#16a34a]" : "border-l-[#dc2626]"
            }`}
          >
            <span className="w-6 flex-shrink-0 text-[12px] text-[#aaa] pt-[13px]">
              {index + 1}
            </span>
            <div className="flex-1 py-2 pr-2">
              <p className="text-[14px] text-[#111] leading-snug">
                {result.event.eventText}
              </p>
              <p className="text-[12px] text-[#888] mt-0.5">
                {formatYear(result.event.year)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
