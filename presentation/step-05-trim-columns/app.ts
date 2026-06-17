/**
 * STEP 05 — Column trimming (send only needed fields)
 *
 * Includes optimizations from previous steps:
 * - English prompt (step-02)
 * - JS filters rows by product_category (step-03)
 * - Model routing: cheap + expensive model (step-04)
 *
 * New optimization:
 * - Instead of sending all 14 CSV columns to the model,
 *   we send ONLY the fields needed for classification: ticket_id, subject, description
 * - Model doesn’t need to read customer_email, phone, order_id, etc.
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

const CHEAP_MODEL = "gpt-4o-mini";
const EXPENSIVE_MODEL = "gpt-5.5";

async function main() {
  const previousStats = await loadStatsBefore(5);

  // 1. Load CSV + JS row filtering (from step-03)
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

  // 2. ✅ NEW OPTIMIZATION: Column trim — only fields needed for classification
  const ticketsForModel = electronicsTickets.map((row) => ({
    ticket_id: row.ticket_id,
    subject: row.subject,
    description: row.description,
  }));

  const allColumnsSize = JSON.stringify(electronicsTickets, null, 2).length;
  const trimmedSize = JSON.stringify(ticketsForModel, null, 2).length;

  // 3. Load base prompt
  const basePrompt = await readFile(
    path.resolve(process.cwd(), "presentation/prompts/system-prompt-en.md"),
    "utf8",
  );

  // 4. PHASE 1 — Cheap model classifies EVERYTHING + confidence
  const userMessageCheap = `Here are ${ticketsForModel.length} customer support tickets. Classify each one with priority, sentiment, and confidence.

${JSON.stringify(ticketsForModel, null, 2)}`;

  const startPhase1 = Date.now();

  const responseCheap = await client.chat.completions.create({
    model: CHEAP_MODEL,
    response_format: TICKET_CLASSIFICATION_SCHEMA,
    messages: [
      { role: "system", content: basePrompt },
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

  // 5. PHASE 2 — Expensive model ONLY for low confidence (if any)
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

  // 6. Merge results
  const finalTickets = mergeRoutedTickets(
    highConfidence,
    expensiveTickets,
    lowConfidence,
    CHEAP_MODEL,
    EXPENSIVE_MODEL,
  );

  // 7. Summary statistics
  const totalPromptTokens =
    cheapUsage.prompt_tokens + expensiveUsage.prompt_tokens;
  const totalCompletionTokens =
    cheapUsage.completion_tokens + expensiveUsage.completion_tokens;
  const totalTokens = totalPromptTokens + totalCompletionTokens;
  const totalCost = cheapCost + expensiveCost;
  const totalElapsed = (
    parseFloat(elapsedPhase1) + parseFloat(elapsedPhase2)
  ).toFixed(1);

  // 8. Save history
  const outputDir = path.resolve(
    process.cwd(),
    "presentation/step-05-trim-columns/output",
  );
  await mkdir(outputDir, { recursive: true });

  await writeFile(
    path.join(outputDir, "chat-history.json"),
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        optimization: "Trim columns: 14 → 3 (ticket_id, subject, description)",
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

  // 9. Comparison table with previous steps
  const comparisonRows = buildComparisonTable(
    previousStats,
    "Step 05 (current)",
    totalTokens,
    totalCost,
  );

  // 9a. Save stats.md
  const statsMarkdown =
    `# Step 05 — Column trimming\n\n## Parameters\n- **Cheap model:** ${CHEAP_MODEL}\n- **Expensive model:** ${EXPENSIVE_MODEL}\n- **Prompt language:** English\n- **Optimizations:** JS row filter + EN + Model Routing + Column trim\n- **Electronics tickets:** ${ticketsForModel.length}\n- **Columns sent to model:** 3 of 14 (ticket_id, subject, description)\n- **High confidence (cheap model):** ${highConfidence.length}\n- **Low confidence (→ expensive model):** ${lowConfidence.length}\n\n## Token usage\n| Phase | Model | Prompt | Completion | Total | Cost |\n|-------|-------|--------|------------|-------|------|\n| Phase 1 | ${CHEAP_MODEL} | ${cheapUsage.prompt_tokens.toLocaleString()} | ${cheapUsage.completion_tokens.toLocaleString()} | ${cheapUsage.total_tokens.toLocaleString()} | $${cheapCost.toFixed(4)} |\n| Phase 2 | ${EXPENSIVE_MODEL} | ${expensiveUsage.prompt_tokens.toLocaleString()} | ${expensiveUsage.completion_tokens.toLocaleString()} | ${expensiveUsage.total_tokens.toLocaleString()} | $${expensiveCost.toFixed(4)} |\n| **TOTAL** | — | ${totalPromptTokens.toLocaleString()} | ${totalCompletionTokens.toLocaleString()} | **${totalTokens.toLocaleString()}** | **$${totalCost.toFixed(4)}** |\n\n## Comparison with previous steps\n| Step | Tokens | Cost | Token savings vs prev. | Cost savings vs prev. |\n|------|--------|------|------------------------|----------------------|\n${comparisonRows}\n\n## Response time\n- Phase 1: ${elapsedPhase1}s\n- Phase 2: ${elapsedPhase2}s\n- **Total:** ${totalElapsed}s\n\n## What we trim\nFrom 14 CSV columns we send only 3:\n- ✅ ticket_id (identifier)\n- ✅ subject (subject line — key for classification)\n- ✅ description (body — key for classification)\n- ❌ customer_name, customer_email, customer_phone, product_name, product_category, order_id, order_date, ticket_date, channel, status, country\n\nData size: ${(allColumnsSize / 1024).toFixed(1)} KB → ${(trimmedSize / 1024).toFixed(1)} KB (${((1 - trimmedSize / allColumnsSize) * 100).toFixed(0)}% less)\n` +
    (await buildRefComparisonSection(
      finalTickets,
      "presentation/data/categorized_by_gpt_5_5_high_thinking_en.json",
    ));

  await writeFile(path.join(outputDir, "stats.md"), statsMarkdown, "utf8");
}

main().catch(console.error);
