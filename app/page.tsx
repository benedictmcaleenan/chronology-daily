"use client";

import { useEffect, useRef, useState } from "react";
import { ensureAnonymousAuth } from "@/lib/firebase";
import {
  fetchTodaysPuzzle,
  fetchTodaysResult,
  saveResult,
  PuzzleData,
} from "@/lib/puzzleService";
import GameBoard, { HistoricalEvent } from "@/components/GameBoard";
import ResultsView from "@/components/ResultsView";

// ── Helpers ──────────────────────────────────────────────────────────────────

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

// ── localStorage progress ─────────────────────────────────────────────────────

const PROGRESS_PREFIX = "chronology_progress_";

interface SavedProgress {
  shuffledIds: string[];
  timelineIds: string[];
  nextIndex: number;
  gameStartTime: number;
}

function progressKey(date: string) {
  return `${PROGRESS_PREFIX}${date}`;
}

function loadProgress(date: string): SavedProgress | null {
  try {
    const raw = localStorage.getItem(progressKey(date));
    return raw ? (JSON.parse(raw) as SavedProgress) : null;
  } catch {
    return null;
  }
}

function deleteProgress(date: string) {
  try {
    localStorage.removeItem(progressKey(date));
  } catch { /* ignore */ }
}

function cleanOldProgress(currentDate: string) {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(PROGRESS_PREFIX) && key !== progressKey(currentDate)) {
        localStorage.removeItem(key);
      }
    }
  } catch { /* localStorage may be unavailable */ }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Home() {
  const [puzzle, setPuzzle] = useState<PuzzleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"playing" | "results">("playing");
  const [positions, setPositions] = useState<boolean[] | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Shuffled event order — either restored from localStorage or freshly shuffled
  const [shuffledEvents, setShuffledEvents] = useState<HistoricalEvent[]>([]);
  // Restored mid-game state (undefined = start fresh)
  const [initialTimeline, setInitialTimeline] = useState<HistoricalEvent[] | undefined>(undefined);
  const [initialNextIndex, setInitialNextIndex] = useState<number | undefined>(undefined);

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

        // Clean up localStorage entries for previous dates
        cleanOldProgress(puzzleData.puzzleDate);

        // Check if already completed today
        try {
          const existing = await fetchTodaysResult(uid, puzzleData.puzzleDate);
          if (existing) {
            setPositions(existing.positions);
            setPhase("results");
            return;
          }
        } catch {
          // Can't verify — let them play
        }

        // Check for in-progress save
        const saved = loadProgress(puzzleData.puzzleDate);
        if (saved && saved.shuffledIds.length === puzzleData.events.length) {
          const byId = Object.fromEntries(puzzleData.events.map((e) => [e.id, e]));
          const restoredShuffled = saved.shuffledIds
            .map((id) => byId[id])
            .filter(Boolean) as HistoricalEvent[];
          const restoredTimeline = saved.timelineIds
            .map((id) => byId[id])
            .filter(Boolean) as HistoricalEvent[];

          // Only restore if all IDs resolved (guards against stale saves after a puzzle update)
          if (
            restoredShuffled.length === puzzleData.events.length &&
            restoredTimeline.length > 0
          ) {
            setShuffledEvents(restoredShuffled);
            setInitialTimeline(restoredTimeline);
            setInitialNextIndex(saved.nextIndex);
            gameStartTime.current = saved.gameStartTime;
            return;
          }
        }

        // Fresh game
        setShuffledEvents(shuffleArray(puzzleData.events));
      } catch {
        setFetchError("Failed to load. Please refresh.");
      } finally {
        setLoading(false);
      }
    }

    init();
  }, []);

  function handleProgress(timeline: HistoricalEvent[], nextIndex: number) {
    if (!puzzle || shuffledEvents.length === 0) return;
    try {
      localStorage.setItem(
        progressKey(puzzle.puzzleDate),
        JSON.stringify({
          shuffledIds: shuffledEvents.map((e) => e.id),
          timelineIds: timeline.map((e) => e.id),
          nextIndex,
          gameStartTime: gameStartTime.current,
        } satisfies SavedProgress)
      );
    } catch { /* localStorage full or unavailable — fail silently */ }
  }

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

    // Progress is no longer needed once the game is complete
    deleteProgress(puzzle.puzzleDate);

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
      <header className="bg-slate-900 text-white">
        <div className="max-w-lg mx-auto px-4 py-4 text-center">
          <h1 className="text-2xl font-black tracking-tight leading-none">
            Chronology Daily
          </h1>
          <p className="text-slate-400 text-sm mt-1">{headerLine2}</p>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-5">
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-9 h-9 border-4 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
            <p className="text-sm text-slate-400">Loading today&apos;s puzzle…</p>
          </div>
        )}

        {!loading && fetchError && (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">📅</p>
            <p className="text-slate-700 font-medium">{fetchError}</p>
          </div>
        )}

        {!loading && puzzle && phase === "playing" && shuffledEvents.length > 0 && (
          <GameBoard
            events={shuffledEvents}
            onSubmit={handleSubmit}
            onProgress={handleProgress}
            initialTimeline={initialTimeline}
            initialNextIndex={initialNextIndex}
          />
        )}

        {!loading && puzzle && phase === "results" && positions && (
          <ResultsView
            correctOrder={puzzle.events}
            positions={positions}
            puzzleNumber={puzzle.puzzleNumber}
            puzzleDate={puzzle.puzzleDate}
          />
        )}
      </main>

      {!loading && (
        <footer className="text-center py-4 text-slate-400 text-xs border-t border-slate-100">
          A new puzzle every day
        </footer>
      )}
    </div>
  );
}
