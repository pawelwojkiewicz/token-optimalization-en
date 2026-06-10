/**
 * STEP 06 — Kompresja promptu (skrócony system prompt)
 *
 * Zawiera optymalizacje z poprzednich kroków:
 * - Angielski prompt (step-02)
 * - JS filtruje wiersze po product_category (step-03)
 * - Model routing: tani + drogi model (step-04)
 * - Trim kolumn: tylko ticket_id, subject, description (step-05)
 *
 * Nowa optymalizacja:
 * - System prompt skompresowany z ~700 tokenów do ~200 tokenów
 * - Te same reguły klasyfikacji, mniej słów
 * - Mniej input tokenów = niższy koszt
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
  mergeRoutedTickets,
} from "../shared/helpers.js";
import { TICKET_CLASSIFICATION_SCHEMA } from "../shared/schemas.js";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const CHEAP_MODEL = "gpt-4.1-mini";
const EXPENSIVE_MODEL = "gpt-5";

async function main() {
  const previousStats = await loadStatsBefore(6);

  // 1. Wczytaj CSV + JS filtrowanie + trim kolumn
  const csvPath = path.resolve(
    process.cwd(),
    "presentation/data/e-commerce-tickets-en.csv",
  );
  const csvContent = await readFile(csvPath, "utf8");

  const allRecords = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
  }) as Record<string, string>[];
  const electronicsTickets = allRecords.filter(
    (row) => row.product_category === "Electronics",
  );

  const ticketsForModel = electronicsTickets.map((row) => ({
    ticket_id: row.ticket_id,
    subject: row.subject,
    description: row.description,
  }));

  // 2. ✅ NOWA OPTYMALIZACJA: Wczytaj skompresowany prompt zamiast pełnego
  const fullPrompt = await readFile(
    path.resolve(process.cwd(), "presentation/prompts/system-prompt-en.md"),
    "utf8",
  );
  const compressedPrompt = await readFile(
    path.resolve(
      process.cwd(),
      "presentation/prompts/system-prompt-en-compressed.md",
    ),
    "utf8",
  );

  const fullPromptChars = fullPrompt.length;
  const compressedChars = compressedPrompt.length;
  const compressionPct = (
    (1 - compressedChars / fullPromptChars) *
    100
  ).toFixed(0);

  const userMessageCheap = `Here are ${ticketsForModel.length} customer support tickets. Classify each one with priority, sentiment, and confidence.

${JSON.stringify(ticketsForModel, null, 2)}`;

  const startPhase1 = Date.now();

  const responseCheap = await client.chat.completions.create({
    model: CHEAP_MODEL,
    response_format: TICKET_CLASSIFICATION_SCHEMA,
    messages: [
      { role: "system", content: compressedPrompt },
      { role: "user", content: userMessageCheap },
    ],
  });

  const elapsedPhase1 = ((Date.now() - startPhase1) / 1000).toFixed(1);
  const cheapResult = JSON.parse(
    responseCheap.choices[0]?.message?.content ?? "{}",
  );
  const cheapTickets = cheapResult.tickets ?? [];

  const cheapUsage = responseCheap.usage!;
  const cheapCost = calculateCost(
    CHEAP_MODEL,
    cheapUsage.prompt_tokens,
    cheapUsage.completion_tokens,
  );

  const highConfidence = cheapTickets.filter(
    (t: any) => t.confidence === "high",
  );
  const lowConfidence = cheapTickets.filter((t: any) => t.confidence === "low");

  // 4. FAZA 2 — Drogi model TYLKO dla low confidence (jeśli są)
  let expensiveCost = 0;
  let expensiveUsage = {
    prompt_tokens: 0,
    completion_tokens: 0,
    total_tokens: 0,
  };
  let elapsedPhase2 = "0";
  let expensiveTickets: any[] = [];

  if (lowConfidence.length > 0) {
    const lowIds = new Set(lowConfidence.map((t: any) => t.ticket_id));
    const ticketsForExpensive = ticketsForModel.filter((t) =>
      lowIds.has(t.ticket_id),
    );

    const systemPromptExpensive = `${compressedPrompt}

These are ambiguous tickets that require careful analysis. Take your time to classify them accurately.`;

    const userMessageExpensive = `Here are ${ticketsForExpensive.length} ambiguous customer support tickets that need careful classification.

${JSON.stringify(ticketsForExpensive, null, 2)}`;

    const startPhase2 = Date.now();

    const responseExpensive = await client.chat.completions.create({
      model: EXPENSIVE_MODEL,
      response_format: TICKET_CLASSIFICATION_SCHEMA,
      messages: [
        { role: "system", content: systemPromptExpensive },
        { role: "user", content: userMessageExpensive },
      ],
    });

    elapsedPhase2 = ((Date.now() - startPhase2) / 1000).toFixed(1);
    const expensiveResult = JSON.parse(
      responseExpensive.choices[0]?.message?.content ?? "{}",
    );
    expensiveTickets = expensiveResult.tickets ?? [];
    expensiveUsage = responseExpensive.usage as any;
    expensiveCost = calculateCost(
      EXPENSIVE_MODEL,
      expensiveUsage.prompt_tokens,
      expensiveUsage.completion_tokens,
    );
  }

  // 5. Merge wyników
  const finalTickets = mergeRoutedTickets(
    highConfidence,
    expensiveTickets,
    lowConfidence,
    CHEAP_MODEL,
    EXPENSIVE_MODEL,
  );

  // 6. Sumaryczne statystyki
  const totalPromptTokens =
    cheapUsage.prompt_tokens + expensiveUsage.prompt_tokens;
  const totalCompletionTokens =
    cheapUsage.completion_tokens + expensiveUsage.completion_tokens;
  const totalTokens = totalPromptTokens + totalCompletionTokens;
  const totalCost = cheapCost + expensiveCost;
  const totalElapsed = (
    parseFloat(elapsedPhase1) + parseFloat(elapsedPhase2)
  ).toFixed(1);

  // 7. Zapis historii
  const outputDir = path.resolve(
    process.cwd(),
    "presentation/step-06-prompt-compression/output",
  );
  await mkdir(outputDir, { recursive: true });

  await writeFile(
    path.join(outputDir, "chat-history.json"),
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        optimization: `Prompt compression: system prompt skrócony z ${fullPromptChars} do ${compressedChars} znaków (${compressionPct}% mniej)`,
        routing: {
          cheapModel: CHEAP_MODEL,
          expensiveModel: EXPENSIVE_MODEL,
          totalTickets: ticketsForModel.length,
          highConfidence: highConfidence.length,
          lowConfidence: lowConfidence.length,
        },
        phase1: { model: CHEAP_MODEL, usage: cheapUsage, cost: cheapCost },
        phase2: {
          model: EXPENSIVE_MODEL,
          usage: expensiveUsage,
          cost: expensiveCost,
          ticketsReclassified: expensiveTickets.length,
        },
        totalUsage: {
          promptTokens: totalPromptTokens,
          completionTokens: totalCompletionTokens,
          totalTokens,
          totalCost,
        },
        result: finalTickets,
      },
      null,
      2,
    ),
    "utf8",
  );

  // 8. Tabela porównawcza z poprzednimi krokami
  const comparisonRows = buildComparisonTable(
    previousStats,
    "Step 06 (obecne)",
    totalTokens,
    totalCost,
  );

  // 8a. Zapis stats.md
  const statsMarkdown =
    `# Step 06 — Kompresja promptu\n\n## Parametry\n- **Tani model:** ${CHEAP_MODEL}\n- **Drogi model:** ${EXPENSIVE_MODEL}\n- **Język promptu:** Angielski (skompresowany)\n- **Optymalizacje:** JS filter wierszy + EN + Model Routing + Trim kolumn + Kompresja promptu\n- **Ticketów Electronics:** ${ticketsForModel.length}\n- **High confidence (tani model):** ${highConfidence.length}\n- **Low confidence (→ drogi model):** ${lowConfidence.length}\n\n## Kompresja promptu\n- **Oryginalny prompt:** ${fullPromptChars} znaków\n- **Skompresowany prompt:** ${compressedChars} znaków (${compressionPct}% mniej)\n\n## Zużycie tokenów\n| Faza | Model | Prompt | Completion | Total | Koszt |\n|------|-------|--------|------------|-------|-------|\n| Faza 1 | ${CHEAP_MODEL} | ${cheapUsage.prompt_tokens.toLocaleString()} | ${cheapUsage.completion_tokens.toLocaleString()} | ${cheapUsage.total_tokens.toLocaleString()} | $${cheapCost.toFixed(4)} |\n| Faza 2 | ${EXPENSIVE_MODEL} | ${expensiveUsage.prompt_tokens.toLocaleString()} | ${expensiveUsage.completion_tokens.toLocaleString()} | ${expensiveUsage.total_tokens.toLocaleString()} | $${expensiveCost.toFixed(4)} |\n| **SUMA** | — | ${totalPromptTokens.toLocaleString()} | ${totalCompletionTokens.toLocaleString()} | **${totalTokens.toLocaleString()}** | **$${totalCost.toFixed(4)}** |\n\n## Porównanie z poprzednimi krokami\n| Krok | Tokeny | Koszt | Oszcz. tokenów vs poprz. | Oszcz. kosztów vs poprz. |\n|------|--------|-------|----------------|----------------|\n${comparisonRows}\n\n## Czas odpowiedzi\n- Faza 1: ${elapsedPhase1}s\n- Faza 2: ${elapsedPhase2}s\n- **Łącznie:** ${totalElapsed}s\n\n## Co kompresujemy\nSystem prompt skrócony z pełnych opisów i 8 przykładów do:\n- Jednoliniowe definicje priorytetów (pipe-separated)\n- 6 przykładów w formacie inline (zamiast wieloliniowych bloków)\n- Usunięte powtórzenia i wypełniacze\n` +
    (await buildRefComparisonSection(
      finalTickets,
      "presentation/data/categorized_by_gpt_5_5_high_thinking_en.json",
    ));

  await writeFile(path.join(outputDir, "stats.md"), statsMarkdown, "utf8");
}

main().catch(console.error);
