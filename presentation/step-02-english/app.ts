/**
 * STEP 02 — Język angielski
 *
 * Optymalizacja: Prompt + dane w języku angielskim
 * (polskie znaki diakrytyczne = więcej tokenów)
 *
 * Wszystko inne identyczne jak w step-01:
 * - Wysyłamy CAŁY CSV do modelu (wszystkie kolumny, wszystkie wiersze)
 * - Używamy drogiego modelu (gpt-5.5)
 * - Brak jakiegokolwiek filtrowania po stronie JS
 * - Jedno duże wywołanie API
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

  // 1. Wczytaj CAŁY plik CSV (angielska wersja) jako surowy tekst
  const csvPath = path.resolve(process.cwd(), "presentation/data/e-commerce-tickets-en.csv");
  const csvContent = await readFile(csvPath, "utf8");

  const lineCount = csvContent.split("\n").filter((l) => l.trim()).length;

  // 2. Prompt systemowy — po angielsku (wczytany z pliku)
  const basePrompt = await readFile(
    path.resolve(process.cwd(), "presentation/prompts/system-prompt-en.md"),
    "utf8",
  );
  const systemPrompt = `${basePrompt}

IMPORTANT: Return ONLY tickets where the product_category column is "Electronics".
Filter out all other product categories.`;

  // 3. Wiadomość użytkownika — cały CSV bez żadnej obróbki
  const userMessage = `Here is a CSV file with customer support tickets. Analyze EVERY ticket, classify it (priority + sentiment), then return ONLY tickets with product_category "Electronics".

${csvContent}`;

  // 4. Wywołanie API
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

  // 5. Parsowanie wyniku
  const result = JSON.parse(response.choices[0]?.message?.content ?? "{}");
  const tickets = result.tickets ?? [];

  // 5a. Zapis historii czatu
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

  // 6. Statystyki tokenów
  const {
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: totalTokens,
  } = response.usage!;
  const costUSD = calculateCost(MODEL, promptTokens, completionTokens);

  // Tabela porównawcza z poprzednimi krokami
  const comparisonRows = buildComparisonTable(
    previousStats,
    "Step 02 (obecne)",
    totalTokens,
    costUSD,
  );

  // 6a. Porównanie z plikiem referencyjnym (EN: "Electronics")
  const comparisonSection = await buildRefComparisonSection(
    tickets,
    "presentation/data/categorized_by_gpt_5_5_high_thinking_en.json",
  );

  // 6b. Zapis stats.md
  const statsMarkdown =
    `# Step 02 — Angielski prompt\n\n## Parametry\n- **Model:** ${MODEL}\n- **Język promptu:** Angielski\n- **Optymalizacja:** Zamiana języka PL → EN (mniej tokenów)\n- **Ticketów w CSV:** ${lineCount}\n- **Zwróconych (Electronics):** ${tickets.length}\n\n## Zużycie tokenów\n| Metryka | Wartość |\n|---------|---------|\n| Prompt tokens | ${promptTokens.toLocaleString()} |\n| Completion tokens | ${completionTokens.toLocaleString()} |\n| **TOTAL tokens** | **${totalTokens.toLocaleString()}** |\n| **Koszt** | **$${costUSD.toFixed(4)}** |\n\n## Porównanie z poprzednimi krokami\n| Krok | Tokeny | Koszt | Oszcz. tokenów vs poprz. | Oszcz. kosztów vs poprz. |\n|------|--------|-------|----------------|----------------|\n${comparisonRows}\n\n## Czas odpowiedzi\n${elapsed}s\n` +
    comparisonSection;

  await writeFile(path.join(outputDir, "stats.md"), statsMarkdown, "utf8");
}

main().catch(console.error);
