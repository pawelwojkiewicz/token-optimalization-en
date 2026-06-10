/**
 * STEP 01 — Brak optymalizacji
 *
 * Co robimy źle (celowo):
 * - Wysyłamy CAŁY CSV do modelu (wszystkie kolumny, wszystkie wiersze)
 * - Prompt po polsku (więcej tokenów przez polskie znaki)
 * - Używamy drogiego modelu (gpt-5.5)
 * - Jedno duże wywołanie API
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
  // 1. Wczytaj CAŁY plik CSV jako surowy tekst
  const csvPath = path.resolve(
    process.cwd(),
    "presentation/data/e-commerce-tickets.csv",
  );
  const csvContent = await readFile(csvPath, "utf8");

  const lineCount = csvContent.split("\n").filter((l) => l.trim()).length;

  // 2. Prompt systemowy — po polsku (wczytany z pliku)
  const basePrompt = await readFile(
    path.resolve(process.cwd(), "presentation/prompts/system-prompt-pl.md"),
    "utf8",
  );

  // 3. Wiadomość użytkownika — cały CSV bez żadnej obróbki
  const userMessage = `Oto plik CSV ze zgłoszeniami klientów. Przeanalizuj KAŻDE zgłoszenie, sklasyfikuj je (priorytet + sentyment), a następnie zwróć TYLKO tickety z kategorią produktu "Elektronika".

${csvContent}`;

  // 4. Definicja agenta i wywołanie API
  const startTime = Date.now();

  const response = await client.chat.completions.create({
    model: MODEL,
    response_format: TICKET_CLASSIFICATION_SCHEMA,
    messages: [
      { role: "system", content: basePrompt },
      { role: "user", content: userMessage },
    ],
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  // 5. Parsowanie wyniku
  const result = JSON.parse(response.choices[0]?.message?.content ?? "{}");
  const tickets = result.tickets ?? [];

  // 5a. Zapis pełnej historii czatu do pliku
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
          { role: "system", content: basePrompt },
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

  // 6a. Porównanie z plikiem referencyjnym (PL — kategoria "Elektronika")
  const comparisonSection = await buildRefComparisonSection(
    tickets,
    "presentation/data/categorized_by_gpt_5_5_high_thinking.json",
    "Elektronika",
  );

  // 6b. Zapis stats.md
  const statsMarkdown =
    `# Step 01 — Brak optymalizacji\n\n## Parametry\n- **Model:** ${MODEL}\n- **Język promptu:** Polski\n- **Optymalizacje:** BRAK\n- **Ticketów w CSV:** ${lineCount}\n- **Zwróconych (Elektronika):** ${tickets.length}\n\n## Zużycie tokenów\n| Metryka | Wartość |\n|---------|---------|\n| Prompt tokens | ${promptTokens.toLocaleString()} |\n| Completion tokens | ${completionTokens.toLocaleString()} |\n| **TOTAL tokens** | **${totalTokens.toLocaleString()}** |\n| **Koszt** | **$${costUSD.toFixed(4)}** |\n\n## Czas odpowiedzi\n${elapsed}s\n` +
    comparisonSection;

  await writeFile(path.join(outputDir, "stats.md"), statsMarkdown, "utf8");
}

main().catch(console.error);
