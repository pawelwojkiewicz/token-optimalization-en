/**
 * STEP 04 — Model Routing (tani model + drogi model na trudne przypadki)
 *
 * Zawiera optymalizacje z poprzednich kroków:
 * - Angielski prompt (step-02)
 * - JS filtruje CSV po product_category (step-03)
 *
 * Nowa optymalizacja:
 * - Tani model (gpt-4o-mini) klasyfikuje WSZYSTKIE tickety + zwraca confidence
 * - Tylko tickety z confidence="medium" lub "low" trafiają do drogiego modelu (gpt-5)
 * - Reszta (confidence="high") zostaje z wynikami taniego modelu
 *
 * Efekt: Większość ticketów kosztuje ~25x mniej (gpt-4o-mini vs gpt-5)
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

//✅ 1. Parametry modeli
const CHEAP_MODEL = "gpt-4o-mini";
const EXPENSIVE_MODEL = "gpt-5";
const PHASE1_BATCH_SIZE = Number(process.env.LOCAL_CHEAP_BATCH_SIZE ?? "3");

async function main() {
  const previousStats = await loadStatsBefore(4);

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

  const basePrompt = await readFile(
    path.resolve(process.cwd(), "presentation/prompts/system-prompt-en.md"),
    "utf8",
  );

  //✅ 2.FAZA 1 — Tani model klasyfikuje WSZYSTKO + confidence
  // confidence: "high" = pewny, "medium" = niejednoznaczny, "low" = bardzo niejednoznaczny
  const systemPromptCheap =
    basePrompt +
    `

For the confidence field use these guidelines:
- high: the ticket clearly fits one priority/sentiment with no ambiguity
- medium: the ticket could reasonably fit 2 options (e.g. high vs critical, neutral vs negative)
- low: very ambiguous, short, or insufficient information to classify reliably

Be conservative — when in doubt between high and medium, choose medium.`;

  const startPhase1 = Date.now();
  const cheapTickets: any[] = [];
  let cheapUsage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

  for (let i = 0; i < electronicsTickets.length; i += PHASE1_BATCH_SIZE) {
    const batch = electronicsTickets.slice(i, i + PHASE1_BATCH_SIZE);
    const userMessageCheap = `Here are ${batch.length} customer support tickets. Classify each one with priority, sentiment, and confidence.

${JSON.stringify(batch, null, 2)}`;

    //✅ 3. Definiujemy tani model z odpowiednim promptem (dodajemy instrukcje dotyczące confidence)
    const responseCheap = await client.chat.completions.create({
      model: CHEAP_MODEL,
      response_format: TICKET_CLASSIFICATION_SCHEMA,
      messages: [
        { role: "system", content: systemPromptCheap },
        { role: "user", content: userMessageCheap },
      ],
    });

    const batchResult = JSON.parse(
      responseCheap.choices[0]?.message?.content ?? "{}",
    );
    cheapTickets.push(...(batchResult.tickets ?? []));

    const u = responseCheap.usage ?? {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
    };
    cheapUsage = {
      prompt_tokens: cheapUsage.prompt_tokens + u.prompt_tokens,
      completion_tokens: cheapUsage.completion_tokens + u.completion_tokens,
      total_tokens:
        cheapUsage.total_tokens +
        (u.total_tokens ?? u.prompt_tokens + u.completion_tokens),
    };
  }

  const elapsedPhase1 = ((Date.now() - startPhase1) / 1000).toFixed(1);
  const cheapCost = calculateCost(
    CHEAP_MODEL,
    cheapUsage.prompt_tokens,
    cheapUsage.completion_tokens,
  );

  // ✅ 3. Tylko "high" confidence zostaje z tanim modelem; "medium" i "low" idą do drogiego
  const highConfidence = cheapTickets.filter(
    (t: any) => t.confidence === "high",
  );
  const lowConfidence = cheapTickets.filter(
    (t: any) => t.confidence === "low" || t.confidence === "medium",
  );

  let expensiveCost = 0;
  let expensiveUsage = {
    prompt_tokens: 0,
    completion_tokens: 0,
    total_tokens: 0,
  };
  let elapsedPhase2 = "0";
  let expensiveTickets: any[] = [];

  if (lowConfidence.length > 0) {
    const lowIds = lowConfidence.map((t: any) => t.ticket_id);
    const ticketsForExpensive = electronicsTickets.filter((t) =>
      lowIds.includes(t.ticket_id),
    );

    //✅ 4. Definicja drogiego modelu i wywołanie API tylko na "medium"/"low confidence"

    const systemPromptExpensive = `${basePrompt}

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

  // ✅ 5. Merge wyników z obu modeli (pokaz chat-history.json)
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
    "presentation/step-04-model-routing/output",
  );
  await mkdir(outputDir, { recursive: true });

  await writeFile(
    path.join(outputDir, "chat-history.json"),
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        routing: {
          cheapModel: CHEAP_MODEL,
          expensiveModel: EXPENSIVE_MODEL,
          totalTickets: electronicsTickets.length,
          highConfidence: highConfidence.length,
          lowConfidence: lowConfidence.length,
        },
        phase1: {
          model: CHEAP_MODEL,
          usage: cheapUsage,
          cost: cheapCost,
          elapsed: elapsedPhase1,
        },
        phase2: {
          model: EXPENSIVE_MODEL,
          usage: expensiveUsage,
          cost: expensiveCost,
          elapsed: elapsedPhase2,
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
    "Step 04 (obecne)",
    totalTokens,
    totalCost,
  );

  // 8a. Zapis stats.md
  const statsMarkdown =
    `# Step 04 — Model Routing\n\n## Parametry\n- **Tani model:** ${CHEAP_MODEL}\n- **Drogi model:** ${EXPENSIVE_MODEL}\n- **Język promptu:** Angielski\n- **Optymalizacje:** JS filtering + EN + Model Routing\n- **Ticketów Electronics:** ${electronicsTickets.length}\n- **High confidence (tani model):** ${highConfidence.length}\n- **Medium/Low confidence (→ drogi model):** ${lowConfidence.length}\n\n## Zużycie tokenów\n| Faza | Model | Prompt | Completion | Total | Koszt |\n|------|-------|--------|------------|-------|-------|\n| Faza 1 | ${CHEAP_MODEL} | ${cheapUsage.prompt_tokens.toLocaleString()} | ${cheapUsage.completion_tokens.toLocaleString()} | ${cheapUsage.total_tokens.toLocaleString()} | $${cheapCost.toFixed(4)} |\n| Faza 2 | ${EXPENSIVE_MODEL} | ${expensiveUsage.prompt_tokens.toLocaleString()} | ${expensiveUsage.completion_tokens.toLocaleString()} | ${expensiveUsage.total_tokens.toLocaleString()} | $${expensiveCost.toFixed(4)} |\n| **SUMA** | — | ${totalPromptTokens.toLocaleString()} | ${totalCompletionTokens.toLocaleString()} | **${totalTokens.toLocaleString()}** | **$${totalCost.toFixed(4)}** |\n\n## Porównanie z poprzednimi krokami\n| Krok | Tokeny | Koszt | Oszcz. tokenów vs poprz. | Oszcz. kosztów vs poprz. |\n|------|--------|-------|----------------|----------------|\n${comparisonRows}\n\n## Czas odpowiedzi\n- Faza 1: ${elapsedPhase1}s\n- Faza 2: ${elapsedPhase2}s\n- **Łącznie:** ${totalElapsed}s\n\n## Jak to działa\n1. Tani model (${CHEAP_MODEL}) klasyfikuje WSZYSTKIE tickety + zwraca confidence\n2. Tickety z confidence="high" → wynik końcowy (tanio!)\n3. Tickety z confidence="medium"/"low" → reklasyfikacja drogim modelem (${EXPENSIVE_MODEL})\n4. Merge wyników\n` +
    (await buildRefComparisonSection(
      finalTickets,
      "presentation/data/categorized_by_gpt_5_5_high_thinking_en.json",
    ));

  await writeFile(path.join(outputDir, "stats.md"), statsMarkdown, "utf8");
}

main().catch(console.error);
