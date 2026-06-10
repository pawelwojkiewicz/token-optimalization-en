import { readFile } from "node:fs/promises";
import path from "node:path";

export const PRICING: Record<string, { input: number; output: number }> = {
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-5.5": { input: 5, output: 30 },
};

// ---------------------------------------------------------------------------
// Porównanie wyników z plikiem referencyjnym (categorized_by_gpt_5_5_high_thinking_en.json)
// Zwraca gotową sekcję markdown do dołączenia do stats.md
// ---------------------------------------------------------------------------

export async function buildRefComparisonSection(
  resultTickets: Array<{
    ticket_id: string;
    priority: string;
    sentiment: string;
  }>,
  refFilePath: string,
  categoryFilter = "Electronics",
): Promise<string> {
  type RefTicket = {
    ticket_id: string;
    product_category: string;
    priority: string;
    sentiment: string;
  };

  let refAll: RefTicket[];
  try {
    const raw = await readFile(
      path.resolve(process.cwd(), refFilePath),
      "utf8",
    );
    refAll = JSON.parse(raw);
  } catch {
    return `\n## Porównanie z plikiem referencyjnym\n⚠️ Nie udało się wczytać pliku referencyjnego: ${refFilePath}\n`;
  }

  const refFiltered = refAll.filter(
    (t) => t.product_category === categoryFilter,
  );
  const refMap = new Map<string, RefTicket>(
    refFiltered.map((t) => [t.ticket_id, t]),
  );
  const resultMap = new Map<
    string,
    { ticket_id: string; priority: string; sentiment: string }
  >(resultTickets.map((t) => [t.ticket_id, t]));

  const allIds = new Set<string>([...refMap.keys(), ...resultMap.keys()]);
  let exactMatches = 0;
  const differences: string[] = [];
  const onlyInRef: string[] = [];
  const onlyInResult: string[] = [];

  for (const id of allIds) {
    const ref = refMap.get(id);
    const res = resultMap.get(id);
    if (ref === undefined) {
      onlyInResult.push(id);
    } else if (res === undefined) {
      onlyInRef.push(id);
    } else {
      const fields = ["priority", "sentiment"] as const;
      const diffs = fields.filter((f) => ref[f] !== res[f]);
      if (diffs.length === 0) {
        exactMatches++;
      } else {
        differences.push(
          `- **${id}**: ` +
            diffs
              .map((f) => `${f}: ref=\`${ref[f]}\` vs wynik=\`${res[f]}\``)
              .join(", "),
        );
      }
    }
  }

  const totalRef = refFiltered.length;
  const isIdeal =
    exactMatches === totalRef &&
    onlyInRef.length === 0 &&
    onlyInResult.length === 0 &&
    differences.length === 0;

  let section = `\n## Porównanie z plikiem referencyjnym\n`;
  section += `- **Tickety referencyjne (${categoryFilter}):** ${totalRef}\n`;
  section += `- **Tickety zwrócone przez model:** ${resultTickets.length}\n\n`;

  if (isIdeal) {
    section += `✅ **Dane idealnie się pokrywają!** Wszystkie ${totalRef} ticketów zgadza się co do ticket_id, priority i sentiment.\n`;
  } else {
    section += `⚠️ **Pokrycie: ${exactMatches}/${totalRef} ticketów zgodnych w 100%**\n\n`;
    if (onlyInRef.length > 0) {
      section +=
        `### Brakujące w wyniku modelu\n` +
        onlyInRef.map((id) => `- ${id}`).join("\n") +
        "\n\n";
    }
    if (onlyInResult.length > 0) {
      section +=
        `### Nadmiarowe w wyniku modelu\n` +
        onlyInResult.map((id) => `- ${id}`).join("\n") +
        "\n\n";
    }
    if (differences.length > 0) {
      section +=
        `### Różnice w klasyfikacji (ticket_id: pole: ref vs wynik)\n` +
        differences.join("\n") +
        "\n";
    }
  }

  return section;
}

// ---------------------------------------------------------------------------
// Statystyki kroków — parsing stats.md
// ---------------------------------------------------------------------------

export interface StepStats {
  name: string;
  totalTokens: number;
  costUSD: number;
}

export async function loadStepStats(
  statsPath: string,
  name: string,
): Promise<StepStats | null> {
  try {
    const content = await readFile(statsPath, "utf8");
    // Standardowy format: | **TOTAL tokens** | **X** |
    let totalMatch = content.match(/TOTAL tokens\*\*\s*\|\s*\*\*([\d,]+)/);
    let costMatch = content.match(/Koszt\*\*\s*\|\s*\*\*\$([\d.]+)/);
    // Fallback dla formatu z tabelą faz (SUMA row): | **SUMA** | — | ... | **X** | **$Y** |
    if (!totalMatch) {
      totalMatch = content.match(
        /\*\*SUMA\*\*\s*\|[^|]*\|[^|]*\|[^|]*\|\s*\*\*([\d,]+)\*\*/,
      );
    }
    if (!costMatch) {
      costMatch = content.match(
        /\*\*SUMA\*\*\s*\|[^|]*\|[^|]*\|[^|]*\|[^|]*\|\s*\*\*\$([\d.]+)\*\*/,
      );
    }
    return {
      name,
      totalTokens: parseInt((totalMatch?.[1] ?? "0").replace(/,/g, ""), 10),
      costUSD: parseFloat(costMatch?.[1] ?? "0"),
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Centralna lista kroków prezentacji + helper ładujący statystyki
// wszystkich kroków POPRZEDZAJĄCYCH bieżący numer.
// ---------------------------------------------------------------------------

export const PRESENTATION_STEPS = [
  { num: 1, dir: "step-01-no-optimization", name: "Step 01 (PL, brak opt.)" },
  { num: 2, dir: "step-02-english", name: "Step 02 (EN)" },
  { num: 3, dir: "step-03-js-filtering", name: "Step 03 (JS filter wierszy)" },
  { num: 4, dir: "step-04-model-routing", name: "Step 04 (Model routing)" },
  { num: 5, dir: "step-05-trim-columns", name: "Step 05 (Trim kolumn)" },
  {
    num: 6,
    dir: "step-06-prompt-compression",
    name: "Step 06 (Kompresja promptu)",
  },
  {
    num: 7,
    dir: "step-07-pipe-separated-input",
    name: "Step 07 (Pipe format)",
  },
  { num: 8, dir: "step-08-truncate-description", name: "Step 08 (Truncation)" },
  { num: 9, dir: "step-09-local-model", name: "Step 09 (Lokalny model)" },
] as const;

export async function loadStatsBefore(
  currentStepNum: number,
): Promise<StepStats[]> {
  const earlier = PRESENTATION_STEPS.filter((s) => s.num < currentStepNum);
  const results = await Promise.all(
    earlier.map((s) =>
      loadStepStats(
        path.resolve(process.cwd(), `presentation/${s.dir}/output/stats.md`),
        s.name,
      ),
    ),
  );
  return results.filter((s): s is StepStats => s !== null);
}

// ---------------------------------------------------------------------------
// Obliczanie kosztu API
// ---------------------------------------------------------------------------

export function calculateCost(
  model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  const pricing = PRICING[model] ?? { input: 0, output: 0 };
  return (
    (promptTokens * pricing.input) / 1_000_000 +
    (completionTokens * pricing.output) / 1_000_000
  );
}

// ---------------------------------------------------------------------------
// Tabela porównawcza kroków (markdown rows)
// Zwraca wiersze tabeli — bez nagłówka — gotowe do wklejenia w stats.md
// ---------------------------------------------------------------------------

export function buildComparisonTable(
  previousStats: StepStats[],
  currentName: string,
  currentTokens: number,
  currentCost: number,
): string {
  const allSteps = [
    ...previousStats,
    { name: currentName, totalTokens: currentTokens, costUSD: currentCost },
  ];
  return allSteps
    .map((s, i) => {
      if (i === 0) {
        return `| ${s.name} | ${s.totalTokens.toLocaleString()} | $${s.costUSD.toFixed(4)} | — (baseline) | — (baseline) |`;
      }
      const prev = allSteps[i - 1];
      const tokenDiff = prev.totalTokens - s.totalTokens;
      const tokenPct = ((tokenDiff / prev.totalTokens) * 100).toFixed(1);
      const costDiff = prev.costUSD - s.costUSD;
      const costPct = ((costDiff / prev.costUSD) * 100).toFixed(1);
      if (s.name === currentName) {
        return `| **${s.name}** | **${s.totalTokens.toLocaleString()}** | **$${s.costUSD.toFixed(4)}** | ${tokenDiff.toLocaleString()} (${tokenPct}%) | $${costDiff.toFixed(4)} (${costPct}%) |`;
      }
      return `| ${s.name} | ${s.totalTokens.toLocaleString()} | $${s.costUSD.toFixed(4)} | ${tokenDiff.toLocaleString()} (${tokenPct}%) | $${costDiff.toFixed(4)} (${costPct}%) |`;
    })
    .join("\n");
}

// ---------------------------------------------------------------------------
// Mergowanie wyników routingu (faza 1 tania + faza 2 droga)
// Zwraca finalną tablicę ticketów z polem `model` wskazującym który model klasyfikował
// ---------------------------------------------------------------------------

export interface RoutedTicket {
  ticket_id: string;
  product_category: string;
  priority: string;
  sentiment: string;
  model: string;
}

export function mergeRoutedTickets(
  highConfidence: Array<{
    ticket_id: string;
    product_category: string;
    priority: string;
    sentiment: string;
  }>,
  expensiveTickets: Array<{
    ticket_id: string;
    product_category: string;
    priority: string;
    sentiment: string;
  }>,
  lowConfidence: Array<{
    ticket_id: string;
    product_category: string;
    priority: string;
    sentiment: string;
  }>,
  cheapModel: string,
  expensiveModel: string,
): RoutedTicket[] {
  const expensiveIds = new Set(expensiveTickets.map((t) => t.ticket_id));
  return [
    // Tickety z high confidence zostają z tanim modelem
    ...highConfidence.map((t) => ({ ...t, model: cheapModel })),
    // Trudne tickety reklasyfikowane przez drogi model
    ...expensiveTickets.map((t) => ({ ...t, model: expensiveModel })),
    // Zabezpieczenie: low confidence tickety bez reklasyfikacji (nie powinno się zdarzyć)
    ...lowConfidence
      .filter((t) => !expensiveIds.has(t.ticket_id))
      .map((t) => ({ ...t, model: cheapModel })),
  ];
}

// ---------------------------------------------------------------------------
// Formatowanie ticketów jako pipe-separated text (mniej tokenów niż JSON)
// Używane w stepach 07, 08, 09
// ---------------------------------------------------------------------------

export function ticketsToPipeFormat(
  tickets: Array<{ ticket_id: string; subject: string; description: string }>,
): string {
  const header = "ticket_id|subject|description";
  const rows = tickets.map(
    (t) =>
      `${t.ticket_id}|${t.subject.replace(/\|/g, " ")}|${t.description.replace(/\|/g, " ")}`,
  );
  return [header, ...rows].join("\n");
}
