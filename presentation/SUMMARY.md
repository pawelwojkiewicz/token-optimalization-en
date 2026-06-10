# Podsumowanie optymalizacji tokenów

Wygenerowano: 27.05.2026, 11:00:05

## Tabela porównawcza

| Krok                               | Tokeny   | Koszt       | Czas     | vs baseline       | vs poprz.      |
| ---------------------------------- | -------- | ----------- | -------- | ----------------- | -------------- |
| Step 01 — PL, brak opt., gpt-5     | 12 875   | $0.1611     | 43.0s    | — (baseline)      | —              |
| Step 02 — EN prompt, gpt-5         | 10 074   | $0.1338     | 51.0s    | -2,801 (22%)      | -2,801 (22%)   |
| Step 03 — JS filter wierszy        | 4447     | $0.0861     | 26.7s    | -8,428 (65%)      | -5,627 (56%)   |
| Step 04 — Model routing            | 10 814   | $0.0131     | 19.4s    | -2,061 (16%)      | +6,367 (-143%) |
| Step 05 — Trim kolumn (3/14)       | 2854     | $0.0018     | 6.0s     | -10,021 (78%)     | -7,960 (74%)   |
| Step 06 — Kompresja promptu        | 2504     | $0.0016     | 8.1s     | -10,371 (81%)     | -350 (12%)     |
| Step 07 — Pipe-separated input     | 2152     | $0.0015     | 7.9s     | -10,723 (83%)     | -352 (14%)     |
| **Step 08 — Truncate description** | **1808** | **$0.0013** | **7.6s** | **-11,067 (86%)** | **-344 (16%)** |

## Całkowite oszczędności (Step 01 → Step 08)

| Metryka | Baseline | Wynik końcowy | Oszczędność         |
| ------- | -------- | ------------- | ------------------- |
| Tokeny  | 12 875   | 1808          | **11 067 (86.0%)**  |
| Koszt   | $0.1611  | $0.0013       | **$0.1598 (99.2%)** |
| Czas    | 43.0s    | 7.6s          | **35.4s (82.3%)**   |

## Skalowalność — realny scenariusz

> Firma wydała **14 000 USD** na klasyfikację ticketów. Mogła wydać **~$113**.

Proporcja oszczędności z tej prezentacji (`$0.1611 → $0.0013`, czyli **99.2%**) przełożona na skalę $14 000:

| Scenariusz                   | Koszt                |
| ---------------------------- | -------------------- |
| Bez optymalizacji (baseline) | **$14 000**          |
| Po optymalizacjach           | **~$113**            |
| **Oszczędność**              | **~$13 887 (99.2%)** |

Obliczenie: `$0.0013 / $0.1611 × $14 000 ≈ $113`

## Porównanie lokalnych modeli (step-09)

| Model                      | Odpalenia | Avg zgodność | Czas | Uwagi             |
| -------------------------- | --------- | ------------ | ---- | ----------------- |
| gpt-4.1-mini (referencja)  | —         | 100%         | ~7s  | punkt odniesienia |
| meta-llama-3.1-8b-instruct | 3×        | **63.0%**    | ~20s | 68% / 68% / 53%   |
| qwen2.5-7b-instruct        | 3×        | **61.3%**    | ~30s | 68% / 53% / 63%   |
| google/gemma-4-e4b         | 2×        | **52.5%**    | ~40s | 47% / 58%         |

> ⚠️ Wszystkie trzy lokalne modele wykazały **bardzo niską zgodność** z referencją — poniżej 65% średnio.
> Najlepszy wynik: meta-llama-3.1-8b-instruct (avg 63%), ale nadal o 37 punktów procentowych gorszy od gpt-4.1-mini.
> Wysoka zmienność między odpaleniami (różnice do 15 pp) sugeruje brak stabilności klasyfikacji lokalnych modeli.
> 💡 Testowane modele to modele 7–8B parametrów. Modele z większą liczbą parametrów (np. 32B, 70B) mogłyby osiągnąć znacznie lepszą zgodność — kosztem wyższych wymagań sprzętowych i dłuższego czasu inferencji.
