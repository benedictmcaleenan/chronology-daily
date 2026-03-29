import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

const SCORE_TIERS = [
  { min: 0, max: 1, image: "Caveman.jpg", rank: "Still figuring out fire" },
  { min: 2, max: 3, image: "Centurion.jpg", rank: "Wrong century, wrong continent" },
  { min: 4, max: 5, image: "Nun.jpg", rank: "Could probably bluff a pub quiz" },
  { min: 6, max: 7, image: "Explorer.jpg", rank: "Starting to worry my friends" },
  { min: 8, max: 9, image: "Commander.jpg", rank: "Borderline time traveller" },
  { min: 10, max: 10, image: "Archimedes.jpg", rank: "I might actually be a historian" },
];

function getTier(score: number) {
  return SCORE_TIERS.find((t) => score >= t.min && score <= t.max) ?? SCORE_TIERS[0];
}

function formatDate(dateStr: string): string {
  const parts = dateStr.split("-");
  const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const date = sp.get("date") || "";
  const score = Math.min(10, Math.max(0, Number(sp.get("score")) || 0));
  const results = (sp.get("results") || "").padEnd(10, "0").slice(0, 10);

  const tier = getTier(score);
  const formattedDate = formatDate(date);

  // Read background image
  let bgSrc: ArrayBuffer | null = null;
  try {
    const imgRes = await fetch(new URL(`/og/${tier.image}`, req.nextUrl.origin));
    if (imgRes.ok) bgSrc = await imgRes.arrayBuffer();
  } catch { /* no bg */ }

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", backgroundColor: "#1a1a1a" }}>
        {/* Background image */}
        {bgSrc && (
          <img
            src={bgSrc as unknown as string}
            width={1200}
            height={630}
            style={{ position: "absolute", top: 0, left: 0, objectFit: "cover" }}
          />
        )}

        {/* Gradient overlay */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,0.15) 25%, rgba(0,0,0,0.55) 50%, rgba(0,0,0,0.82) 100%)",
            display: "flex",
          }}
        />

        {/* Text panel — right side */}
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: "52%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "48px 48px 40px 0",
          }}
        >
          {/* Top content */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 12, letterSpacing: 1.5, color: "rgba(255,255,255,0.55)", marginBottom: 8 }}>
              HOW GOOD&#39;S YOUR HISTORY?
            </span>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 28 }}>
              {formattedDate}
            </span>
            <span style={{ fontSize: 36, fontWeight: 500, color: "white", marginBottom: 10 }}>
              I got {score}/10
            </span>
            <span style={{ fontSize: 16, fontStyle: "italic", color: "rgba(255,255,255,0.8)", marginBottom: 20 }}>
              {tier.rank}
            </span>
            <div style={{ display: "flex", gap: 3 }}>
              {results.split("").map((r, i) => (
                <div
                  key={i}
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 2,
                    backgroundColor: r === "1" ? "#4CAF50" : "#E53935",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Footer */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.45)", marginBottom: 4 }}>
              chronologydaily.com
            </span>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
              A new history puzzle every day
            </span>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: { "Cache-Control": "public, max-age=31536000, immutable" },
    }
  );
}
