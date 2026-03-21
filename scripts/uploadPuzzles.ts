import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";

// ---------------------------------------------------------------------------
// Firebase Admin init
// ---------------------------------------------------------------------------
const serviceAccount = JSON.parse(
  readFileSync("./serviceAccountKey.json", "utf-8")
);

initializeApp({ credential: cert(serviceAccount) });

const db = getFirestore();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface PuzzleEvent {
  id: string;
  eventText: string;
  year: number;
  description: string;
  category: string;
  era: string;
  geography: string;
}

interface Puzzle {
  puzzleDate: string;
  puzzleNumber: number;
  events: PuzzleEvent[];
}

// ---------------------------------------------------------------------------
// Load puzzle data from JSON file
// ---------------------------------------------------------------------------
const raw = JSON.parse(readFileSync("./puzzles_30_days.json", "utf-8")) as Array<{
  puzzleDate: string;
  puzzleNumber: number;
  events: Array<Omit<PuzzleEvent, "id"> & { id: string | number }>;
}>;

// Normalise: ensure all event ids are strings and events are sorted by year
const PUZZLES: Puzzle[] = raw.map((puzzle) => ({
  ...puzzle,
  events: puzzle.events
    .map((event) => ({ ...event, id: String(event.id) }))
    .sort((a, b) => a.year - b.year),
}));

// ---------------------------------------------------------------------------
// Upload
// ---------------------------------------------------------------------------
async function uploadPuzzles() {
  console.log(`Uploading ${PUZZLES.length} puzzle(s)...\n`);

  let uploaded = 0;
  let skipped = 0;

  for (const puzzle of PUZZLES) {
    if (puzzle.events.length !== 10) {
      console.warn(
        `⚠  Skipping ${puzzle.puzzleDate} (#${puzzle.puzzleNumber}): expected 10 events, got ${puzzle.events.length}`
      );
      skipped++;
      continue;
    }

    await db.collection("puzzles").doc(puzzle.puzzleDate).set(puzzle);
    console.log(`✓  [${uploaded + 1}/${PUZZLES.length}] ${puzzle.puzzleDate}  —  puzzle #${puzzle.puzzleNumber}`);
    uploaded++;
  }

  console.log(`\nDone. ${uploaded} uploaded, ${skipped} skipped.`);
  process.exit(0);
}

uploadPuzzles().catch((err) => {
  console.error("Upload failed:", err);
  process.exit(1);
});
