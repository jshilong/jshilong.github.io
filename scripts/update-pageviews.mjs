import fs from "node:fs/promises";

const ANALYTICS_URL = "https://clustrmaps.com/site/1b50n";
const OUT_PATH = "data/pageviews.json";

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
    },
  });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  return await res.text();
}

function parseTotalPageviews(html) {
  // The page renders digits separated by spaces in some cases; normalize first.
  const compact = html.replace(/\s+/g, " ");
  // Prefer the explicit "Total Pageviews ... Since ..." segment.
  const m = compact.match(/Total\s*Pageviews\s*([0-9][0-9,\s]*[0-9])\s*Since/i);
  if (!m) return null;
  const digits = m[1].replace(/[^\d]/g, "");
  const v = Number(digits);
  if (!Number.isFinite(v) || v <= 0) return null;
  return v;
}

async function main() {
  const html = await fetchText(ANALYTICS_URL);
  const total = parseTotalPageviews(html);
  if (!total) throw new Error("Could not parse Total Pageviews");

  let prev = null;
  try {
    prev = JSON.parse(await fs.readFile(OUT_PATH, "utf8"));
  } catch {
    // ignore
  }

  const next = {
    totalPageviews: total,
    since: "2020-03-10",
    source: ANALYTICS_URL,
    updatedAt: new Date().toISOString(),
  };

  const changed = !prev || prev.totalPageviews !== next.totalPageviews;
  await fs.mkdir("data", { recursive: true });
  await fs.writeFile(OUT_PATH, JSON.stringify(next, null, 2) + "\n", "utf8");

  console.log(
    `Total Pageviews: ${total}${changed ? " (updated)" : " (unchanged)"}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

