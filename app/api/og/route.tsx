import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

const SCORE_TIERS: {
  range: [number, number];
  image: string;
  rank: string;
}[] = [
  { range: [0, 1], image: "Caveman.jpg", rank: "Still figuring out fire" },
  { range: [2, 3], image: "Centurion.jpg", rank: "Wrong century, wrong continent" },
  { range: [4, 5], image: "Nun.jpg", rank: "Could probably bluff a pub quiz" },
  {
    range: [6, 7],
    image: "Explorer.jpg",
    rank: "Starting to worry my friends",
  },
  { range: [8, 9], image: "Commander.jpg", rank: "Borderline time traveller" },
  {
    range: [10, 10],
    image: "Archimedes.jpg",
    rank: "I might actually be a historian",
  },
];

function getTier(score: number) {
  return (
    SCORE_TIERS.find((t) => score >= t.range[0] && score <= t.range[1]) ??
    SCORE_TIERS[0]
  );
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const date = searchParams.get("date") ?? "";
  const score = Math.min(10, Math.max(0, Number(searchParams.get("score")) || 0));
  const results = (searchParams.get("results") ?? "").padEnd(10, "0").slice(0, 10);

  const tier = getTier(score);
  const formattedDate = formatDate(date);

  // Try to load background image
  const baseUrl = req.nextUrl.origin;
  let bgImageSrc: string | null = null;
  try {
    const imgRes = await fetch(`${baseUrl}/og/${tier.image}`);
    if (imgRes.ok) {
      const buf = await imgRes.arrayBuffer();
      bgImageSrc = `data:image/jpeg;base64,${Buffer.from(buf).toString("base64")}`;
    }
  } catch {
    // fallback to no background
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          position: "relative",
          backgroundColor: "#1a1a1a",
        }}
      >
        {/* Background image */}
        {bgImageSrc && (
          <img
            src={bgImageSrc}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 1200,
              height: 630,
              objectFit: "cover",
            }}
          />
        )}

        {/* Dark gradient overlay */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 1200,
            height: 630,
            background:
              "linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,0.15) 25%, rgba(0,0,0,0.55) 50%, rgba(0,0,0,0.82) 100%)",
          }}
        />

        {/* Text overlay — right 52% */}
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
          {/* Main content block */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            {/* Hook */}
            <div
              style={{
                fontSize: 12,
                textTransform: "uppercase" as const,
                letterSpacing: "1.5px",
                color: "rgba(255,255,255,0.55)",
                marginBottom: 8,
              }}
            >
              HOW GOOD&apos;S YOUR HISTORY?
            </div>

            {/* Date */}
            <div
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.4)",
                marginBottom: 28,
              }}
            >
              {formattedDate}
            </div>

            {/* Score */}
            <div
              style={{
                fontSize: 36,
                fontWeight: 500,
                color: "white",
                marginBottom: 10,
              }}
            >
              I got {score}/10
            </div>

            {/* Rank line */}
            <div
              style={{
                fontSize: 16,
                fontStyle: "italic",
                color: "rgba(255,255,255,0.8)",
                fontFamily: "serif",
                marginBottom: 20,
              }}
            >
              {tier.rank}
            </div>

            {/* Emoji dots */}
            <div
              style={{
                display: "flex",
                gap: 3,
              }}
            >
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

          {/* Footer block */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            {/* URL */}
            <div
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: "rgba(255,255,255,0.45)",
                marginBottom: 4,
              }}
            >
              chronologydaily.com
            </div>

            {/* Tagline */}
            <div
              style={{
                fontSize: 10,
                color: "rgba(255,255,255,0.3)",
              }}
            >
              A new history puzzle every day
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    }
  );
}
