# Step 04 — Model Routing

## Parametry
- **Tani model:** gpt-4o-mini
- **Drogi model:** gpt-5.5
- **Język promptu:** Angielski
- **Optymalizacje:** JS filtering + EN + Model Routing
- **Ticketów Electronics:** 19
- **High confidence (tani model):** 17
- **Medium/Low confidence (→ drogi model):** 2

## Zużycie tokenów
| Faza | Model | Prompt | Completion | Total | Koszt |
|------|-------|--------|------------|-------|-------|
| Faza 1 | gpt-4o-mini | 9,520 | 548 | 10,068 | $0.0018 |
| Faza 2 | gpt-5.5 | 1,133 | 331 | 1,464 | $0.0156 |
| **SUMA** | — | 10,653 | 879 | **11,532** | **$0.0174** |

## Porównanie z poprzednimi krokami
| Krok | Tokeny | Koszt | Oszcz. tokenów vs poprz. | Oszcz. kosztów vs poprz. |
|------|--------|-------|----------------|----------------|
| Step 01 (PL, brak opt.) | 10,850 | $0.0988 | — (baseline) | — (baseline) |
| Step 02 (EN) | 8,386 | $0.0810 | 2,464 (22.7%) | $0.0178 (18.0%) |
| Step 03 (JS filter wierszy) | 5,589 | $0.0529 | 2,797 (33.4%) | $0.0281 (34.7%) |
| **Step 04 (obecne)** | **11,532** | **$0.0174** | -5,943 (-106.3%) | $0.0355 (67.2%) |

## Czas odpowiedzi
- Faza 1: 24.2s
- Faza 2: 7.0s
- **Łącznie:** 31.2s

## Jak to działa
1. Tani model (gpt-4o-mini) klasyfikuje WSZYSTKIE tickety + zwraca confidence
2. Tickety z confidence="high" → wynik końcowy (tanio!)
3. Tickety z confidence="medium"/"low" → reklasyfikacja drogim modelem (gpt-5.5)
4. Merge wyników

## Porównanie z plikiem referencyjnym
- **Tickety referencyjne (Electronics):** 19
- **Tickety zwrócone przez model:** 19

✅ **Dane idealnie się pokrywają!** Wszystkie 19 ticketów zgadza się co do ticket_id, priority i sentiment.
