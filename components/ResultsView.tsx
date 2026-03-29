"use client";

import { useEffect, useState } from "react";
import { HistoricalEvent } from "./GameBoard";
import { trackEvent } from "@/lib/analytics";

const SCORE_TIERS: { range: [number, number]; rank: string }[] = [
  { range: [0, 1], rank: "Still figuring out fire" },
  { range: [2, 3], rank: "Wrong century, wrong continent" },
  { range: [4, 5], rank: "Could probably bluff a pub quiz" },
  { range: [6, 7], rank: "Starting to worry my friends" },
  { range: [8, 9], rank: "Borderline time traveller" },
  { range: [10, 10], rank: "I might actually be a historian" },
];

function getRank(score: number) {
  return (
    SCORE_TIERS.find((t) => score >= t.range[0] && score <= t.range[1])
      ?.rank ?? ""
  );
}

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
    <p className="text-center text-[12px] text-[#B4B2A9] tabular-nums">
      Next puzzle in{" "}
      <span className="text-[#2C2C2A] font-medium">
        {pad(time.hours)}:{pad(time.minutes)}:{pad(time.seconds)}
      </span>
    </p>
  );
}

export default function ResultsView({
  correctOrder,
  positions,
  puzzleNumber,
  puzzleDate,
}: ResultsViewProps) {
  const [copied, setCopied] = useState(false);

  const results = correctOrder.map((event, index) => ({
    event,
    correct: positions[index] ?? false,
  }));

  const score = results.filter((r) => r.correct).length;
  const emojiRow = results.map((r) => (r.correct ? "🟩" : "🟥")).join("");
  const resultsString = results.map((r) => (r.correct ? "1" : "0")).join("");
  const rank = getRank(score);

  async function handleShare() {
    const shareUrl = `https://chronologydaily.com/share?date=${puzzleDate}&score=${score}&results=${resultsString}`;
    const shareText = `I got ${score}/10 on Chronology Daily — ${rank}. Can you beat me?`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ text: shareText, url: shareUrl });
        trackEvent("share_tapped", { score, method: "web_share" });
        return;
      } catch {
        // User cancelled or share failed — fall through to clipboard
      }
    }

    trackEvent("share_tapped", { score, method: "clipboard" });
    const clipboardText = `${shareText}\n${shareUrl}`;
    try {
      await navigator.clipboard.writeText(clipboardText);
    } catch {
      const el = document.createElement("textarea");
      el.value = clipboardText;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">

      {/* ── Dark header ───────────────────────────────────────────────── */}
      <div className="bg-[#2C2C2A] px-5 pt-3 pb-3 flex-shrink-0">
        <h1 className="text-center text-[20px] font-serif text-[#F1EFE8] leading-none">
          Chronology Daily
        </h1>
        <p className="text-center text-[12px] text-[#B4B2A9] mt-1 leading-none">
          Puzzle #{puzzleNumber} — Results
        </p>
      </div>

      {/* ── Scrollable content ────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-3">

        {/* Score */}
        <div className="text-center mb-3">
          <div className="leading-none">
            <span className="text-[40px] font-serif text-[#2C2C2A]">{score}</span>
            <span className="text-[40px] font-serif text-[#B4B2A9]">/10</span>
          </div>
          <p className="text-[20px] mt-2 tracking-widest select-none">{emojiRow}</p>
        </div>

        {/* Share */}
        <button
          onClick={handleShare}
          aria-label="Copy result to clipboard"
          className={`w-full py-3 text-[14px] font-medium rounded-[8px] transition-colors mb-2 ${
            copied
              ? "bg-[#854F0B] text-[#F1EFE8]"
              : "bg-[#2C2C2A] hover:bg-[#3E3E3B] text-[#F1EFE8]"
          }`}
        >
          {copied ? "✓ Copied!" : "Share Result"}
        </button>

        {/* Countdown */}
        <CountdownTimer />

        {/* Divider */}
        <div className="mt-3 mb-2 h-px bg-[#D3D1C7]" />

        <p className="text-[12px] text-[#B4B2A9] mb-2">The correct order was:</p>

        {/* ── Result rows — same timeline dot style ─────────────────── */}
        {/*
            Dot alignment (same math as GameBoard):
              container pl-8 = 32px
              line: left 10px, width 2px → centre x = 11
              dot:  left -26px relative to row → container x = 6, centre = 11  ✓
        */}
        <div className="relative pl-8">
          {/* Continuous vertical line */}
          <div className="absolute left-[10px] top-0 bottom-0 w-[2px] bg-[#D3D1C7]" />

          {results.map((result, index) => (
            <div
              key={result.event.id}
              className="relative flex items-start min-h-[44px] mb-[3px]"
            >
              {/* Dot — green for correct, red for incorrect */}
              <div
                className={`absolute left-[-26px] top-[17px] w-[10px] h-[10px] rounded-full z-10 ${
                  result.correct ? "bg-[#16a34a]" : "bg-[#dc2626]"
                }`}
              />

              {/* Card */}
              <div
                className={`flex-1 rounded-[6px] border px-3 py-2 ${
                  result.correct
                    ? "bg-[#F0FAF4] border-[#BBF7D0]"
                    : "bg-[#FFF5F5] border-[#FECACA]"
                }`}
              >
                <div className="flex items-start gap-1">
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] text-[#2C2C2A] leading-snug">
                      {result.event.eventText}
                    </p>
                    <p className="text-[12px] text-[#854F0B] mt-0.5 font-medium">
                      {formatYear(result.event.year)}
                    </p>
                    {result.event.description && (
                      <p className="text-[11px] text-[#B4B2A9] mt-0.5 leading-snug">
                        {result.event.description}
                      </p>
                    )}
                  </div>

                  {/* Wikipedia info icon — 44×44 touch target, 20×20 visual */}
                  {result.event.wikiUrl && (
                    <a
                      href={result.event.wikiUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Learn more about ${result.event.eventText} on Wikipedia`}
                      className="flex-shrink-0 -mr-1 w-[44px] h-[44px] flex items-center justify-center"
                    >
                      <span className="w-[20px] h-[20px] flex items-center justify-center rounded-full border border-[#B4B2A9] text-[10px] text-[#B4B2A9] font-medium leading-none select-none">
                        i
                      </span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
