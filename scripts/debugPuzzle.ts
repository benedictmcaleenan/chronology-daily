import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";

const serviceAccount = JSON.parse(readFileSync("./serviceAccountKey.json", "utf-8"));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const DATE = "2026-03-18";

async function main() {
  // ── 1. Fetch the raw Firestore document ──────────────────────────────────
  const snap = await db.collection("puzzles").doc(DATE).get();
  if (!snap.exists) { console.error("No puzzle document for", DATE); process.exit(1); }

  const data = snap.data()!;
  const events: Array<{ id: unknown; year: number; eventText: string }> = data.events;

  console.log(`\n── Firestore document: puzzles/${DATE} ──────────────────────────`);
  console.log(`puzzleDate:   ${data.puzzleDate}`);
  console.log(`puzzleNumber: ${data.puzzleNumber}`);
  console.log(`events count: ${events.length}\n`);

  console.log("Events as returned from Firestore (index → id type, id value, year, text):");
  events.forEach((e, i) => {
    const idType = typeof e.id;
    console.log(`  [${i}] id=${JSON.stringify(e.id)} (${idType})  year=${e.year}  "${e.eventText}"`);
  });

  // ── 2. Check chronological order ────────────────────────────────────────
  console.log("\n── Chronological order check ────────────────────────────────────");
  let outOfOrder = false;
  for (let i = 1; i < events.length; i++) {
    if (events[i].year < events[i - 1].year) {
      console.log(`  ✗ Index ${i - 1} (year ${events[i - 1].year}) > index ${i} (year ${events[i].year}) — OUT OF ORDER`);
      outOfOrder = true;
    }
  }
  if (!outOfOrder) console.log("  ✓ Events are in strict chronological order in Firestore");

  // ── 3. Simulate the scoring logic exactly as in page.tsx ────────────────
  console.log("\n── Scoring simulation (perfect chronological submission) ─────────");

  // Normalize IDs to strings, just as fetchTodaysPuzzle does
  const puzzleEvents = events.map(e => ({ ...e, id: String(e.id) }));

  // Sort by year — this is what a "perfect" player submission looks like
  const perfectOrder = [...puzzleEvents].sort((a, b) => a.year - b.year);

  console.log("puzzle.events (Firestore order, IDs as strings):");
  puzzleEvents.forEach((e, i) => console.log(`  [${i}] id="${e.id}"  year=${e.year}`));

  console.log("\nperfectOrder (sorted by year ascending — what a correct player submits):");
  perfectOrder.forEach((e, i) => console.log(`  [${i}] id="${e.id}"  year=${e.year}`));

  console.log("\nScoring comparison (orderedEvents[i].id === puzzle.events[i].id):");
  const positions = puzzleEvents.map((event, i) => {
    const submitted = perfectOrder[i];
    const match = submitted?.id === event.id;
    console.log(`  [${i}] submitted.id="${submitted?.id}" === stored.id="${event.id}" → ${match ? "✓ CORRECT" : "✗ WRONG"}`);
    return match;
  });

  const score = positions.filter(Boolean).length;
  console.log(`\n  Score: ${score}/10`);

  if (score < 10) {
    console.log("\n  ⚠ BUG CONFIRMED: perfect chronological order scores less than 10");
    console.log("  Root cause: puzzle.events in Firestore is NOT in chronological order.");
    console.log("  Fix: sort events by year before storing, or sort them server-side before scoring.");
  } else {
    console.log("\n  ✓ Scoring logic is correct for a perfect submission.");
    console.log("  The bug may be in the client ID type mismatch or elsewhere.");
  }

  // ── 4. Check ID type consistency ────────────────────────────────────────
  console.log("\n── ID type check (raw Firestore vs normalized) ──────────────────");
  events.forEach((e, i) => {
    const raw = e.id;
    const normalized = String(e.id);
    if (typeof raw !== "string") {
      console.log(`  ⚠ [${i}] id is ${typeof raw} in Firestore: ${JSON.stringify(raw)} → normalized: "${normalized}"`);
    }
  });
  const allStrings = events.every(e => typeof e.id === "string");
  if (allStrings) console.log("  ✓ All IDs are already strings in Firestore");

  // ── 5. List existing result documents for this date ──────────────────────
  console.log(`\n── Existing result documents for ${DATE} ─────────────────────────`);
  const results = await db.collection("results")
    .where("puzzleDate", "==", DATE)
    .get();
  if (results.empty) {
    console.log("  (none)");
  } else {
    results.forEach(doc => {
      const d = doc.data();
      console.log(`  ${doc.id}  score=${d.score}  positions=${JSON.stringify(d.positions)}`);
    });
  }

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
