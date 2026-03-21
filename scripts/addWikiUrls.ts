import fs from "fs";
import path from "path";

const PUZZLES_FILE = path.join(process.cwd(), "puzzles_30_days.json");
const DELAY_MS = 500;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWikiUrl(eventText: string): Promise<string | null> {
  const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(eventText)}&srlimit=1&format=json&origin=*`;
  const res = await fetch(url, {
    headers: { "User-Agent": "ChronologyDaily/1.0 (puzzle game; educational)" },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for "${eventText}"`);
  }
  const data = (await res.json()) as {
    query: { search: Array<{ title: string }> };
  };
  const results = data.query?.search;
  if (!results || results.length === 0) return null;
  const title = results[0].title;
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;
}

async function main() {
  const raw = fs.readFileSync(PUZZLES_FILE, "utf-8");
  const puzzles = JSON.parse(raw) as Array<{
    puzzleDate: string;
    puzzleNumber: number;
    events: Array<Record<string, unknown>>;
  }>;

  let totalEvents = 0;
  let found = 0;
  let nullCount = 0;

  for (const puzzle of puzzles) {
    for (const event of puzzle.events) {
      totalEvents++;
      const eventText = event.eventText as string;
      try {
        const wikiUrl = await fetchWikiUrl(eventText);
        event.wikiUrl = wikiUrl;
        if (wikiUrl) {
          found++;
          console.log(`[${totalEvents}] ✓ ${eventText}\n      → ${wikiUrl}`);
        } else {
          nullCount++;
          console.warn(`[${totalEvents}] ✗ No result for: "${eventText}"`);
        }
      } catch (err) {
        nullCount++;
        event.wikiUrl = null;
        console.error(`[${totalEvents}] ERROR for "${eventText}":`, err);
      }
      await sleep(DELAY_MS);
    }
  }

  fs.writeFileSync(PUZZLES_FILE, JSON.stringify(puzzles, null, 2), "utf-8");

  console.log(`\nDone. ${found}/${totalEvents} URLs found. ${nullCount} null.`);
  console.log(`Written back to ${PUZZLES_FILE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
