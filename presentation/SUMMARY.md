# Podsumowanie optymalizacji tokenów

Wygenerowano: 27.05.2026, 11:00:05

## Tabela porównawcza

| Krok                               | Tokeny   | Koszt       | Czas     | vs baseline       | vs poprz.      |
| ---------------------------------- | -------- | ----------- | -------- | ----------------- | -------------- |
| Step 01 — PL, brak opt., gpt-5     | 12 478   | $0.1957     | 96.3s    | — (baseline)      | —              |
| Step 02 — EN prompt, gpt-5         | 10 014   | $0.1681     | —        | -2,464 (20%)      | -2,464 (20%)   |
| Step 03 — JS filter wierszy        | 5902     | $0.1410     | 97.2s    | -6,576 (53%)      | -4,112 (41%)   |
| Step 04 — Model routing            | 6543     | $0.0315     | 31s      | -5,935 (48%)      | +641 (-11%)    |
| Step 05 — Trim kolumn (3/14)       | 2767     | $0.0017     | 8.3s     | -9,711 (78%)      | -3,776 (58%)   |
| Step 06 — Kompresja promptu        | 2420     | $0.0016     | 5.5s     | -10,058 (81%)     | -347 (13%)     |
| Step 07 — Pipe-separated input     | 2071     | $0.0014     | 7.7s     | -10,407 (83%)     | -349 (14%)     |
| **Step 08 — Truncate description** | **1780** | **$0.0013** | **7.3s** | **-10,698 (86%)** | **-291 (14%)** |

## Całkowite oszczędności (Step 01 → Step 08)

| Metryka | Baseline | Wynik końcowy | Oszczędność         |
| ------- | -------- | ------------- | ------------------- |
| Tokeny  | 12 478   | 1780          | **10 698 (85.7%)**  |
| Koszt   | $0.1957  | $0.0013       | **$0.1944 (99.3%)** |
| Czas    | 96.3s    | 7.3s          | **89.0s (92.4%)**   |
## Skalowalność — realny scenariusz

> Firma wydała **14 000 USD** na klasyfikację ticketów. Mogła wydać **~93 USD**.

Proporcja oszczędności z tej prezentacji (`$0.1957 → $0.0013`, czyli **99.3%**) przełożona na skalę $14 000:

| Scenariusz | Koszt |
| --- | --- |
| Bez optymalizacji (baseline) | **$14 000** |
| Po optymalizacjach | **~$93** |
| **Oszczędność** | **~$13 907 (99.3%)** |

Obliczenie: `$0.0013 / $0.1957 × $14 000 ≈ $93`
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
