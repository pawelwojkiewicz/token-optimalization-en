/**
 * STEP 07 — Kompaktowy format danych (pipe-separated)
 *
 * Zawiera optymalizacje z poprzednich kroków:
 * - Angielski prompt (step-02)
 * - JS filtruje wiersze po product_category (step-03)
 * - Model routing: tani + drogi model (step-04)
 * - Trim kolumn: tylko ticket_id, subject, description (step-05)
 * - Kompresja promptu (step-06)
 *
 * Nowa optymalizacja:
 * - Zamiast wysyłać dane jako JSON (z powtarzającymi się kluczami dla każdego ticketu),
 *   używamy pipe-separated format: ticket_id|subject|description
 * - Eliminuje overhead JSON: nazwy kluczy ("ticket_id", "subject", "description")
 *   powtarzane dla każdego ticketu → zastąpione jedną linią nagłówka
 * - Mniej tokenów na strukturze = więcej miejsca na treść
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
  ticketsToPipeFormat,
} from "../shared/helpers.js";
import { TICKET_CLASSIFICATION_SCHEMA } from "../shared/schemas.js";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const CHEAP_MODEL = "gpt-4.1-mini";
const EXPENSIVE_MODEL = "gpt-5";

async function main() {
  const previousStats = await loadStatsBefore(7);

  // 1. Wczytaj CSV + JS filtrowanie + trim kolumn
  const csvPath = path.resolve(process.cwd(), "presentation/data/e-commerce-tickets-en.csv");
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

  // 2. ✅ NOWA OPTYMALIZACJA: konwersja do pipe-separated format (mniej tokenów niż JSON)
  const jsonFormat = JSON.stringify(ticketsForModel, null, 2);
  const pipeFormat = ticketsToPipeFormat(ticketsForModel);

  const jsonChars = jsonFormat.length;
  const pipeChars = pipeFormat.length;
  const savingPct = (((jsonChars - pipeChars) / jsonChars) * 100).toFixed(0);

  // Przykładowe wiersze do stats.md
  const exampleLines = pipeFormat.split("\n").slice(0, 3).join("\n");

  // 3. Wczytaj skompresowany prompt + dodaj instrukcję formatu pipe
  const compressedPrompt = await readFile(
    path.resolve(
      process.cwd(),
      "presentation/prompts/system-prompt-en-compressed.md",
    ),
    "utf8",
  );
  const systemPromptWithPipeInfo = `${compressedPrompt}

Input format: pipe-separated text with header row: ticket_id|subject|description`;

  // 4. FAZA 1 — Tani model klasyfikuje WSZYSTKO z pipe format
  const userMessageCheap = `Here are ${ticketsForModel.length} customer support tickets in pipe-separated format. Classify each one with priority, sentiment, and confidence.

${pipeFormat}`;

  const startPhase1 = Date.now();

  const responseCheap = await client.chat.completions.create({
    model: CHEAP_MODEL,
    response_format: TICKET_CLASSIFICATION_SCHEMA,
    messages: [
      { role: "system", content: systemPromptWithPipeInfo },
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

  // 5. FAZA 2 — Drogi model TYLKO dla low confidence (jeśli są)
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
    const pipeForExpensive = ticketsToPipeFormat(ticketsForExpensive);

    const systemPromptExpensive = `${systemPromptWithPipeInfo}

These are ambiguous tickets that require careful analysis. Take your time to classify them accurately.`;

    const userMessageExpensive = `Here are ${ticketsForExpensive.length} ambiguous customer support tickets in pipe-separated format. Classify each one carefully.

${pipeForExpensive}`;

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

  // 6. Merge wyników
  const finalTickets = mergeRoutedTickets(
    highConfidence,
    expensiveTickets,
    lowConfidence,
    CHEAP_MODEL,
    EXPENSIVE_MODEL,
  );

  // 7. Sumaryczne statystyki
  const totalPromptTokens =
    cheapUsage.prompt_tokens + expensiveUsage.prompt_tokens;
  const totalCompletionTokens =
    cheapUsage.completion_tokens + expensiveUsage.completion_tokens;
  const totalTokens = totalPromptTokens + totalCompletionTokens;
  const totalCost = cheapCost + expensiveCost;
  const totalElapsed = (
    parseFloat(elapsedPhase1) + parseFloat(elapsedPhase2)
  ).toFixed(1);

  // 8. Zapis historii
  const outputDir = path.resolve(
    process.cwd(),
    "presentation/step-07-pipe-separated-input/output",
  );
  await mkdir(outputDir, { recursive: true });

  await writeFile(
    path.join(outputDir, "chat-history.json"),
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        optimization: `Pipe format: JSON ${jsonChars} znaków → pipe ${pipeChars} znaków (${savingPct}% mniej)`,
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

  // 9. Tabela porównawcza z poprzednimi krokami
  const comparisonRows = buildComparisonTable(
    previousStats,
    "Step 07 (obecne)",
    totalTokens,
    totalCost,
  );

  // 9a. Zapis stats.md
  const statsMarkdown =
    `# Step 07 — Kompaktowy format danych (pipe-separated)\n\n## Parametry\n- **Tani model:** ${CHEAP_MODEL}\n- **Drogi model:** ${EXPENSIVE_MODEL}\n- **Język promptu:** Angielski (skompresowany)\n- **Optymalizacje:** JS filter + EN + Model Routing + Trim kolumn + Kompresja promptu + Pipe format\n- **Ticketów Electronics:** ${ticketsForModel.length}\n- **High confidence (tani model):** ${highConfidence.length}\n- **Low confidence (→ drogi model):** ${lowConfidence.length}\n\n## Kompaktowy format danych\n- **JSON:** ${jsonChars} znaków\n- **Pipe-separated:** ${pipeChars} znaków (${savingPct}% mniej)\n\n## Zużycie tokenów\n| Faza | Model | Prompt | Completion | Total | Koszt |\n|------|-------|--------|------------|-------|-------|\n| Faza 1 | ${CHEAP_MODEL} | ${cheapUsage.prompt_tokens.toLocaleString()} | ${cheapUsage.completion_tokens.toLocaleString()} | ${cheapUsage.total_tokens.toLocaleString()} | $${cheapCost.toFixed(4)} |\n| Faza 2 | ${EXPENSIVE_MODEL} | ${expensiveUsage.prompt_tokens.toLocaleString()} | ${expensiveUsage.completion_tokens.toLocaleString()} | ${expensiveUsage.total_tokens.toLocaleString()} | $${expensiveCost.toFixed(4)} |\n| **SUMA** | — | ${totalPromptTokens.toLocaleString()} | ${totalCompletionTokens.toLocaleString()} | **${totalTokens.toLocaleString()}** | **$${totalCost.toFixed(4)}** |\n\n## Porównanie z poprzednimi krokami\n| Krok | Tokeny | Koszt | Oszcz. tokenów vs poprz. | Oszcz. kosztów vs poprz. |\n|------|--------|-------|----------------|----------------|\n${comparisonRows}\n\n## Czas odpowiedzi\n- Faza 1: ${elapsedPhase1}s\n- Faza 2: ${elapsedPhase2}s\n- **Łącznie:** ${totalElapsed}s\n\n## Przykład formatu pipe\n\`\`\`\n${exampleLines}\n...\`\`\`\n\n## Dlaczego pipe oszczędza tokeny\nJSON powtarza nazwy kluczy ("ticket_id", "subject", "description") dla każdego z ${ticketsForModel.length} ticketów.\nPipe używa jednego wiersza nagłówka — eliminuje ~${ticketsForModel.length * 3} powtórzeń kluczy.\n` +
    (await buildRefComparisonSection(
      finalTickets,
      "presentation/data/categorized_by_gpt_5_5_high_thinking_en.json",
    ));

  await writeFile(path.join(outputDir, "stats.md"), statsMarkdown, "utf8");
}

main().catch(console.error);
