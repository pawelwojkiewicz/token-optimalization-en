# Step 07 — Kompaktowy format danych (pipe-separated)

## Parametry
- **Tani model:** gpt-4o-mini
- **Drogi model:** gpt-5.5
- **Język promptu:** Angielski (skompresowany)
- **Optymalizacje:** JS filter + EN + Model Routing + Trim kolumn + Kompresja promptu + Pipe format
- **Ticketów Electronics:** 19
- **High confidence (tani model):** 19
- **Low confidence (→ drogi model):** 0

## Kompaktowy format danych
- **JSON:** 7094 znaków
- **Pipe-separated:** 5829 znaków (18% mniej)

## Zużycie tokenów
| Faza | Model | Prompt | Completion | Total | Koszt |
|------|-------|--------|------------|-------|-------|
| Faza 1 | gpt-4o-mini | 1,727 | 506 | 2,233 | $0.0006 |
| Faza 2 | gpt-5.5 | 0 | 0 | 0 | $0.0000 |
| **SUMA** | — | 1,727 | 506 | **2,233** | **$0.0006** |

## Porównanie z poprzednimi krokami
| Krok | Tokeny | Koszt | Oszcz. tokenów vs poprz. | Oszcz. kosztów vs poprz. |
|------|--------|-------|----------------|----------------|
| Step 01 (PL, brak opt.) | 10,850 | $0.0988 | — (baseline) | — (baseline) |
| Step 02 (EN) | 8,386 | $0.0810 | 2,464 (22.7%) | $0.0178 (18.0%) |
| Step 03 (JS filter wierszy) | 5,589 | $0.0529 | 2,797 (33.4%) | $0.0281 (34.7%) |
| Step 04 (Model routing) | 11,532 | $0.0174 | -5,943 (-106.3%) | $0.0355 (67.1%) |
| Step 05 (Trim kolumn) | 3,874 | $0.0084 | 7,658 (66.4%) | $0.0090 (51.7%) |
| Step 06 (Kompresja promptu) | 2,574 | $0.0006 | 1,300 (33.6%) | $0.0078 (92.9%) |
| **Step 07 (obecne)** | **2,233** | **$0.0006** | 341 (13.2%) | $0.0000 (6.2%) |

## Czas odpowiedzi
- Faza 1: 6.9s
- Faza 2: 0s
- **Łącznie:** 6.9s

## Przykład formatu pipe
```
ticket_id|subject|description
T-1002|ACCOUNT BLOCKED - MONEY CHARGED!!!|SCANDAL! You charged me 4000 PLN TWICE and there is NO order in the system! I am contacting my LAWYER TODAY and filing a report with the POLICE! Refund the money IMMEDIATELY or we will meet in court! This is FRAUD!
T-1010|Smartwatch does not connect to phone|The smartwatch I bought cannot pair with my phone via Bluetooth. The app does not detect it at all. I tried resetting both devices many times without success. Please advise how to solve the problem or start the warranty procedure.
...```

## Dlaczego pipe oszczędza tokeny
JSON powtarza nazwy kluczy ("ticket_id", "subject", "description") dla każdego z 19 ticketów.
Pipe używa jednego wiersza nagłówka — eliminuje ~57 powtórzeń kluczy.

## Porównanie z plikiem referencyjnym
- **Tickety referencyjne (Electronics):** 19
- **Tickety zwrócone przez model:** 19

⚠️ **Pokrycie: 17/19 ticketów zgodnych w 100%**

### Różnice w klasyfikacji (ticket_id: pole: ref vs wynik)
- **T-1056**: priority: ref=`high` vs wynik=`medium`
- **T-1081**: priority: ref=`medium` vs wynik=`low`
