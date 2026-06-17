/**
 * STEP 03 — JS instead of model (filtering by product_category)
 *
 * Optimization: JS filters the CSV by product_category = "Electronics"
 * BEFORE the data reaches the model. The model gets only ~10 tickets instead of 70.
 *
 * In step-01/02 the model had to:
 * 1. Read the ENTIRE CSV (70 tickets, 14 columns)
 * 2. Find which tickets have product_category = Electronics by itself
 * 3. Classify them (priority + sentiment)
 * 4. Return only the filtered ones
 *
 * Here:
 * 1. JS parses the CSV and filters by product_category — 0 tokens
 * 2. Model receives ONLY Electronics tickets (~10) — huge savings
 * 3. Model classifies priority + sentiment
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

const MODEL = "gpt-5.5";

async function main() {
  const previousStats = await loadStatsBefore(3);

  // 1. Load CSV
  const csvPath = path.resolve(
    process.cwd(),
    "presentation/data/e-commerce-tickets-en.csv",
  );
  const csvContent = await readFile(csvPath, "utf8");

  // 2. ✅ JS FILTERS — this was done by the model in step-01/02!
  const allRecords = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
  }) as Record<string, string>[];
  const electronicsTickets = allRecords.filter(
    (row) => row.product_category === "Electronics",
  );

  // 3. System prompt from file
  const systemPrompt = await readFile(
    path.resolve(process.cwd(), "presentation/prompts/system-prompt-en.md"),
    "utf8",
  );

  const userMessage = `Here are ${electronicsTickets.length} customer support tickets. Classify each one.

${JSON.stringify(electronicsTickets, null, 2)}`;

  // 5. API call (only Electronics tickets)
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

  // 6. Parse result
  const result = JSON.parse(response.choices[0]?.message?.content ?? "{}");
  const tickets = result.tickets ?? [];

  // 6a. Save history
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

  // 7. Token statistics
  const {
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: totalTokens,
  } = response.usage!;
  const costUSD = calculateCost(MODEL, promptTokens, completionTokens);

  // Comparison table with previous steps
  const comparisonRows = buildComparisonTable(
    previousStats,
    "Step 03 (current)",
    totalTokens,
    costUSD,
  );

  // 7a. Comparison with reference file
  const comparisonSection = await buildRefComparisonSection(
    tickets,
    "presentation/data/categorized_by_gpt_5_5_high_thinking_en.json",
  );

  // 7b. Save stats.md
  const statsMarkdown =
    `# Step 03 — JS filters data BEFORE the model\n\n## Parameters\n- **Model:** ${MODEL}\n- **Prompt language:** English\n- **Optimization:** JS filters CSV by product_category="Electronics" → model receives less data\n- **Total tickets in CSV:** ${allRecords.length}\n- **Electronics tickets (after JS filter):** ${electronicsTickets.length}\n- **Filtered out by JS at 0 tokens:** ${allRecords.length - electronicsTickets.length}\n\n## Token usage\n| Metric | Value |\n|--------|-------|\n| Prompt tokens | ${promptTokens.toLocaleString()} |\n| Completion tokens | ${completionTokens.toLocaleString()} |\n| **TOTAL tokens** | **${totalTokens.toLocaleString()}** |\n| **Cost** | **$${costUSD.toFixed(4)}** |\n\n## Comparison with previous steps\n| Step | Tokens | Cost | Token savings vs prev. | Cost savings vs prev. |\n|------|--------|------|------------------------|----------------------|\n${comparisonRows}\n\n## Response time\n${elapsed}s\n\n## Notes\nJS filtered out ${allRecords.length - electronicsTickets.length} tickets at 0 token cost. The model in step-01 had to read ALL ${allRecords.length} tickets to find the same ${electronicsTickets.length}.\n` +
    comparisonSection;

  await writeFile(path.join(outputDir, "stats.md"), statsMarkdown, "utf8");
}

main().catch(console.error);
