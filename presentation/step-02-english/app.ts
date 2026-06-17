/**
 * STEP 02 — English language
 *
 * Optimization: Prompt + data in English
 * (Polish diacritics = more tokens)
 *
 * Everything else identical to step-01:
 * - Send the ENTIRE CSV to the model (all columns, all rows)
 * - Using the expensive model (gpt-5.5)
 * - No JS-side filtering at all
 * - Single large API call
 */

import OpenAI from "openai";
import "dotenv/config";
import { readFile, writeFile, mkdir } from "node:fs/promises";
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
  const previousStats = await loadStatsBefore(2);

  // 1. Load the ENTIRE CSV file (English version) as raw text
  const csvPath = path.resolve(
    process.cwd(),
    "presentation/data/e-commerce-tickets-en.csv",
  );
  const csvContent = await readFile(csvPath, "utf8");

  const lineCount = csvContent.split("\n").filter((l) => l.trim()).length;

  // 2. System prompt — in English (loaded from file)
  const basePrompt = await readFile(
    path.resolve(process.cwd(), "presentation/prompts/system-prompt-en.md"),
    "utf8",
  );
  const systemPrompt = `${basePrompt}

IMPORTANT: Return ONLY tickets for products from the "Electronics" category (product_category column).
Filter out all other product categories.`;

  // 3. User message — entire CSV with no preprocessing
  const userMessage = `Here is a CSV file with customer support tickets. Analyze EVERY ticket, classify it (priority + sentiment), then return ONLY tickets with product_category "Electronics".

${csvContent}`;

  // 4. API call
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

  // 5. Parse result
  const result = JSON.parse(response.choices[0]?.message?.content ?? "{}");
  const tickets = result.tickets ?? [];

  // 5a. Save chat history
  const outputDir = path.resolve(
    process.cwd(),
    "presentation/step-02-english/output",
  );
  await mkdir(outputDir, { recursive: true });

  await writeFile(
    path.join(outputDir, "chat-history.json"),
    JSON.stringify(
      {
        model: MODEL,
        timestamp: new Date().toISOString(),
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

  // 6. Token statistics
  const {
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: totalTokens,
  } = response.usage!;
  const costUSD = calculateCost(MODEL, promptTokens, completionTokens);

  // Comparison table with previous steps
  const comparisonRows = buildComparisonTable(
    previousStats,
    "Step 02 (current)",
    totalTokens,
    costUSD,
  );

  // 6a. Comparison with reference file (EN: "Electronics")
  const comparisonSection = await buildRefComparisonSection(
    tickets,
    "presentation/data/categorized_by_gpt_5_5_high_thinking_en.json",
  );

  // 6b. Save stats.md
  const statsMarkdown =
    `# Step 02 \u2014 English prompt\n\n## Parameters\n- **Model:** ${MODEL}\n- **Prompt language:** English\n- **Optimization:** Language switch PL \u2192 EN (fewer tokens)\n- **Tickets in CSV:** ${lineCount}\n- **Returned (Electronics):** ${tickets.length}\n\n## Token usage\n| Metric | Value |\n|--------|-------|\n| Prompt tokens | ${promptTokens.toLocaleString()} |\n| Completion tokens | ${completionTokens.toLocaleString()} |\n| **TOTAL tokens** | **${totalTokens.toLocaleString()}** |\n| **Cost** | **$${costUSD.toFixed(4)}** |\n\n## Comparison with previous steps\n| Step | Tokens | Cost | Token savings vs prev. | Cost savings vs prev. |\n|------|--------|------|------------------------|----------------------|\n${comparisonRows}\n\n## Response time\n${elapsed}s\n` +
    comparisonSection;

  await writeFile(path.join(outputDir, "stats.md"), statsMarkdown, "utf8");
}

main().catch(console.error);
