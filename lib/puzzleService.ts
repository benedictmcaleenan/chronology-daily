import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { HistoricalEvent } from "@/components/GameBoard";

export interface PuzzleData {
  puzzleDate: string;
  puzzleNumber: number;
  events: HistoricalEvent[];
}

export interface GameResult {
  puzzleDate: string;
  puzzleNumber: number;
  userId: string;
  score: number;
  positions: boolean[]; // positions[i] is true if event i (in correct order) was placed correctly
  timeToComplete: number; // seconds from page load to submit
  completedAt: unknown; // Firestore server timestamp
}

/** Returns today's date as a YYYY-MM-DD string in the user's local timezone. */
export function todayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function fetchTodaysPuzzle(): Promise<PuzzleData | null> {
  const snap = await getDoc(doc(db, "puzzles", todayDateString()));
  if (!snap.exists()) return null;
  const data = snap.data() as PuzzleData;
  // Ensure event IDs are always strings — guards against numeric IDs in source JSON
  data.events = data.events.map((e) => ({ ...e, id: String(e.id) }));
  return data;
}

export async function saveResult(data: Omit<GameResult, "completedAt">): Promise<void> {
  const docId = `${data.puzzleDate}_${data.userId}`;
  await setDoc(doc(db, "results", docId), {
    ...data,
    completedAt: serverTimestamp(),
  });
}

export async function fetchTodaysResult(
  userId: string,
  puzzleDate: string
): Promise<GameResult | null> {
  const docId = `${puzzleDate}_${userId}`;
  const snap = await getDoc(doc(db, "results", docId));
  if (!snap.exists()) return null;
  return snap.data() as GameResult;
}
