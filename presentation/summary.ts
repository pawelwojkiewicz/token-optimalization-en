/**
 * SUMMARY — Podsumowanie wszystkich kroków optymalizacji
 *
 * Czyta stats.md z każdego stepu i wypisuje:
 * - Tabelę porównawczą ze wszystkimi krokami
 * - ASCII bar chart tokenów
 * - Całkowite oszczędności vs baseline
 */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

interface StepData {
  name: string;
  shortName: string;
  totalTokens: number;
  costUSD: number;
  elapsedS: number;
}

async function parseStats(
  statsPath: string,
): Promise<{ tokens: number; cost: number; elapsed: number } | null> {
  try {
    const content = await readFile(
      path.resolve(process.cwd(), statsPath),
      "utf8",
    );

    // tokens: TOTAL tokens** | **X** lub SUMA row
    let tokensMatch = content.match(/TOTAL tokens\*\*\s*\|\s*\*\*([\d,]+)/);
    if (!tokensMatch)
      tokensMatch = content.match(
        /\*\*SUMA\*\*\s*\|[^|]*\|[^|]*\|[^|]*\|\s*\*\*([\d,]+)\*\*/,
      );
    const tokens = parseInt((tokensMatch?.[1] ?? "0").replace(/,/g, ""), 10);

    // cost: Koszt** | **$X** lub SUMA row
    let costMatch = content.match(/Koszt\*\*\s*\|\s*\*\*\$([\d.]+)/);
    if (!costMatch)
      costMatch = content.match(
        /\*\*SUMA\*\*\s*\|[^|]*\|[^|]*\|[^|]*\|[^|]*\|\s*\*\*\$([\d.]+)\*\*/,
      );
    const cost = parseFloat(costMatch?.[1] ?? "0");

    // elapsed: "Łącznie:** Xs" lub simple "X.Xs\n"
    let elapsedMatch = content.match(/Łącznie:\*\*\s*([\d.]+)s/);
    if (!elapsedMatch)
      elapsedMatch = content.match(/## Czas odpowiedzi\n([\d.]+)s/);
    const elapsed = parseFloat(elapsedMatch?.[1] ?? "0");

    return { tokens, cost, elapsed };
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
      name: "Step 01 — PL, brak opt., gpt-5.5",
      short: "01 PL brak opt.",
    },
    {
      path: "presentation/step-02-english/output/stats.md",
      name: "Step 02 — EN prompt, gpt-5.5",
      short: "02 EN prompt",
    },
    {
      path: "presentation/step-03-js-filtering/output/stats.md",
      name: "Step 03 — JS filter wierszy, gpt-5.5",
      short: "03 JS filter",
    },
    {
      path: "presentation/step-04-model-routing/output/stats.md",
      name: "Step 04 — Model routing",
      short: "04 Routing",
    },
    {
      path: "presentation/step-05-trim-columns/output/stats.md",
      name: "Step 05 — Trim kolumn (3/14)",
      short: "05 Trim kolumn",
    },
    {
      path: "presentation/step-06-prompt-compression/output/stats.md",
      name: "Step 06 — Kompresja promptu",
      short: "06 Kompresja",
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
      });
    }
  }

  if (data.length === 0) {
    console.log(
      "Brak danych — odpal najpierw stepy (npm run step-01 ... step-07)",
    );
    return;
  }

  const baseline = data[0];
  const maxTokens = Math.max(...data.map((d) => d.totalTokens));

  const LINE = "═".repeat(100);
  const line = "─".repeat(100);

  console.log("\n" + LINE);
  console.log(" PODSUMOWANIE OPTYMALIZACJI TOKENÓW — WSZYSTKIE KROKI");
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
    "Krok".padEnd(COL.step) +
    "Tokeny".padStart(COL.tokens) +
    "Koszt".padStart(COL.cost) +
    "Czas".padStart(COL.time) +
    "vs baseline".padStart(COL.vsBase) +
    "vs poprz.".padStart(COL.vsPrev);

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
  console.log(" ZUŻYCIE TOKENÓW — WIZUALIZACJA");
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
    " CAŁKOWITE OSZCZĘDNOŚCI — Step 01 → Step " +
      String(data.length).padStart(2, "0"),
  );
  console.log(LINE);
  console.log(
    ` Tokeny:   ${fmt(baseline.totalTokens).padStart(7)} → ${fmt(last.totalTokens).padStart(7)}` +
      `   oszczędność: ${fmt(totalTokenSav)} (${totalTokenPct}%)`,
  );
  console.log(
    ` Koszt:    $${baseline.costUSD.toFixed(4).padStart(6)} → $${last.costUSD.toFixed(4).padStart(6)}` +
      `   oszczędność: $${totalCostSav.toFixed(4)} (${totalCostPct}%)`,
  );
  if (data[0].elapsedS > 0 && last.elapsedS > 0) {
    const timeSav = data[0].elapsedS - last.elapsedS;
    const timePct = ((timeSav / data[0].elapsedS) * 100).toFixed(1);
    console.log(
      ` Czas:     ${data[0].elapsedS.toFixed(1).padStart(7)}s → ${last.elapsedS.toFixed(1).padStart(6)}s` +
        `   oszczędność: ${timeSav.toFixed(1)}s (${timePct}%)`,
    );
  }
  console.log(LINE + "\n");

  // ── LOKALNE MODELE (step-09) ───────────────────────────────────────────────
  console.log(LINE);
  console.log(" PORÓWNANIE LOKALNYCH MODELI (step-09)");
  console.log(LINE);
  const localModels = [
    { name: "gpt-4o-mini (referencja)", diffs: "0", time: "~7s", acc: "100%" },
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
    ` ${"Model".padEnd(35)} ${"Diffs".padStart(6)} ${"Czas".padStart(10)} ${"Zgodność".padStart(10)}`,
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
      const bold = i === data.length - 1;
      const wrap = (s: string) => (bold ? `**${s}**` : s);

      return `| ${wrap(d.name)} | ${wrap(fmt(d.totalTokens))} | ${wrap("$" + d.costUSD.toFixed(4))} | ${wrap(timeStr)} | ${wrap(vsBaseStr)} | ${wrap(vsPrevStr)} |`;
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

  const md = `# Podsumowanie optymalizacji tokenów

Wygenerowano: ${new Date().toLocaleString("pl-PL")}

## Tabela porównawcza

| Krok | Tokeny | Koszt | Czas | vs baseline | vs poprz. |
|------|--------|-------|------|-------------|-----------|
${mdRows}

## Całkowite oszczędności (Step 01 → Step ${String(data.length).padStart(2, "0")})

| Metryka | Baseline | Wynik końcowy | Oszczędność |
|---------|----------|---------------|-------------|
| Tokeny | ${fmt(baseline.totalTokens)} | ${fmt(last2.totalTokens)} | **${fmt(tSav)} (${tPct}%)** |
| Koszt | $${baseline.costUSD.toFixed(4)} | $${last2.costUSD.toFixed(4)} | **$${cSav.toFixed(4)} (${cPct}%)** |
${data[0].elapsedS > 0 && last2.elapsedS > 0 ? `| Czas | ${data[0].elapsedS}s | ${last2.elapsedS}s | **${timeSav2.toFixed(1)}s (${timePct2}%)** |` : ""}
`;

  const scaleTotal = 14000;
  const scaleAfter = (last2.costUSD / baseline.costUSD) * scaleTotal;
  const scaleSav = scaleTotal - scaleAfter;
  const scaleFmt = (n: number) =>
    "\\$" + Math.round(n).toLocaleString("en-US").replace(/,/g, " ");

  const scalabilitySection = `
## Skalowalność — realny scenariusz

> Firma wydała **${scaleFmt(scaleTotal)}** na klasyfikację ticketów. Mogła wydać **~${scaleFmt(scaleAfter)}**.

Proporcja oszczędności z tej prezentacji (\`$${baseline.costUSD.toFixed(4)} → $${last2.costUSD.toFixed(4)}\`, czyli **${cPct}%**) przełożona na skalę ${scaleFmt(scaleTotal)}:

| Scenariusz | Koszt |
|------------|-------|
| Bez optymalizacji (baseline) | **${scaleFmt(scaleTotal)}** |
| Po optymalizacjach | **~${scaleFmt(scaleAfter)}** |
| **Oszczędność** | **~${scaleFmt(scaleSav)} (${cPct}%)** |
`;

  const localModelsTable = `
## Porównanie lokalnych modeli (step-09)

| Model | Odpalenia | Avg zgodność | Czas | Uwagi |
|-------|-----------|-------------|------|-------|
| gpt-4o-mini (referencja) | — | 100% | ~7s | punkt odniesienia |
| meta-llama-3.1-8b-instruct | 3× | **63.0%** | ~20s | 68% / 68% / 53% |
| qwen2.5-7b-instruct | 3× | **61.3%** | ~30s | 68% / 53% / 63% |
| google/gemma-4-e4b | 2× | **52.5%** | ~40s | 47% / 58% |

> ⚠️ Wszystkie trzy lokalne modele wykazały **bardzo niską zgodność** z referencją — poniżej 65% średnio.
> Najlepszy wynik: meta-llama-3.1-8b-instruct (avg 63%), ale nadal o 37 punktów procentowych gorszy od gpt-4o-mini.
> Wysoka zmienność między odpaleniami (różnice do 15 pp) sugeruje brak stabilności klasyfikacji lokalnych modeli.
> 💡 Testowane modele to modele 7–8B parametrów. Modele z większą liczbą parametrów (np. 32B, 70B) mogłyby osiągnąć znacznie lepszą zgodność — kosztem wyższych wymagań sprzętowych i dłuższego czasu inferencji.
`;

  const mdFull = md + scalabilitySection + localModelsTable;
  const outPath = path.resolve(process.cwd(), "presentation/SUMMARY.md");
  await writeFile(outPath, mdFull, "utf8");
  console.log(`Markdown zapisany: presentation/SUMMARY.md\n`);
}

main().catch(console.error);
