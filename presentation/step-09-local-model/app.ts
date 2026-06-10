/**
 * STEP 09 — Lokalny model (LM Studio)
 *
 * Zawiera optymalizacje z poprzednich kroków:
 * - Angielski prompt (step-02)
 * - JS filtruje wiersze po product_category (step-03)
 * - Model routing: tani + drogi model (step-04)
 * - Trim kolumn: tylko ticket_id, subject, description (step-05)
 * - Kompresja promptu (step-06)
 * - Pipe-separated format (step-07)
 * - Obcinanie opisów (step-08)
 *
 * Nowa optymalizacja:
 * - Zastąpienie taniego płatnego modelu (gpt-4.1-mini) lokalnym modelem przez LM Studio
 * - Lokalny model jest DARMOWY — faza 1 nie kosztuje nic
 * - Trade-off: wolniejsze przetwarzanie, model mniej precyzyjny
 * - Faza 2 nadal używa gpt-5 dla low-confidence ticketów
 *
 * Uwaga: wymaga uruchomionego LM Studio z modelem google/gemma-4-e4b
 * pod adresem http://localhost:1234/v1
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

// Klient do gpt-5 (fallback dla low confidence)
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Klient do lokalnego modelu przez LM Studio
const localClient = new OpenAI({
  apiKey: "lm-studio",
  baseURL: "http://localhost:1234/v1",
});

const LOCAL_MODEL = "google/gemma-4-e4b";
const EXPENSIVE_MODEL = "gpt-5";

async function main() {
  const previousStats = await loadStatsBefore(9);

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

  // 2. Konwersja do pipe-separated format (z step-07)
  const pipeFormat = ticketsToPipeFormat(ticketsForModel);

  // 3. Wczytaj skompresowany prompt
  const compressedPrompt = await readFile(
    path.resolve(
      process.cwd(),
      "presentation/prompts/system-prompt-en-compressed.md",
    ),
    "utf8",
  );

  // 4. FAZA 1 — ✅ NOWA OPTYMALIZACJA: Lokalny model, każdy ticket osobno
  //    Lokalny model nie obsługuje response_format niezawodnie, więc:
  //    - Wysyłamy krótki prompt proszący o JSON
  //    - Czyścimy odpowiedź ze znaczników <think> i code fences
  //    - W razie błędu parsowania dodajemy z confidence="normal" (→ do fazy 2)
  const localSystemPrompt = `You are a ticket classifier. For each ticket, return ONLY a JSON object (no markdown, no explanation):
{"ticket_id": "...", "product_category": "Electronics", "priority": "low|medium|high|critical", "sentiment": "positive|neutral|negative", "confidence": "high|normal|low"}`;

  const localTickets: any[] = [];
  let localTotalPromptTokens = 0;
  let localTotalCompletionTokens = 0;

  const startPhase1 = Date.now();

  for (const ticket of ticketsForModel) {
    const localUserMessage = `Classify this ticket:
ticket_id: ${ticket.ticket_id}
subject: ${ticket.subject}
description: ${ticket.description}`;

    const localResponse = await localClient.chat.completions.create({
      model: LOCAL_MODEL,
      messages: [
        { role: "system", content: localSystemPrompt },
        { role: "user", content: localUserMessage },
      ],
    });

    process.stdout.write(".");

    const rawContent = localResponse.choices[0]?.message?.content ?? "";
    // Usuń bloki <think>...</think> (modele CoT)
    const withoutThink = rawContent
      .replace(/<think>[\s\S]*?<\/think>/g, "")
      .trim();
    // Usuń code fences jeśli są
    const cleaned = withoutThink
      .replace(/^```(?:json)?\n?/, "")
      .replace(/\n?```$/, "")
      .trim();

    if (localResponse.usage) {
      localTotalPromptTokens += localResponse.usage.prompt_tokens;
      localTotalCompletionTokens += localResponse.usage.completion_tokens;
    }

    try {
      const parsed = JSON.parse(cleaned);
      localTickets.push(parsed);
    } catch {
      // Błąd parsowania — dodaj z confidence="normal" żeby faza 2 rozpatrzyła
      localTickets.push({ ticket_id: ticket.ticket_id, confidence: "normal" });
    }
  }

  process.stdout.write("\n");

  const elapsedPhase1 = ((Date.now() - startPhase1) / 1000).toFixed(1);

  // Lokalny model jest darmowy — koszt 0
  const localCost = 0;

  const highConfidence = localTickets.filter(
    (t: any) => t.confidence === "high",
  );
  // confidence "normal" i "low" idą do fazy 2
  const lowConfidence = localTickets.filter(
    (t: any) => t.confidence === "low" || t.confidence === "normal",
  );

  // 5. FAZA 2 — Drogi model TYLKO dla low/normal confidence (jeśli są)
  let expensiveCost = 0;
  let expensiveUsage = {
    prompt_tokens: 0,
    completion_tokens: 0,
    total_tokens: 0,
  };
  let elapsedPhase2 = "0";
  let expensiveTickets: any[] = [];

  const systemPromptWithPipeInfo = `${compressedPrompt}

Input format: pipe-separated text with header row: ticket_id|subject|description`;

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
    LOCAL_MODEL,
    EXPENSIVE_MODEL,
  );

  // 7. Sumaryczne statystyki
  // Faza 1 (lokalny) ma koszt = 0
  const totalPromptTokens =
    localTotalPromptTokens + expensiveUsage.prompt_tokens;
  const totalCompletionTokens =
    localTotalCompletionTokens + expensiveUsage.completion_tokens;
  const totalTokens = totalPromptTokens + totalCompletionTokens;
  const totalCost = localCost + expensiveCost;
  const totalElapsed = (
    parseFloat(elapsedPhase1) + parseFloat(elapsedPhase2)
  ).toFixed(1);

  // 8. Zapis historii
  const outputDir = path.resolve(
    process.cwd(),
    "presentation/step-09-local-model/output",
  );
  await mkdir(outputDir, { recursive: true });

  await writeFile(
    path.join(outputDir, "chat-history.json"),
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        optimization: `Lokalny model: ${LOCAL_MODEL} (faza 1, koszt = 0) + ${EXPENSIVE_MODEL} (faza 2)`,
        routing: {
          localModel: LOCAL_MODEL,
          expensiveModel: EXPENSIVE_MODEL,
          totalTickets: ticketsForModel.length,
          highConfidence: highConfidence.length,
          lowConfidence: lowConfidence.length,
        },
        phase1: {
          model: LOCAL_MODEL,
          promptTokens: localTotalPromptTokens,
          completionTokens: localTotalCompletionTokens,
          cost: localCost,
        },
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
    "Step 09 (obecne)",
    totalTokens,
    totalCost,
  );

  // 9a. Zapis stats.md
  const statsMarkdown =
    `# Step 09 — Lokalny model (LM Studio)\n\n## Parametry\n- **Lokalny model (faza 1):** ${LOCAL_MODEL} (LM Studio)\n- **Drogi model (faza 2):** ${EXPENSIVE_MODEL}\n- **Język promptu:** Angielski (skompresowany)\n- **Optymalizacje:** JS filter + EN + Model Routing + Trim kolumn + Kompresja promptu + Pipe format + Lokalny model\n- **Ticketów Electronics:** ${ticketsForModel.length}\n- **High confidence (lokalny model):** ${highConfidence.length}\n- **Low/Normal confidence (→ drogi model):** ${lowConfidence.length}\n\n## Koszt\n- **Faza 1 (lokalny model):** $0.0000 (darmowy!)\n- **Faza 2 (${EXPENSIVE_MODEL}):** $${expensiveCost.toFixed(4)}\n- **Łącznie:** $${totalCost.toFixed(4)}\n\n## Zużycie tokenów (lokalny model zlicza, ale nie kosztuje)\n| Faza | Model | Prompt | Completion | Total | Koszt |\n|------|-------|--------|------------|-------|-------|\n| Faza 1 | ${LOCAL_MODEL} | ${localTotalPromptTokens.toLocaleString()} | ${localTotalCompletionTokens.toLocaleString()} | ${(localTotalPromptTokens + localTotalCompletionTokens).toLocaleString()} | $0.0000 |\n| Faza 2 | ${EXPENSIVE_MODEL} | ${expensiveUsage.prompt_tokens.toLocaleString()} | ${expensiveUsage.completion_tokens.toLocaleString()} | ${expensiveUsage.total_tokens.toLocaleString()} | $${expensiveCost.toFixed(4)} |\n| **SUMA** | — | ${totalPromptTokens.toLocaleString()} | ${totalCompletionTokens.toLocaleString()} | **${totalTokens.toLocaleString()}** | **$${totalCost.toFixed(4)}** |\n\n## Porównanie z poprzednimi krokami\n| Krok | Tokeny | Koszt | Oszcz. tokenów vs poprz. | Oszcz. kosztów vs poprz. |\n|------|--------|-------|----------------|----------------|\n${comparisonRows}\n\n## Czas odpowiedzi\n- Faza 1: ${elapsedPhase1}s (lokalny model, każdy ticket osobno)\n- Faza 2: ${elapsedPhase2}s\n- **Łącznie:** ${totalElapsed}s\n\n## Jak działa lokalny model\n- Każdy ticket wysyłany osobno (brak response_format)\n- Odpowiedź oczyszczana ze znaczników <think> i code fences\n- Błąd parsowania = confidence "normal" → faza 2\n- Darmowy, ale wolniejszy od API\n` +
    (await buildRefComparisonSection(
      finalTickets,
      "presentation/data/categorized_by_gpt_5_5_high_thinking_en.json",
    ));

  await writeFile(path.join(outputDir, "stats.md"), statsMarkdown, "utf8");
}

main().catch(console.error);
