/**
 * STEP 09 — Local model (LM Studio)
 *
 * Includes optimizations from previous steps:
 * - English prompt (step-02)
 * - JS filters rows by product_category (step-03)
 * - Model routing: cheap + expensive model (step-04)
 * - Column trim: only ticket_id, subject, description (step-05)
 * - Prompt compression (step-06)
 * - Pipe-separated format (step-07)
 * - Description truncation (step-08)
 *
 * New optimization:
 * - Replace the cheap paid model (gpt-4o-mini) with a local model via LM Studio
 * - Local model is FREE — phase 1 costs nothing
 * - Trade-off: slower processing, less precise model
 * - Phase 2 still uses gpt-5.5 for low-confidence tickets
 *
 * Note: requires LM Studio running with the qwen/qwen3-30b-a3b model
 * at http://localhost:1234/v1
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

// Client for gpt-5.5 (fallback for low confidence)
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Client for the local model via LM Studio
const localClient = new OpenAI({
  apiKey: "lm-studio",
  baseURL: "http://localhost:1234/v1",
});

const LOCAL_MODEL = "qwen/qwen3-30b-a3b";
const EXPENSIVE_MODEL = "gpt-5.5";

async function main() {
  const previousStats = await loadStatsBefore(9);

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

  const ticketsForModel = electronicsTickets.map((row) => ({
    ticket_id: row.ticket_id,
    subject: row.subject,
    description: row.description,
  }));

  // 2. Convert to pipe-separated format (from step-07)
  const pipeFormat = ticketsToPipeFormat(ticketsForModel);

  // 3. Load compressed prompt
  const compressedPrompt = await readFile(
    path.resolve(
      process.cwd(),
      "presentation/prompts/system-prompt-en-compressed.md",
    ),
    "utf8",
  );

  // 4. PHASE 1 — ✅ NEW OPTIMIZATION: Local model, one ticket at a time
  //    Local model doesn’t reliably support response_format, so:
  //    - We send a short prompt asking for JSON
  //    - We strip <think> tags and code fences from the response
  //    - On parse error, add with confidence="normal" (→ to phase 2)
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
    // Remove <think>...</think> blocks (CoT models)
    const withoutThink = rawContent
      .replace(/<think>[\s\S]*?<\/think>/g, "")
      .trim();
    // Remove code fences if present
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
      // Parse error — add with confidence="normal" so phase 2 handles it
      localTickets.push({ ticket_id: ticket.ticket_id, confidence: "normal" });
    }
  }

  process.stdout.write("\n");

  const elapsedPhase1 = ((Date.now() - startPhase1) / 1000).toFixed(1);

  // Local model is free — cost 0
  const localCost = 0;

  const highConfidence = localTickets.filter(
    (t: any) => t.confidence === "high",
  );
  // confidence "normal" and "low" go to phase 2
  const lowConfidence = localTickets.filter(
    (t: any) => t.confidence === "low" || t.confidence === "normal",
  );

  // 5. PHASE 2 — Expensive model ONLY for low/normal confidence (if any)
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

  // 6. Merge results
  const finalTickets = mergeRoutedTickets(
    highConfidence,
    expensiveTickets,
    lowConfidence,
    LOCAL_MODEL,
    EXPENSIVE_MODEL,
  );

  // 7. Summary statistics
  // Phase 1 (local) has cost = 0
  const totalPromptTokens =
    localTotalPromptTokens + expensiveUsage.prompt_tokens;
  const totalCompletionTokens =
    localTotalCompletionTokens + expensiveUsage.completion_tokens;
  const totalTokens = totalPromptTokens + totalCompletionTokens;
  const totalCost = localCost + expensiveCost;
  const totalElapsed = (
    parseFloat(elapsedPhase1) + parseFloat(elapsedPhase2)
  ).toFixed(1);

  // 8. Save history
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
        optimization: `Local model: ${LOCAL_MODEL} (phase 1, cost = 0) + ${EXPENSIVE_MODEL} (phase 2)`,
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

  // 9. Comparison table with previous steps
  const comparisonRows = buildComparisonTable(
    previousStats,
    "Step 09 (current)",
    totalTokens,
    totalCost,
  );

  // 9a. Save stats.md
  const statsMarkdown =
    `# Step 09 — Local model (LM Studio)\n\n## Parameters\n- **Local model (phase 1):** ${LOCAL_MODEL} (LM Studio)\n- **Expensive model (phase 2):** ${EXPENSIVE_MODEL}\n- **Prompt language:** English (compressed)\n- **Optimizations:** JS filter + EN + Model Routing + Column trim + Prompt compression + Pipe format + Local model\n- **Electronics tickets:** ${ticketsForModel.length}\n- **High confidence (local model):** ${highConfidence.length}\n- **Low/Normal confidence (→ expensive model):** ${lowConfidence.length}\n\n## Cost\n- **Phase 1 (local model):** $0.0000 (free!)\n- **Phase 2 (${EXPENSIVE_MODEL}):** $${expensiveCost.toFixed(4)}\n- **Total:** $${totalCost.toFixed(4)}\n\n## Token usage (local model counts tokens but they cost nothing)\n| Phase | Model | Prompt | Completion | Total | Cost |\n|-------|-------|--------|------------|-------|------|\n| Phase 1 | ${LOCAL_MODEL} | ${localTotalPromptTokens.toLocaleString()} | ${localTotalCompletionTokens.toLocaleString()} | ${(localTotalPromptTokens + localTotalCompletionTokens).toLocaleString()} | $0.0000 |\n| Phase 2 | ${EXPENSIVE_MODEL} | ${expensiveUsage.prompt_tokens.toLocaleString()} | ${expensiveUsage.completion_tokens.toLocaleString()} | ${expensiveUsage.total_tokens.toLocaleString()} | $${expensiveCost.toFixed(4)} |\n| **TOTAL** | — | ${totalPromptTokens.toLocaleString()} | ${totalCompletionTokens.toLocaleString()} | **${totalTokens.toLocaleString()}** | **$${totalCost.toFixed(4)}** |\n\n## Comparison with previous steps\n| Step | Tokens | Cost | Token savings vs prev. | Cost savings vs prev. |\n|------|--------|------|------------------------|----------------------|\n${comparisonRows}\n\n## Response time\n- Phase 1: ${elapsedPhase1}s (local model, one ticket at a time)\n- Phase 2: ${elapsedPhase2}s\n- **Total:** ${totalElapsed}s\n\n## How the local model works\n- Each ticket sent individually (no response_format)\n- Response cleaned of <think> tags and code fences\n- Parse error = confidence "normal" → goes to phase 2\n` +
    +(await buildRefComparisonSection(
      finalTickets,
      "presentation/data/categorized_by_gpt_5_5_high_thinking_en.json",
    ));

  await writeFile(path.join(outputDir, "stats.md"), statsMarkdown, "utf8");
}

main().catch(console.error);
