/**
 * STEP 03 — JS zamiast modelu (filtrowanie po product_category)
 *
 * Optymalizacja: JS filtruje CSV po kolumnie product_category = "Electronics"
 * ZANIM dane trafią do modelu. Model dostaje tylko ~10 ticketów zamiast 70.
 *
 * W step-01/02 model musiał:
 * 1. Przeczytać CAŁY CSV (70 ticketów, 14 kolumn)
 * 2. Sam znaleźć które tickety mają product_category = Electronics
 * 3. Sklasyfikować je (priorytet + sentyment)
 * 4. Zwrócić tylko te przefiltrowane
 *
 * Tutaj:
 * 1. JS parsuje CSV i filtruje po product_category — 0 tokenów
 * 2. Model dostaje TYLKO tickety Electronics (~10) — ogromna oszczędność
 * 3. Model klasyfikuje priorytet + sentyment
 */

import OpenAI from "openai";
import "dotenv/config";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { parse } from "csv-parse/sync";
import path from "node:path";
import {
  buildRefComparisonSection,
  buildComparisonTable,
  calculateCost,
  loadStatsBefore,
} from "../shared/helpers.js";
import { TICKET_CLASSIFICATION_SCHEMA } from "../shared/schemas.js";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MODEL = "gpt-5";

async function main() {
  const previousStats = await loadStatsBefore(3);

  // 1. Wczytaj CSV
  const csvPath = path.resolve(
    process.cwd(),
    "presentation/data/e-commerce-tickets-en.csv",
  );
  const csvContent = await readFile(csvPath, "utf8");

  // 2. ✅ JS FILTRUJE — to robił model w step-01/02!
  const allRecords = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
  }) as Record<string, string>[];
  const electronicsTickets = allRecords.filter(
    (row) => row.product_category === "Electronics",
  );

  // 3. Prompt systemowy z pliku
  const systemPrompt = await readFile(
    path.resolve(process.cwd(), "presentation/prompts/system-prompt-en.md"),
    "utf8",
  );

  const userMessage = `Here are ${electronicsTickets.length} customer support tickets. Classify each one.

${JSON.stringify(electronicsTickets, null, 2)}`;

  // 5. Wywołanie API (tylko Electronics tickets)
  const startTime = Date.now();

  const response = await client.chat.completions.create({
    model: MODEL,
    response_format: TICKET_CLASSIFICATION_SCHEMA,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  // 6. Parsowanie wyniku
  const result = JSON.parse(response.choices[0]?.message?.content ?? "{}");
  const tickets = result.tickets ?? [];

  // 6a. Zapis historii
  const outputDir = path.resolve(
    process.cwd(),
    "presentation/step-03-js-filtering/output",
  );
  await mkdir(outputDir, { recursive: true });

  await writeFile(
    path.join(outputDir, "chat-history.json"),
    JSON.stringify(
      {
        model: MODEL,
        timestamp: new Date().toISOString(),
        jsPreFilter: {
          totalRecords: allRecords.length,
          electronicsRecords: electronicsTickets.length,
          filteredOut: allRecords.length - electronicsTickets.length,
        },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
          { role: "assistant", content: response.choices[0]?.message?.content },
        ],
        usage: response.usage,
        result: tickets,
      },
      null,
      2,
    ),
    "utf8",
  );

  // 7. Statystyki tokenów
  const {
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: totalTokens,
  } = response.usage!;
  const costUSD = calculateCost(MODEL, promptTokens, completionTokens);

  // Tabela porównawcza z poprzednimi krokami
  const comparisonRows = buildComparisonTable(
    previousStats,
    "Step 03 (obecne)",
    totalTokens,
    costUSD,
  );

  // 7a. Porównanie z plikiem referencyjnym
  const comparisonSection = await buildRefComparisonSection(
    tickets,
    "presentation/data/categorized_by_gpt_5_5_high_thinking_en.json",
  );

  // 7b. Zapis stats.md
  const statsMarkdown =
    `# Step 03 — JS filtruje dane PRZED modelem\n\n## Parametry\n- **Model:** ${MODEL}\n- **Język promptu:** Angielski\n- **Optymalizacja:** JS filtruje CSV po product_category="Electronics" → model dostaje mniej danych\n- **Wszystkich ticketów w CSV:** ${allRecords.length}\n- **Ticketów Electronics (po JS filter):** ${electronicsTickets.length}\n- **Odrzuconych przez JS za 0 tokenów:** ${allRecords.length - electronicsTickets.length}\n\n## Zużycie tokenów\n| Metryka | Wartość |\n|---------|---------|\n| Prompt tokens | ${promptTokens.toLocaleString()} |\n| Completion tokens | ${completionTokens.toLocaleString()} |\n| **TOTAL tokens** | **${totalTokens.toLocaleString()}** |\n| **Koszt** | **$${costUSD.toFixed(4)}** |\n\n## Porównanie z poprzednimi krokami\n| Krok | Tokeny | Koszt | Oszcz. tokenów vs poprz. | Oszcz. kosztów vs poprz. |\n|------|--------|-------|----------------|----------------|\n${comparisonRows}\n\n## Czas odpowiedzi\n${elapsed}s\n\n## Uwagi\nJS odfiltrował ${allRecords.length - electronicsTickets.length} ticketów za 0 tokenów. Model w step-01 musiał przeczytać WSZYSTKIE ${allRecords.length}, żeby znaleźć te same ${electronicsTickets.length}.\n` +
    comparisonSection;

  await writeFile(path.join(outputDir, "stats.md"), statsMarkdown, "utf8");
}

main().catch(console.error);
