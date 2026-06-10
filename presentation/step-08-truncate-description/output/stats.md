# Step 08 — Obcinanie opisów (description truncation)

## Parametry
- **Tani model:** gpt-4o-mini
- **Drogi model:** gpt-5.5
- **Język promptu:** Angielski (skompresowany)
- **Optymalizacje:** JS filter + EN + Model Routing + Trim kolumn + Kompresja promptu + Pipe format + Truncation
- **Ticketów Electronics:** 19
- **High confidence (tani model):** 19
- **Low confidence (→ drogi model):** 0

## Obcinanie opisów
- **Limit:** 150 znaków
- **Obciętych opisów:** 19/19
- **Średnia długość przed:** 263 znaków
- **Średnia długość po:** 150 znaków

## Format danych (pipe)
- **JSON:** 4946 znaków
- **Pipe-separated:** 3681 znaków (26% mniej)

## Zużycie tokenów
| Faza | Model | Prompt | Completion | Total | Koszt |
|------|-------|--------|------------|-------|-------|
| Faza 1 | gpt-4o-mini | 1,297 | 504 | 1,801 | $0.0005 |
| Faza 2 | gpt-5.5 | 0 | 0 | 0 | $0.0000 |
| **SUMA** | — | 1,297 | 504 | **1,801** | **$0.0005** |

## Porównanie z poprzednimi krokami
| Krok | Tokeny | Koszt | Oszcz. tokenów vs poprz. | Oszcz. kosztów vs poprz. |
|------|--------|-------|----------------|----------------|
| Step 01 (PL, brak opt.) | 10,850 | $0.0988 | — (baseline) | — (baseline) |
| Step 02 (EN) | 8,386 | $0.0810 | 2,464 (22.7%) | $0.0178 (18.0%) |
| Step 03 (JS filter wierszy) | 5,589 | $0.0529 | 2,797 (33.4%) | $0.0281 (34.7%) |
| Step 04 (Model routing) | 11,532 | $0.0174 | -5,943 (-106.3%) | $0.0355 (67.1%) |
| Step 05 (Trim kolumn) | 3,874 | $0.0084 | 7,658 (66.4%) | $0.0090 (51.7%) |
| Step 06 (Kompresja promptu) | 2,574 | $0.0006 | 1,300 (33.6%) | $0.0078 (92.9%) |
| Step 07 (Pipe format) | 2,233 | $0.0006 | 341 (13.2%) | $0.0000 (0.0%) |
| **Step 08 (obecne)** | **1,801** | **$0.0005** | 432 (19.3%) | $0.0001 (17.2%) |

## Czas odpowiedzi
- Faza 1: 6.8s
- Faza 2: 0s
- **Łącznie:** 6.8s

## Przykład formatu pipe
```
ticket_id|subject|description
T-1002|ACCOUNT BLOCKED - MONEY CHARGED!!!|SCANDAL! You charged me 4000 PLN TWICE and there is NO order in the system! I am contacting my LAWYER TODAY and filing a report with the POLICE! Refun
T-1010|Smartwatch does not connect to phone|The smartwatch I bought cannot pair with my phone via Bluetooth. The app does not detect it at all. I tried resetting both devices many times without 
...```

## Porównanie z plikiem referencyjnym
- **Tickety referencyjne (Electronics):** 19
- **Tickety zwrócone przez model:** 19

⚠️ **Pokrycie: 16/19 ticketów zgodnych w 100%**

### Różnice w klasyfikacji (ticket_id: pole: ref vs wynik)
- **T-1021**: sentiment: ref=`positive` vs wynik=`neutral`
- **T-1056**: priority: ref=`high` vs wynik=`medium`
- **T-1073**: priority: ref=`critical` vs wynik=`high`
