# Podsumowanie optymalizacji tokenów

Wygenerowano: 10.06.2026, 20:03:03

## Tabela porównawcza

| Krok | Tokeny | Koszt | Czas | Pokrycie | vs baseline | vs poprz. |
|------|--------|-------|------|----------|-------------|-----------|
| Step 01 — PL, brak opt., gpt-5.5 | 10 850 | $0.0988 | 31.9s | 19/19 | — (baseline) | — |
| Step 02 — EN prompt, gpt-5.5 | 8386 | $0.0810 | 28.1s | 19/19 | -2,464 (23%) | -2,464 (23%) |
| Step 03 — JS filter wierszy, gpt-5.5 | 5589 | $0.0529 | — | 19/19 | -5,261 (48%) | -2,797 (33%) |
| Step 04 — Model routing | 11 532 | $0.0174 | 31.2s | 19/19 | +682 (-6%) | +5,943 (-106%) |
| Step 05 — Trim kolumn (3/14) | 3874 | $0.0084 | 18.8s | 19/19 | -6,976 (64%) | -7,658 (66%) |
| Step 06 — Kompresja promptu | 2574 | $0.0006 | 6.8s | 19/19 | -8,276 (76%) | -1,300 (34%) |
| Step 07 — Pipe-separated input | 2276 | $0.0006 | 5.3s | 19/19 | -8,574 (79%) | -298 (12%) |
| **Step 08 — Truncate description** | **1804** | **$0.0005** | **5.3s** | **16/19** | **-9,046 (83%)** | **-472 (21%)** |

## Całkowite oszczędności (Step 01 → Step 08)

| Metryka | Baseline | Wynik końcowy | Oszczędność |
|---------|----------|---------------|-------------|
| Tokeny | 10 850 | 1804 | **9046 (83.4%)** |
| Koszt | $0.0988 | $0.0005 | **$0.0983 (99.5%)** |
| Czas | 31.9s | 5.3s | **26.6s (83.4%)** |

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
