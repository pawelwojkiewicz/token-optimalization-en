/**
 * STEP 01 — No optimization
 *
 * What we do wrong (intentionally):
 * - Send the ENTIRE CSV to the model (all columns, all rows)
 * - Prompt in Polish (more tokens due to Polish diacritics)
 * - Using the expensive model (gpt-5.5)
 * - Single large API call
 */

import OpenAI from "openai";
import "dotenv/config";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { buildRefComparisonSection, calculateCost } from "../shared/helpers.js";
import { TICKET_CLASSIFICATION_SCHEMA } from "../shared/schemas.js";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MODEL = "gpt-5.5";

async function main() {
  // 1. Load the ENTIRE CSV file as raw text
  const csvPath = path.resolve(
    process.cwd(),
    "presentation/data/e-commerce-tickets.csv",
  );
  const csvContent = await readFile(csvPath, "utf8");

  const lineCount = csvContent.split("\n").filter((l) => l.trim()).length;

  // 2. System prompt — in Polish (loaded from file)
  const basePrompt = await readFile(
    path.resolve(process.cwd(), "presentation/prompts/system-prompt-pl.md"),
    "utf8",
  );
  const systemPrompt = `${basePrompt}

WAŻNE: Zwróć TYLKO zgłoszenia dotyczące produktów z kategorii "Elektronika" (kolumna product_category).
Odfiltruj wszystkie inne kategorie produktów.`;

  // 3. User message — entire CSV with no preprocessing
  const userMessage = `Oto plik CSV ze zgłoszeniami klientów. Przeanalizuj KAŻDE zgłoszenie, sklasyfikuj je (priorytet + sentyment), a następnie zwróć TYLKO tickety z kategorią produktu "Elektronika".

${csvContent}`;

  // 4. Define agent and call API
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

  // 5a. Save full chat history to file
  const outputDir = path.resolve(
    process.cwd(),
    "presentation/step-01-no-optimization/output",
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

  // 6a. Comparison with reference file (PL — category "Electronics" in Polish: "Elektronika")
  const comparisonSection = await buildRefComparisonSection(
    tickets,
    "presentation/data/categorized_by_gpt_5_5_high_thinking.json",
    "Elektronika",
  );

  // 6b. Save stats.md
  const statsMarkdown =
    `# Step 01 \u2014 No optimization\n\n## Parameters\n- **Model:** ${MODEL}\n- **Prompt language:** Polish\n- **Optimizations:** NONE\n- **Tickets in CSV:** ${lineCount}\n- **Returned (Electronics):** ${tickets.length}\n\n## Token usage\n| Metric | Value |\n|--------|-------|\n| Prompt tokens | ${promptTokens.toLocaleString()} |\n| Completion tokens | ${completionTokens.toLocaleString()} |\n| **TOTAL tokens** | **${totalTokens.toLocaleString()}** |\n| **Cost** | **$${costUSD.toFixed(4)}** |\n\n## Response time\n${elapsed}s\n` +
    comparisonSection;

  await writeFile(path.join(outputDir, "stats.md"), statsMarkdown, "utf8");
}

main().catch(console.error);
