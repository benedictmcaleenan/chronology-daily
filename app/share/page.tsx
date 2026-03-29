import type { Metadata } from "next";

const SCORE_TIERS: { range: [number, number]; rank: string }[] = [
  { range: [0, 1], rank: "Still figuring out fire" },
  { range: [2, 3], rank: "Wrong century, wrong continent" },
  { range: [4, 5], rank: "Could probably bluff a pub quiz" },
  { range: [6, 7], rank: "Starting to worry my friends" },
  { range: [8, 9], rank: "Borderline time traveller" },
  { range: [10, 10], rank: "I might actually be a historian" },
];

function getRank(score: number) {
  return (
    SCORE_TIERS.find((t) => score >= t.range[0] && score <= t.range[1])
      ?.rank ?? ""
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

type Props = {
  searchParams: Promise<{ date?: string; score?: string; results?: string }>;
};

export async function generateMetadata({
  searchParams,
}: Props): Promise<Metadata> {
  const params = await searchParams;
  const date = params.date ?? "";
  const score = Math.min(
    10,
    Math.max(0, Number(params.score) || 0)
  );
  const results = (params.results ?? "").padEnd(10, "0").slice(0, 10);
  const rank = getRank(score);
  const formattedDate = formatDate(date);

  const title = `Chronology Daily — ${formattedDate}`;
  const description = `I got ${score}/10 — ${rank}. Can you beat me?`;
  const ogImage = `https://www.chronologydaily.com/api/og?date=${date}&score=${score}&results=${results}`;

  return {
    title,
    description,
    openGraph: {
      type: "website",
      title,
      description,
      images: [{ url: ogImage, width: 1200, height: 630 }],
      url: "https://www.chronologydaily.com",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function SharePage({ searchParams }: Props) {
  const params = await searchParams;
  const date = params.date ?? "";
  const score = Math.min(
    10,
    Math.max(0, Number(params.score) || 0)
  );
  const results = (params.results ?? "").padEnd(10, "0").slice(0, 10);
  const rank = getRank(score);
  const formattedDate = formatDate(date);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <main className="flex-1 flex flex-col items-center justify-center w-full max-w-md mx-auto px-6 text-center">
        {/* Header */}
        <h1 className="text-[24px] font-serif text-[#2C2C2A] mb-1">
          Chronology Daily
        </h1>
        <p className="text-[12px] text-[#B4B2A9] mb-6">{formattedDate}</p>

        {/* Score */}
        <div className="mb-2">
          <span className="text-[48px] font-serif text-[#2C2C2A]">
            {score}
          </span>
          <span className="text-[48px] font-serif text-[#B4B2A9]">/10</span>
        </div>

        {/* Emoji dots */}
        <div className="flex gap-[3px] justify-center mb-3">
          {results.split("").map((r, i) => (
            <div
              key={i}
              className={`w-[14px] h-[14px] rounded-[2px] ${
                r === "1" ? "bg-[#4CAF50]" : "bg-[#E53935]"
              }`}
            />
          ))}
        </div>

        {/* Rank */}
        <p className="text-[16px] italic font-serif text-[#6B6B65] mb-8">
          {rank}
        </p>

        {/* CTA */}
        <a
          href="/"
          className="inline-block bg-[#2C2C2A] hover:bg-[#3E3E3B] text-[#F1EFE8] text-[14px] font-medium py-3 px-8 rounded-[8px] transition-colors"
        >
          Play today&apos;s puzzle
        </a>
      </main>

      <footer className="text-center py-2.5 text-[11px] text-[#B4B2A9]">
        A new puzzle every day
      </footer>
    </div>
  );
}
