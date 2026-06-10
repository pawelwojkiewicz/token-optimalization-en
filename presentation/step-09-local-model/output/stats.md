# Step 09 — Lokalny model zamiast API (LM Studio)

## Parametry

- **Lokalny model (faza 1):** google/gemma-4-e4b @ LM Studio (koszt: $0)
- **Drogi model (fallback):** gpt-5.5
- **Język promptu:** Angielski (skompresowany)
- **Optymalizacje:** JS filter + EN + Model Routing + Trim kolumn + Kompresja promptu + Pipe format + Truncation + Lokalny model
- **Ticketów Electronics:** 19
- **High confidence (lokalny model):** 19
- **Low confidence (→ drogi model):** 0

## Obcinanie opisów

- **Limit:** 150 znaków
- **Obciętych opisów:** 0/19
- **Średnia długość przed:** 242 znaków
- **Średnia długość po:** 242 znaków

## Format danych (pipe)

- **JSON:** 6687 znaków
- **Pipe-separated:** 5422 znaków (19% mniej)

## Zużycie tokenów

| Faza     | Model                        | Prompt | Completion | Total     | Koszt       |
| -------- | ---------------------------- | ------ | ---------- | --------- | ----------- |
| Faza 1   | google/gemma-4-e4b (lokalny) | 3,749  | 1,810      | 5,559     | $0.0000     |
| Faza 2   | gpt-5.5                      | 0      | 0          | 0         | $0.0000     |
| **SUMA** | —                            | 3,749  | 1,810      | **5,559** | **$0.0000** |

## Porównanie z poprzednimi krokami

| Krok                        | Tokeny    | Koszt       | Oszcz. tokenów vs poprz. | Oszcz. kosztów vs poprz. |
| --------------------------- | --------- | ----------- | ------------------------ | ------------------------ |
| Step 01 (PL, brak opt.)     | 12,875    | $0.1611     | — (baseline)             | — (baseline)             |
| Step 02 (EN)                | 10,074    | $0.1338     | 2,801 (21.8%)            | $0.0273 (16.9%)          |
| Step 03 (JS filter wierszy) | 4,447     | $0.0861     | 5,627 (55.9%)            | $0.0477 (35.7%)          |
| Step 04 (Model routing)     | 10,814    | $0.0131     | -6,367 (-143.2%)         | $0.0730 (84.8%)          |
| Step 05 (Trim kolumn)       | 2,854     | $0.0018     | 7,960 (73.6%)            | $0.0113 (86.3%)          |
| Step 06 (Kompresja promptu) | 2,504     | $0.0016     | 350 (12.3%)              | $0.0002 (11.1%)          |
| Step 07 (Pipe format)       | 2,156     | $0.0015     | 348 (13.9%)              | $0.0001 (6.3%)           |
| Step 08 (Truncation)        | 1,808     | $0.0013     | 348 (16.1%)              | $0.0002 (13.3%)          |
| **Step 09 (obecne)**        | **5,559** | **$0.0000** | -3,751 (-207.5%)         | $0.0013 (100.0%)         |

## Czas odpowiedzi

- Faza 1: 63.3s
- Faza 2: 0s
- **Łącznie:** 63.3s

## Porównanie z plikiem referencyjnym

- **Tickety referencyjne (Electronics):** 19
- **Tickety zwrócone przez model:** 19

⚠️ **Pokrycie: 12/19 ticketów zgodnych w 100%**

### Różnice w klasyfikacji (ticket_id: pole: ref vs wynik)

- **T-1010**: priority: ref=`medium` vs wynik=`high`, sentiment: ref=`neutral` vs wynik=`negative`
- **T-1033**: priority: ref=`high` vs wynik=`critical`
- **T-1073**: priority: ref=`high` vs wynik=`critical`
- **T-1074**: priority: ref=`low` vs wynik=`medium`
- **T-1081**: sentiment: ref=`neutral` vs wynik=`negative`
- **T-1113**: priority: ref=`low` vs wynik=`medium`
- **T-1155**: sentiment: ref=`neutral` vs wynik=`negative`
