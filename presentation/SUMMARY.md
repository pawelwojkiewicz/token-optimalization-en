# Podsumowanie optymalizacji tokenów

Wygenerowano: 10.06.2026, 14:17:14

## Tabela porównawcza

| Krok | Tokeny | Koszt | Czas | vs baseline | vs poprz. |
|------|--------|-------|------|-------------|-----------|
| Step 01 — PL, brak opt., gpt-5.5 | 10 850 | $0.0988 | 31.9s | — (baseline) | — |
| Step 02 — EN prompt, gpt-5.5 | 8386 | $0.0810 | 28.1s | -2,464 (23%) | -2,464 (23%) |
| Step 03 — JS filter wierszy, gpt-5.5 | 5589 | $0.0529 | — | -5,261 (48%) | -2,797 (33%) |
| Step 04 — Model routing | 11 532 | $0.0174 | 31.2s | +682 (-6%) | +5,943 (-106%) |
| Step 05 — Trim kolumn (3/14) | 3874 | $0.0084 | 18.8s | -6,976 (64%) | -7,658 (66%) |
| Step 06 — Kompresja promptu | 2574 | $0.0006 | 6.8s | -8,276 (76%) | -1,300 (34%) |
| Step 07 — Pipe-separated input | 2233 | $0.0006 | 6.9s | -8,617 (79%) | -341 (13%) |
| **Step 08 — Truncate description** | **1801** | **$0.0005** | **6.8s** | **-9,049 (83%)** | **-432 (19%)** |

## Całkowite oszczędności (Step 01 → Step 08)

| Metryka | Baseline | Wynik końcowy | Oszczędność |
|---------|----------|---------------|-------------|
| Tokeny | 10 850 | 1801 | **9049 (83.4%)** |
| Koszt | $0.0988 | $0.0005 | **$0.0983 (99.5%)** |
| Czas | 31.9s | 6.8s | **25.1s (78.7%)** |

## Skalowalność — realny scenariusz

> Firma wydała **\$14 000** na klasyfikację ticketów. Mogła wydać **~\$71**.

Proporcja oszczędności z tej prezentacji (`$0.0988 → $0.0005`, czyli **99.5%**) przełożona na skalę \$14 000:

| Scenariusz | Koszt |
|------------|-------|
| Bez optymalizacji (baseline) | **\$14 000** |
| Po optymalizacjach | **~\$71** |
| **Oszczędność** | **~\$13 929 (99.5%)** |

## Porównanie lokalnych modeli (step-09)

| Model | Odpalenia | Avg zgodność | Czas | Uwagi |
|-------|-----------|-------------|------|-------|
| gpt-4o-mini (referencja) | — | 100% | ~7s | punkt odniesienia |
| meta-llama-3.1-8b-instruct | 3× | **63.0%** | ~20s | 68% / 68% / 53% |
| qwen2.5-7b-instruct | 3× | **61.3%** | ~30s | 68% / 53% / 63% |
| google/gemma-4-e4b | 2× | **52.5%** | ~40s | 47% / 58% |

> ⚠️ Wszystkie trzy lokalne modele wykazały **bardzo niską zgodność** z referencją — poniżej 65% średnio.
> Najlepszy wynik: meta-llama-3.1-8b-instruct (avg 63%), ale nadal o 37 punktów procentowych gorszy od gpt-4o-mini.
> Wysoka zmienność między odpaleniami (różnice do 15 pp) sugeruje brak stabilności klasyfikacji lokalnych modeli.
> 💡 Testowane modele to modele 7–8B parametrów. Modele z większą liczbą parametrów (np. 32B, 70B) mogłyby osiągnąć znacznie lepszą zgodność — kosztem wyższych wymagań sprzętowych i dłuższego czasu inferencji.
