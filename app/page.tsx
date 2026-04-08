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
import { trackEvent } from "@/lib/analytics";
import PwaInstallPrompt from "@/components/PwaInstallPrompt";

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
const SUBMISSION_PREFIX = "chronology_submission_";

interface SavedProgress {
  shuffledIds: string[];
  timelineIds: string[];
  nextIndex: number;
  gameStartTime: number;
}

function progressKey(date: string) {
  return `${PROGRESS_PREFIX}${date}`;
}

function submissionKey(date: string) {
  return `${SUBMISSION_PREFIX}${date}`;
}

function loadSubmittedOrderIds(date: string): string[] | null {
  try {
    const raw = localStorage.getItem(submissionKey(date));
    return raw ? (JSON.parse(raw) as string[]) : null;
  } catch {
    return null;
  }
}

function saveSubmittedOrderIds(date: string, ids: string[]) {
  try {
    localStorage.setItem(submissionKey(date), JSON.stringify(ids));
  } catch { /* ignore */ }
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
  try { localStorage.removeItem(progressKey(date)); } catch { /* ignore */ }
}

function cleanOldProgress(currentDate: string) {
  try {
    for (const key of Object.keys(localStorage)) {
      if (
        (key.startsWith(PROGRESS_PREFIX) && key !== progressKey(currentDate)) ||
        (key.startsWith(SUBMISSION_PREFIX) && key !== submissionKey(currentDate))
      ) {
        localStorage.removeItem(key);
      }
    }
  } catch { /* unavailable */ }
}

// ── Shared dark header ────────────────────────────────────────────────────────

function PageHeader({ subtitle }: { subtitle?: string }) {
  return (
    <div className="bg-[#2C2C2A] px-5 pt-3 pb-3 flex-shrink-0">
      <h1 className="text-center text-[20px] font-serif text-[#F1EFE8] leading-none">
        Chronology Daily
      </h1>
      {subtitle && (
        <p className="text-center text-[12px] text-[#B4B2A9] mt-1 leading-none">
          {subtitle}
        </p>
      )}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Home() {
  const [puzzle, setPuzzle] = useState<PuzzleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"playing" | "results">("playing");
  const [positions, setPositions] = useState<boolean[] | null>(null);
  const [submittedOrder, setSubmittedOrder] = useState<HistoricalEvent[] | null>(null);
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

        // ── Analytics: app_visit with retention tracking ──
        try {
          const FIRST_VISIT_KEY = "first_visit_date";
          const today = puzzleData.puzzleDate;
          let firstVisit = localStorage.getItem(FIRST_VISIT_KEY);
          if (!firstVisit) {
            localStorage.setItem(FIRST_VISIT_KEY, today);
            firstVisit = today;
          }
          const daysSince = Math.round(
            (new Date(today).getTime() - new Date(firstVisit).getTime()) / 86400000
          );
          trackEvent("app_visit", { days_since_first_visit: daysSince });
        } catch { /* localStorage unavailable */ }

        try {
          const existing = await fetchTodaysResult(uid, puzzleData.puzzleDate);
          if (existing) {
            setPositions(existing.positions);
            const savedIds = loadSubmittedOrderIds(puzzleData.puzzleDate);
            if (savedIds && savedIds.length === puzzleData.events.length) {
              const byId = Object.fromEntries(puzzleData.events.map((e) => [e.id, e]));
              const restored = savedIds.map((id) => byId[id]).filter(Boolean) as HistoricalEvent[];
              if (restored.length === puzzleData.events.length) {
                setSubmittedOrder(restored);
              }
            }
            setPhase("results");
            return;
          }
        } catch { /* let them play */ }

        const saved = loadProgress(puzzleData.puzzleDate);
        if (saved && saved.shuffledIds.length === puzzleData.events.length) {
          const byId = Object.fromEntries(puzzleData.events.map((e) => [e.id, e]));
          const restoredShuffled = saved.shuffledIds.map((id) => byId[id]).filter(Boolean) as HistoricalEvent[];
          const restoredTimeline = saved.timelineIds.map((id) => byId[id]).filter(Boolean) as HistoricalEvent[];
          if (restoredShuffled.length === puzzleData.events.length && restoredTimeline.length > 0) {
            setShuffledEvents(restoredShuffled);
            setInitialTimeline(restoredTimeline);
            setInitialNextIndex(saved.nextIndex);
            gameStartTime.current = saved.gameStartTime;
            return;
          }
        }

        setShuffledEvents(shuffleArray(puzzleData.events));
        trackEvent("puzzle_started", { date: puzzleData.puzzleDate });
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

    // originalEvents is the correct chronological order from Firestore,
    // untouched by shuffling. Compare by eventText — unique per event,
    // immune to ID type coercion and ordering of the source JSON.
    const originalEvents = puzzle.events;

    const newPositions = originalEvents.map((correctEvent, i) => {
      const playerEvent = orderedEvents[i];
      const match = playerEvent?.eventText === correctEvent.eventText;
      console.log(
        `[Position ${i + 1}] Player: "${playerEvent?.eventText}" | Correct: "${correctEvent.eventText}" | ${match ? "✓ CORRECT" : "✗ WRONG"}`
      );
      return match;
    });

    const score = newPositions.filter(Boolean).length;
    console.log(`[Score] ${score}/${originalEvents.length}`);

    const timeToComplete = Math.round((Date.now() - gameStartTime.current) / 1000);
    const resultsString = newPositions.map((p) => (p ? "1" : "0")).join("");
    trackEvent("puzzle_completed", {
      date: puzzle.puzzleDate,
      score,
      results: resultsString,
      time_seconds: timeToComplete,
    });
    setPositions(newPositions);
    setSubmittedOrder(orderedEvents);
    saveSubmittedOrderIds(puzzle.puzzleDate, orderedEvents.map((e) => e.id));
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
      <main className="flex-1 flex flex-col min-h-0 w-full max-w-md mx-auto">

        {/* Loading */}
        {loading && (
          <>
            <PageHeader />
            <div className="flex-1 flex flex-col items-center justify-center gap-2">
              <div className="w-6 h-6 border-2 border-[#D3D1C7] border-t-[#854F0B] rounded-full animate-spin" />
              <p className="text-[12px] text-[#B4B2A9]">Loading today&apos;s puzzle…</p>
            </div>
          </>
        )}

        {/* Error */}
        {!loading && fetchError && (
          <>
            <PageHeader />
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
              <p className="text-4xl mb-3">📅</p>
              <p className="text-sm text-[#2C2C2A]">{fetchError}</p>
            </div>
          </>
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
            submittedOrder={submittedOrder ?? undefined}
            positions={positions}
            puzzleNumber={puzzle.puzzleNumber}
            puzzleDate={puzzle.puzzleDate}
          />
        )}

      </main>

      {!loading && (
        <footer className="text-center py-2.5 text-[11px] text-[#B4B2A9] flex-shrink-0">
          A new puzzle every day
        </footer>
      )}

      <PwaInstallPrompt />
    </div>
  );
}
