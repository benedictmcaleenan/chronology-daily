"use client";

import { useState } from "react";
import { HistoricalEvent } from "./GameBoard";

interface ResultsViewProps {
  correctOrder: HistoricalEvent[];
  positions: boolean[]; // positions[i] true = event i was placed correctly
  puzzleNumber: number;
}

function formatYear(year: number): string {
  return year < 0 ? `${Math.abs(year)} BCE` : `${year} CE`;
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
    <div className="flex flex-col gap-5 pb-8">
      {/* Score header */}
      <div className="text-center py-5 bg-white rounded-2xl border-2 border-gray-200 shadow-sm">
        <div className="text-6xl font-black text-gray-900 leading-none">
          {score}
          <span className="text-gray-400 text-3xl font-bold">/10</span>
        </div>
        <p className="text-gray-500 text-sm mt-1">correct positions</p>
        <div className="text-2xl mt-3 tracking-widest leading-relaxed">
          {emojiRow}
        </div>
      </div>

      {/* Results list */}
      <div className="space-y-2">
        {results.map((result, index) => (
          <div
            key={result.event.id}
            className={`flex items-start gap-3 p-4 rounded-2xl border-2 ${
              result.correct
                ? "bg-green-50 border-green-300"
                : "bg-red-50 border-red-300"
            }`}
          >
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <span
                className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold text-white ${
                  result.correct ? "bg-green-500" : "bg-red-400"
                }`}
              >
                {index + 1}
              </span>
              <span className="text-base leading-none">
                {result.correct ? "🟩" : "🟥"}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <p
                className={`text-sm font-semibold leading-snug ${
                  result.correct ? "text-green-900" : "text-red-900"
                }`}
              >
                {result.event.eventText}
              </p>
              <p
                className={`text-xs font-bold mt-1 ${
                  result.correct ? "text-green-600" : "text-red-500"
                }`}
              >
                {formatYear(result.event.year)}
              </p>
              {result.event.description && (
                <p
                  className={`text-xs mt-1 leading-snug ${
                    result.correct ? "text-green-700" : "text-red-700"
                  }`}
                >
                  {result.event.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Share button */}
      <button
        onClick={handleShare}
        className={`w-full py-4 font-bold text-base rounded-2xl transition-all shadow-sm ${
          copied
            ? "bg-green-500 text-white"
            : "bg-gray-900 hover:bg-gray-700 active:bg-gray-800 text-white"
        }`}
      >
        {copied ? "✓ Copied!" : "Share Result"}
      </button>
    </div>
  );
}
