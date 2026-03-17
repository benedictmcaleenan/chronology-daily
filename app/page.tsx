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

  // Record when the page loaded — used to calculate timeToComplete
  const gameStartTime = useRef<number>(Date.now());

  useEffect(() => {
    async function init() {
      try {
        // 1. Ensure anonymous auth — get uid
        const uid = await ensureAnonymousAuth();
        setUserId(uid);

        // 2. Fetch today's puzzle
        const puzzleData = await fetchTodaysPuzzle();
        if (!puzzleData) {
          setFetchError("No puzzle available for today. Check back tomorrow!");
          return;
        }
        setPuzzle(puzzleData);

        // 3. Check if this user already played today
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

  // Shuffle once when puzzle loads (stable for the session)
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

    // Save to Firestore (non-blocking)
    saveResult({
      puzzleDate: puzzle.puzzleDate,
      puzzleNumber: puzzle.puzzleNumber,
      userId,
      score,
      positions: newPositions,
      timeToComplete,
    }).catch(console.error);
  }

  const subtitle = puzzle
    ? phase === "playing"
      ? "Arrange 10 events from oldest to newest"
      : `Puzzle #${puzzle.puzzleNumber} · ${formatDate(puzzle.puzzleDate)}`
    : "";

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 pt-6 pb-4">
        {/* Header */}
        <header className="text-center mb-6">
          <h1 className="text-2xl font-black tracking-tight text-gray-900">
            Chronology Daily
          </h1>
          <p className="text-gray-500 text-sm mt-1">{subtitle}</p>
        </header>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-8 h-8 border-4 border-indigo-100 border-t-indigo-500 rounded-full animate-spin" />
            <p className="text-sm text-gray-400">Loading today's puzzle…</p>
          </div>
        )}

        {/* Error */}
        {!loading && fetchError && (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">📅</p>
            <p className="text-gray-700 font-medium">{fetchError}</p>
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
          />
        )}
      </div>
    </main>
  );
}
