# Step 04 — Model Routing

## Parametry
- **Tani model:** gpt-4o-mini
- **Drogi model:** gpt-5
- **Język promptu:** Angielski
- **Optymalizacje:** JS filtering + EN + Model Routing
- **Ticketów Electronics:** 19
- **High confidence (tani model):** 18
- **Low confidence (→ drogi model):** 1

## Zużycie tokenów
| Faza | Model | Prompt | Completion | Total | Koszt |
|------|-------|--------|------------|-------|-------|
| Faza 1 | gpt-4o-mini | 9,496 | 548 | 10,044 | $0.0018 |
| Faza 2 | gpt-5 | 472 | 298 | 770 | $0.0137 |
| **SUMA** | — | 9,968 | 846 | **10,814** | **$0.0154** |

## Porównanie z poprzednimi krokami
| Krok | Tokeny | Koszt | Oszcz. tokenów vs poprz. | Oszcz. kosztów vs poprz. |
|------|--------|-------|----------------|----------------|
| Step 01 (PL, brak opt.) | 12,875 | $0.2061 | — (baseline) | — (baseline) |
| Step 02 (EN) | 10,074 | $0.1675 | 2,801 (21.8%) | $0.0386 (18.7%) |
| Step 03 (JS filter) | 4,447 | $0.0956 | 5,627 (55.9%) | $0.0719 (42.9%) |
| **Step 04 (obecne)** | **10,814** | **$0.0154** | -6,367 (-143.2%) | $0.0802 (83.9%) |

## Czas odpowiedzi
- Faza 1: 13.2s
- Faza 2: 6.2s
- **Łącznie:** 19.4s

## Jak to działa
1. Tani model (gpt-4o-mini) klasyfikuje WSZYSTKIE tickety + zwraca confidence
2. Tickety z confidence="high" → wynik końcowy (tanio!)
3. Tickety z confidence="low" → reklasyfikacja drogim modelem (gpt-5)
4. Merge wyników

## Kluczowa oszczędność
Gdyby wszystkie 19 ticketów leciały przez gpt-5 (jak w step-03): ~$0.09
Z routingiem: większość przez gpt-4o-mini (25x tańszy) → ogromna oszczędność kosztowa.

## Porównanie z plikiem referencyjnym
- **Tickety referencyjne (Electronics):** 19
- **Tickety zwrócone przez model:** 19

✅ **Dane idealnie się pokrywają!** Wszystkie 19 ticketów zgadza się co do ticket_id, priority i sentiment.
