/**
 * SUMMARY — Overview of all optimization steps
 *
 * Reads stats.md from each step and outputs:
 * - Comparison table with all steps
 * - ASCII bar chart of tokens
 * - Total savings vs baseline
 */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

interface StepData {
  name: string;
  shortName: string;
  totalTokens: number;
  costUSD: number;
  elapsedS: number;
  coverage: string;
}

async function parseStats(statsPath: string): Promise<{
  tokens: number;
  cost: number;
  elapsed: number;
  coverage: string;
} | null> {
  try {
    const content = await readFile(
      path.resolve(process.cwd(), statsPath),
      "utf8",
    );

    // tokens: TOTAL tokens** | **X** or TOTAL row
    let tokensMatch = content.match(/TOTAL tokens\*\*\s*\|\s*\*\*([\d,]+)/);
    if (!tokensMatch)
      tokensMatch = content.match(
        /\*\*TOTAL\*\*\s*\|[^|]*\|[^|]*\|[^|]*\|\s*\*\*([\d,]+)\*\*/,
      );
    const tokens = parseInt((tokensMatch?.[1] ?? "0").replace(/,/g, ""), 10);

    // cost: Cost** | **$X** or TOTAL row
    let costMatch = content.match(/Cost\*\*\s*\|\s*\*\*\$([\d.]+)/);
    if (!costMatch)
      costMatch = content.match(
        /\*\*TOTAL\*\*\s*\|[^|]*\|[^|]*\|[^|]*\|[^|]*\|\s*\*\*\$([\d.]+)\*\*/,
      );
    const cost = parseFloat(costMatch?.[1] ?? "0");

    // elapsed: "Total:** Xs" or simple "X.Xs\n"
    let elapsedMatch = content.match(/Total:\*\*\s*([\d.]+)s/);
    if (!elapsedMatch)
      elapsedMatch = content.match(/## Response time\n([\d.]+)s/);
    const elapsed = parseFloat(elapsedMatch?.[1] ?? "0");

    // coverage: "Coverage: X/Y tickets" or perfect coverage
    const coverageMatch = content.match(/Coverage:\s*(\d+\/\d+)/);
    let coverage = coverageMatch?.[1] ?? "";
    if (!coverage && /perfectly match/i.test(content)) {
      const refMatch = content.match(/Reference tickets[^:]*:\*\*\s*(\d+)/);
      const ref = refMatch?.[1] ?? "19";
      coverage = `${ref}/${ref}`;
    }

    return { tokens, cost, elapsed, coverage };
  } catch {
    return null;
  }
}

function bar(value: number, max: number, width: number = 36): string {
  const filled = Math.round((value / max) * width);
  return "█".repeat(filled) + "░".repeat(width - filled);
}

function fmt(n: number): string {
  return n.toLocaleString("pl-PL");
}

async function main() {
  const steps = [
    {
      path: "presentation/step-01-no-optimization/output/stats.md",
      name: "Step 01 \u2014 PL, no opt., gpt-5.5",
      short: "01 PL no opt.",
    },
    {
      path: "presentation/step-02-english/output/stats.md",
      name: "Step 02 \u2014 EN prompt, gpt-5.5",
      short: "02 EN prompt",
    },
    {
      path: "presentation/step-03-js-filtering/output/stats.md",
      name: "Step 03 \u2014 JS row filter, gpt-5.5",
      short: "03 JS filter",
    },
    {
      path: "presentation/step-04-model-routing/output/stats.md",
      name: "Step 04 — Model routing",
      short: "04 Routing",
    },
    {
      path: "presentation/step-05-trim-columns/output/stats.md",
      name: "Step 05 \u2014 Column trim (3/14)",
      short: "05 Col trim",
    },
    {
      path: "presentation/step-06-prompt-compression/output/stats.md",
      name: "Step 06 \u2014 Prompt compression",
      short: "06 Compression",
    },
    {
      path: "presentation/step-07-pipe-separated-input/output/stats.md",
      name: "Step 07 — Pipe-separated input",
      short: "07 Pipe format",
    },
    {
      path: "presentation/step-08-truncate-description/output/stats.md",
      name: "Step 08 — Truncate description",
      short: "08 Truncation",
    },
  ];

  const data: StepData[] = [];
  for (const s of steps) {
    const parsed = await parseStats(s.path);
    if (parsed && parsed.tokens > 0) {
      data.push({
        name: s.name,
        shortName: s.short,
        totalTokens: parsed.tokens,
        costUSD: parsed.cost,
        elapsedS: parsed.elapsed,
        coverage: parsed.coverage,
      });
    }
  }

  if (data.length === 0) {
    console.log(
      "No data \u2014 run the steps first (npm run step-01 ... step-07)",
    );
    return;
  }

  const baseline = data[0];
  const maxTokens = Math.max(...data.map((d) => d.totalTokens));

  const LINE = "═".repeat(100);
  const line = "─".repeat(100);

  console.log("\n" + LINE);
  console.log(" TOKEN OPTIMIZATION SUMMARY — ALL STEPS");
  console.log(LINE);

  // ── TABELA ────────────────────────────────────────────────────────────────
  const COL = {
    step: 38,
    tokens: 10,
    cost: 9,
    time: 7,
    vsBase: 12,
    vsPrev: 12,
  };
  const header =
    " " +
    "Step".padEnd(COL.step) +
    "Tokens".padStart(COL.tokens) +
    "Cost".padStart(COL.cost) +
    "Time".padStart(COL.time) +
    "vs baseline".padStart(COL.vsBase) +
    "vs prev.".padStart(COL.vsPrev);

  console.log(header);
  console.log(line);

  for (let i = 0; i < data.length; i++) {
    const d = data[i];
    const prev = i > 0 ? data[i - 1] : null;

    const tokenSavBase = baseline.totalTokens - d.totalTokens;
    const pctBase = ((tokenSavBase / baseline.totalTokens) * 100).toFixed(0);

    const tokenSavPrev = prev ? prev.totalTokens - d.totalTokens : 0;
    const pctPrev = prev
      ? ((tokenSavPrev / prev.totalTokens) * 100).toFixed(0)
      : "—";

    const vsBaseStr =
      i === 0
        ? "baseline"
        : `${tokenSavBase >= 0 ? "-" : "+"}${Math.abs(tokenSavBase).toLocaleString()} (${pctBase}%)`;
    const vsPrevStr =
      i === 0
        ? "—"
        : `${tokenSavPrev >= 0 ? "-" : "+"}${Math.abs(tokenSavPrev).toLocaleString()} (${pctPrev}%)`;

    const isLast = i === data.length - 1;
    const prefix = isLast ? "▶ " : "  ";

    const row =
      prefix +
      d.name.padEnd(COL.step - 2) +
      fmt(d.totalTokens).padStart(COL.tokens) +
      `$${d.costUSD.toFixed(4)}`.padStart(COL.cost) +
      (d.elapsedS > 0 ? `${d.elapsedS}s` : "—").padStart(COL.time) +
      vsBaseStr.padStart(COL.vsBase) +
      vsPrevStr.padStart(COL.vsPrev);

    console.log(row);
  }

  // ── ASCII BAR CHART ────────────────────────────────────────────────────────
  console.log("\n" + LINE);
  console.log(" TOKEN USAGE — VISUALIZATION");
  console.log(LINE);

  for (const d of data) {
    const b = bar(d.totalTokens, maxTokens, 44);
    const label = d.shortName.padEnd(18);
    const val = fmt(d.totalTokens).padStart(7);
    console.log(` ${label} ${b} ${val}`);
  }

  // ── PODSUMOWANIE ───────────────────────────────────────────────────────────
  const last = data[data.length - 1];
  const totalTokenSav = baseline.totalTokens - last.totalTokens;
  const totalTokenPct = ((totalTokenSav / baseline.totalTokens) * 100).toFixed(
    1,
  );
  const totalCostSav = baseline.costUSD - last.costUSD;
  const totalCostPct = ((totalCostSav / baseline.costUSD) * 100).toFixed(1);

  console.log("\n" + LINE);
  console.log(
    " TOTAL SAVINGS — Step 01 → Step " + String(data.length).padStart(2, "0"),
  );
  console.log(LINE);
  console.log(
    ` Tokens:   ${fmt(baseline.totalTokens).padStart(7)} → ${fmt(last.totalTokens).padStart(7)}` +
      `   savings: ${fmt(totalTokenSav)} (${totalTokenPct}%)`,
  );
  console.log(
    ` Cost:     $${baseline.costUSD.toFixed(4).padStart(6)} → $${last.costUSD.toFixed(4).padStart(6)}` +
      `   savings: $${totalCostSav.toFixed(4)} (${totalCostPct}%)`,
  );
  if (data[0].elapsedS > 0 && last.elapsedS > 0) {
    const timeSav = data[0].elapsedS - last.elapsedS;
    const timePct = ((timeSav / data[0].elapsedS) * 100).toFixed(1);
    console.log(
      ` Time:     ${data[0].elapsedS.toFixed(1).padStart(7)}s → ${last.elapsedS.toFixed(1).padStart(6)}s` +
        `   savings: ${timeSav.toFixed(1)}s (${timePct}%)`,
    );
  }
  console.log(LINE + "\n");

  // ── LOKALNE MODELE (step-09) ───────────────────────────────────────────────
  console.log(LINE);
  console.log(" LOCAL MODEL COMPARISON (step-09)");
  console.log(LINE);
  const localModels = [
    { name: "gpt-4o-mini (reference)", diffs: "0", time: "~7s", acc: "100%" },
    {
      name: "meta-llama-3.1-8b-instruct",
      diffs: "3x",
      time: "~20s",
      acc: "avg 63%",
    },
    { name: "qwen2.5-7b-instruct", diffs: "3x", time: "~30s", acc: "avg 61%" },
    { name: "google/gemma-4-e4b", diffs: "2x", time: "~40s", acc: "avg 53%" },
  ];
  console.log(
    `${"Model".padEnd(35)} ${"Diffs".padStart(6)} ${"Time".padStart(10)} ${"Accuracy".padStart(10)}`,
  );
  console.log("─".repeat(65));
  for (const m of localModels) {
    console.log(
      ` ${m.name.padEnd(35)} ${m.diffs.padStart(6)} ${m.time.padStart(10)} ${m.acc.padStart(10)}`,
    );
  }
  console.log(LINE + "\n");
  const mdRows = data
    .map((d, i) => {
      const prev = i > 0 ? data[i - 1] : null;
      const tokenSavBase = baseline.totalTokens - d.totalTokens;
      const pctBase = ((tokenSavBase / baseline.totalTokens) * 100).toFixed(0);
      const tokenSavPrev = prev ? prev.totalTokens - d.totalTokens : 0;
      const pctPrev = prev
        ? ((tokenSavPrev / prev.totalTokens) * 100).toFixed(0)
        : null;

      const vsBaseStr =
        i === 0
          ? "— (baseline)"
          : `${tokenSavBase >= 0 ? "-" : "+"}${Math.abs(tokenSavBase).toLocaleString()} (${pctBase}%)`;
      const vsPrevStr =
        i === 0
          ? "—"
          : `${tokenSavPrev >= 0 ? "-" : "+"}${Math.abs(tokenSavPrev).toLocaleString()} (${pctPrev}%)`;
      const timeStr = d.elapsedS > 0 ? `${d.elapsedS}s` : "—";
      const coverageStr = d.coverage ? `${d.coverage}` : "—";
      const bold = i === data.length - 1;
      const wrap = (s: string) => (bold ? `**${s}**` : s);

      return `| ${wrap(d.name)} | ${wrap(fmt(d.totalTokens))} | ${wrap("$" + d.costUSD.toFixed(4))} | ${wrap(timeStr)} | ${wrap(coverageStr)} | ${wrap(vsBaseStr)} | ${wrap(vsPrevStr)} |`;
    })
    .join("\n");

  const last2 = data[data.length - 1];
  const tSav = baseline.totalTokens - last2.totalTokens;
  const tPct = ((tSav / baseline.totalTokens) * 100).toFixed(1);
  const cSav = baseline.costUSD - last2.costUSD;
  const cPct = ((cSav / baseline.costUSD) * 100).toFixed(1);
  const timeSav2 =
    data[0].elapsedS > 0 && last2.elapsedS > 0
      ? data[0].elapsedS - last2.elapsedS
      : 0;
  const timePct2 =
    data[0].elapsedS > 0
      ? ((timeSav2 / data[0].elapsedS) * 100).toFixed(1)
      : "0";

  const md = `# Token optimization summary

Generated: ${new Date().toLocaleString("en-US")}

## Comparison table

| Step | Tokens | Cost | Time | Coverage | vs baseline | vs prev. |
|------|--------|------|------|----------|-------------|----------|
${mdRows}

## Total savings (Step 01 \u2192 Step ${String(data.length).padStart(2, "0")})

| Metric | Baseline | Final result | Savings |
|--------|----------|--------------|---------|
| Tokens | ${fmt(baseline.totalTokens)} | ${fmt(last2.totalTokens)} | **${fmt(tSav)} (${tPct}%)** |
| Cost | $${baseline.costUSD.toFixed(4)} | $${last2.costUSD.toFixed(4)} | **$${cSav.toFixed(4)} (${cPct}%)** |
${data[0].elapsedS > 0 && last2.elapsedS > 0 ? `| Time | ${data[0].elapsedS}s | ${last2.elapsedS}s | **${timeSav2.toFixed(1)}s (${timePct2}%)** |` : ""}
`;

  const scaleTotal = 14000;
  const scaleAfter = (last2.costUSD / baseline.costUSD) * scaleTotal;
  const scaleSav = scaleTotal - scaleAfter;
  const scaleFmt = (n: number) =>
    "\\$" + Math.round(n).toLocaleString("en-US").replace(/,/g, " ");

  const scalabilitySection = `
## Scalability \u2014 real-world scenario

> A company spent **${scaleFmt(scaleTotal)}** on ticket classification. They could have spent **~${scaleFmt(scaleAfter)}**.

The savings ratio from this presentation (\`$${baseline.costUSD.toFixed(4)} \u2192 $${last2.costUSD.toFixed(4)}\`, i.e. **${cPct}%**) scaled to ${scaleFmt(scaleTotal)}:

| Scenario | Cost |
|----------|------|
| Without optimizations (baseline) | **${scaleFmt(scaleTotal)}** |
| After optimizations | **~${scaleFmt(scaleAfter)}** |
| **Savings** | **~${scaleFmt(scaleSav)} (${cPct}%)** |
`;

  const localModelsTable = `
## Local model comparison (step-09)

| Model | Runs | Avg accuracy | Time | Notes |
|-------|------|-------------|------|-------|
| gpt-4o-mini (reference) | \u2014 | 100% | ~7s | reference point |
| meta-llama-3.1-8b-instruct | 3\u00d7 | **63.0%** | ~20s | 68% / 68% / 53% |
| qwen2.5-7b-instruct | 3\u00d7 | **61.3%** | ~30s | 68% / 53% / 63% |
| google/gemma-4-e4b | 2\u00d7 | **52.5%** | ~40s | 47% / 58% |

> \u26a0\ufe0f All three local models showed **very low accuracy** vs the reference \u2014 below 65% on average.
> Best result: meta-llama-3.1-8b-instruct (avg 63%), still 37 percentage points below gpt-4o-mini.
> High variance between runs (differences up to 15 pp) suggests instability in local model classification.
> \ud83d\udca1 The tested models are 7\u20138B parameter models. Larger models (e.g. 32B, 70B) could achieve significantly better accuracy \u2014 at the cost of higher hardware requirements and longer inference time.
`;

  const mdFull = md + scalabilitySection + localModelsTable;
  const outPath = path.resolve(process.cwd(), "presentation/SUMMARY.md");
  await writeFile(outPath, mdFull, "utf8");
  console.log(`Markdown saved: presentation/SUMMARY.md\n`);
}

main().catch(console.error);
