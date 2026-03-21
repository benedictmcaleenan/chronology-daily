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

// ── Helpers ───────────────────────────────────────────────────────────────────

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
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

  const [shuffledEvents, setShuffledEvents] = useState<HistoricalEvent[]>([]);
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

        cleanOldProgress(puzzleData.puzzleDate);

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

        const saved = loadProgress(puzzleData.puzzleDate);
        if (saved && saved.shuffledIds.length === puzzleData.events.length) {
          const byId = Object.fromEntries(puzzleData.events.map((e) => [e.id, e]));
          const restoredShuffled = saved.shuffledIds
            .map((id) => byId[id])
            .filter(Boolean) as HistoricalEvent[];
          const restoredTimeline = saved.timelineIds
            .map((id) => byId[id])
            .filter(Boolean) as HistoricalEvent[];

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
    } catch { /* fail silently */ }
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

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* ── Title bar ─────────────────────────────────────────────────── */}
      <div className="px-5 pt-3 pb-0">
        <h1 className="text-xl font-medium text-center text-[#111] tracking-[0.01em]">
          Chronology Daily
        </h1>
        <div className="mt-2.5 h-[2px] bg-[#111]" />
      </div>

      {/* ── Main content ──────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col px-5 min-h-0">
        {/* Loading */}
        {loading && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <div className="w-7 h-7 border-2 border-[#ddd] border-t-[#111] rounded-full animate-spin" />
            <p className="text-[12px] text-[#888]">Loading today&apos;s puzzle…</p>
          </div>
        )}

        {/* Error */}
        {!loading && fetchError && (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <p className="text-4xl mb-3">📅</p>
            <p className="text-sm text-[#444]">{fetchError}</p>
          </div>
        )}

        {/* Game */}
        {!loading && puzzle && phase === "playing" && shuffledEvents.length > 0 && (
          <GameBoard
            events={shuffledEvents}
            puzzleNumber={puzzle.puzzleNumber}
            onSubmit={handleSubmit}
            onProgress={handleProgress}
            initialTimeline={initialTimeline}
            initialNextIndex={initialNextIndex}
          />
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

      {/* ── Footer ────────────────────────────────────────────────────── */}
      {!loading && (
        <footer className="text-center py-2.5 text-[11px] text-[#888]">
          A new puzzle every day
        </footer>
      )}
    </div>
  );
}
