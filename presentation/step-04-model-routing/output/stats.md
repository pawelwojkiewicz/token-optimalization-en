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

| Faza     | Model       | Prompt | Completion | Total      | Koszt       |
| -------- | ----------- | ------ | ---------- | ---------- | ----------- |
| Faza 1   | gpt-4o-mini | 9,496  | 548        | 10,044     | $0.0018     |
| Faza 2   | gpt-5       | 472    | 298        | 770        | $0.0113     |
| **SUMA** | —           | 9,968  | 846        | **10,814** | **$0.0131** |

## Porównanie z poprzednimi krokami

| Krok                    | Tokeny     | Koszt       | Oszcz. tokenów vs poprz. | Oszcz. kosztów vs poprz. |
| ----------------------- | ---------- | ----------- | ------------------------ | ------------------------ |
| Step 01 (PL, brak opt.) | 12,875     | $0.1611     | — (baseline)             | — (baseline)             |
| Step 02 (EN)            | 10,074     | $0.1338     | 2,801 (21.8%)            | $0.0273 (16.9%)          |
| Step 03 (JS filter)     | 4,447      | $0.0861     | 5,627 (55.9%)            | $0.0477 (35.7%)          |
| **Step 04 (obecne)**    | **10,814** | **$0.0131** | -6,367 (-143.2%)         | $0.0730 (84.8%)          |

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
