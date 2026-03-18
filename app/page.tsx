"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ensureAnonymousAuth } from "@/lib/firebase";
import {
  fetchTodaysPuzzle,
  fetchTodaysResult,
  saveResult,
  PuzzleData,
} from "@/lib/puzzleService";
import GameBoard, { HistoricalEvent } from "@/components/GameBoard";
import ResultsView from "@/components/ResultsView";

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function Home() {
  const [puzzle, setPuzzle] = useState<PuzzleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"playing" | "results">("playing");
  const [positions, setPositions] = useState<boolean[] | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const gameStartTime = useRef<number>(Date.now());

  useEffect(() => {
    async function init() {
      try {
        const uid = await ensureAnonymousAuth();
        setUserId(uid);

        const puzzleData = await fetchTodaysPuzzle();
        if (!puzzleData) {
          setFetchError("No puzzle available for today. Check back tomorrow!");
          return;
        }
        setPuzzle(puzzleData);

        try {
          const existing = await fetchTodaysResult(uid, puzzleData.puzzleDate);
          if (existing) {
            setPositions(existing.positions);
            setPhase("results");
          }
        } catch {
          // Can't verify prior result — let them play
        }
      } catch {
        setFetchError("Failed to load. Please refresh.");
      } finally {
        setLoading(false);
      }
    }

    init();
  }, []);

  const shuffledEvents = useMemo(
    () => (puzzle ? shuffleArray(puzzle.events) : []),
    [puzzle]
  );

  async function handleSubmit(orderedEvents: HistoricalEvent[]) {
    if (!puzzle || !userId) return;

    const newPositions = puzzle.events.map(
      (event, i) => orderedEvents[i]?.id === event.id
    );
    const score = newPositions.filter(Boolean).length;
    const timeToComplete = Math.round(
      (Date.now() - gameStartTime.current) / 1000
    );

    setPositions(newPositions);
    setPhase("results");

    saveResult({
      puzzleDate: puzzle.puzzleDate,
      puzzleNumber: puzzle.puzzleNumber,
      userId,
      score,
      positions: newPositions,
      timeToComplete,
    }).catch(console.error);
  }

  const headerLine2 = puzzle
    ? phase === "playing"
      ? "Arrange 10 events from oldest to newest"
      : `Puzzle #${puzzle.puzzleNumber} · ${formatDate(puzzle.puzzleDate)}`
    : "A new puzzle every day";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Dark header — full width */}
      <header className="bg-slate-900 text-white">
        <div className="max-w-lg mx-auto px-4 py-4 text-center">
          <h1 className="text-2xl font-black tracking-tight leading-none">
            Chronology Daily
          </h1>
          <p className="text-slate-400 text-sm mt-1">{headerLine2}</p>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-5">
        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-9 h-9 border-4 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
            <p className="text-sm text-slate-400">Loading today&apos;s puzzle…</p>
          </div>
        )}

        {/* Error */}
        {!loading && fetchError && (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">📅</p>
            <p className="text-slate-700 font-medium">{fetchError}</p>
          </div>
        )}

        {/* Game */}
        {!loading && puzzle && phase === "playing" && (
          <GameBoard events={shuffledEvents} onSubmit={handleSubmit} />
        )}

        {/* Results */}
        {!loading && puzzle && phase === "results" && positions && (
          <ResultsView
            correctOrder={puzzle.events}
            positions={positions}
            puzzleNumber={puzzle.puzzleNumber}
            puzzleDate={puzzle.puzzleDate}
          />
        )}
      </main>

      {/* Footer */}
      {!loading && (
        <footer className="text-center py-4 text-slate-400 text-xs border-t border-slate-100">
          A new puzzle every day
        </footer>
      )}
    </div>
  );
}
