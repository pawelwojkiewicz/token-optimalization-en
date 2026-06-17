/**
 * STEP 08 — Description truncation
 *
 * Includes optimizations from previous steps:
 * - English prompt (step-02)
 * - JS filters rows by product_category (step-03)
 * - Model routing: cheap + expensive model (step-04)
 * - Column trim: only ticket_id, subject, description (step-05)
 * - Prompt compression (step-06)
 * - Pipe-separated format (step-07)
 *
 * New optimization:
 * - Descriptions truncated to MAX_DESC_CHARS characters
 * - Most classification signal is in the first ~150 characters
 * - The rest is usually repetition and filler
 *
 * Trade-off: slight accuracy drop (a few tickets classified differently)
 * vs significant token savings per ticket
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

const CHEAP_MODEL = "gpt-4o-mini";
const EXPENSIVE_MODEL = "gpt-5.5";
const MAX_DESC_CHARS = 150;

async function main() {
  const previousStats = await loadStatsBefore(8);

  // 1. Load CSV + JS filtering + column trim
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

  // 2. ✅ NEW OPTIMIZATION: Truncate descriptions to MAX_DESC_CHARS characters
  const ticketsForModel = electronicsTickets.map((row) => ({
    ticket_id: row.ticket_id,
    subject: row.subject,
    description: row.description.slice(0, MAX_DESC_CHARS),
  }));

  const avgFull = Math.round(
    electronicsTickets.reduce((s, r) => s + r.description.length, 0) /
      electronicsTickets.length,
  );
  const avgTrunc = Math.round(
    ticketsForModel.reduce((s, r) => s + r.description.length, 0) /
      ticketsForModel.length,
  );
  const truncatedCount = electronicsTickets.filter(
    (r) => r.description.length > MAX_DESC_CHARS,
  ).length;

  // 3. Convert to pipe-separated format (from step-07)
  const jsonFormat = JSON.stringify(ticketsForModel, null, 2);
  const pipeFormat = ticketsToPipeFormat(ticketsForModel);
  const jsonChars = jsonFormat.length;
  const pipeChars = pipeFormat.length;
  const savingPct = (((jsonChars - pipeChars) / jsonChars) * 100).toFixed(0);
  const exampleLines = pipeFormat.split("\n").slice(0, 3).join("\n");

  // 4. Load compressed prompt + add pipe format instruction
  const compressedPrompt = await readFile(
    path.resolve(
      process.cwd(),
      "presentation/prompts/system-prompt-en-compressed.md",
    ),
    "utf8",
  );
  const systemPromptWithPipeInfo = `${compressedPrompt}

Input format: pipe-separated text with header row: ticket_id|subject|description`;

  // 5. PHASE 1 — Cheap model classifies EVERYTHING with pipe format
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

  // 6. PHASE 2 — Expensive model ONLY for low confidence (if any)
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

  // 7. Merge results
  const finalTickets = mergeRoutedTickets(
    highConfidence,
    expensiveTickets,
    lowConfidence,
    CHEAP_MODEL,
    EXPENSIVE_MODEL,
  );

  // 8. Summary statistics
  const totalPromptTokens =
    cheapUsage.prompt_tokens + expensiveUsage.prompt_tokens;
  const totalCompletionTokens =
    cheapUsage.completion_tokens + expensiveUsage.completion_tokens;
  const totalTokens = totalPromptTokens + totalCompletionTokens;
  const totalCost = cheapCost + expensiveCost;
  const totalElapsed = (
    parseFloat(elapsedPhase1) + parseFloat(elapsedPhase2)
  ).toFixed(1);

  // 9. Save history
  const outputDir = path.resolve(
    process.cwd(),
    "presentation/step-08-truncate-description/output",
  );
  await mkdir(outputDir, { recursive: true });

  await writeFile(
    path.join(outputDir, "chat-history.json"),
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        optimization: `Pipe format + Truncation: descriptions truncated to ${MAX_DESC_CHARS} chars (${truncatedCount}/${ticketsForModel.length} truncated, avg ${avgFull}\u2192${avgTrunc} chars)`,
        truncation: {
          maxChars: MAX_DESC_CHARS,
          truncatedCount,
          avgFull,
          avgTrunc,
        },
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

  // 10. Comparison table with previous steps
  const comparisonRows = buildComparisonTable(
    previousStats,
    "Step 08 (current)",
    totalTokens,
    totalCost,
  );

  // 10a. Save stats.md
  const statsMarkdown =
    `# Step 08 — Description truncation\n\n## Parameters\n- **Cheap model:** ${CHEAP_MODEL}\n- **Expensive model:** ${EXPENSIVE_MODEL}\n- **Prompt language:** English (compressed)\n- **Optimizations:** JS filter + EN + Model Routing + Column trim + Prompt compression + Pipe format + Truncation\n- **Electronics tickets:** ${ticketsForModel.length}\n- **High confidence (cheap model):** ${highConfidence.length}\n- **Low confidence (→ expensive model):** ${lowConfidence.length}\n\n## Description truncation\n- **Limit:** ${MAX_DESC_CHARS} characters\n- **Truncated descriptions:** ${truncatedCount}/${ticketsForModel.length}\n- **Average length before:** ${avgFull} characters\n- **Average length after:** ${avgTrunc} characters\n\n## Data format (pipe)\n- **JSON:** ${jsonChars} characters\n- **Pipe-separated:** ${pipeChars} characters (${savingPct}% less)\n\n## Token usage\n| Phase | Model | Prompt | Completion | Total | Cost |\n|-------|-------|--------|------------|-------|------|\n| Phase 1 | ${CHEAP_MODEL} | ${cheapUsage.prompt_tokens.toLocaleString()} | ${cheapUsage.completion_tokens.toLocaleString()} | ${cheapUsage.total_tokens.toLocaleString()} | $${cheapCost.toFixed(4)} |\n| Phase 2 | ${EXPENSIVE_MODEL} | ${expensiveUsage.prompt_tokens.toLocaleString()} | ${expensiveUsage.completion_tokens.toLocaleString()} | ${expensiveUsage.total_tokens.toLocaleString()} | $${expensiveCost.toFixed(4)} |\n| **TOTAL** | — | ${totalPromptTokens.toLocaleString()} | ${totalCompletionTokens.toLocaleString()} | **${totalTokens.toLocaleString()}** | **$${totalCost.toFixed(4)}** |\n\n## Comparison with previous steps\n| Step | Tokens | Cost | Token savings vs prev. | Cost savings vs prev. |\n|------|--------|------|------------------------|----------------------|\n${comparisonRows}\n\n## Response time\n- Phase 1: ${elapsedPhase1}s\n- Phase 2: ${elapsedPhase2}s\n- **Total:** ${totalElapsed}s\n\n## Pipe format example\n\`\`\`\n${exampleLines}\n...\`\`\`\n` +
    (await buildRefComparisonSection(
      finalTickets,
      "presentation/data/categorized_by_gpt_5_5_high_thinking_en.json",
    ));

  await writeFile(path.join(outputDir, "stats.md"), statsMarkdown, "utf8");
}

main().catch(console.error);
