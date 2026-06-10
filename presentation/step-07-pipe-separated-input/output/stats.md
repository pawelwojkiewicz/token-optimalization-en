# Step 07 — Kompaktowy format danych (pipe-separated)

## Parametry
- **Tani model:** gpt-4.1-mini
- **Drogi model:** gpt-5
- **Język promptu:** Angielski (skompresowany)
- **Optymalizacje:** JS filter + EN + Model Routing + Trim kolumn + Kompresja promptu + Pipe format
- **Ticketów Electronics:** 19
- **High confidence (tani model):** 19
- **Low confidence (→ drogi model):** 0

## Kompaktowy format danych
- **JSON:** 6687 znaków
- **Pipe-separated:** 5422 znaków (19% mniej)

## Zużycie tokenów
| Faza | Model | Prompt | Completion | Total | Koszt |
|------|-------|--------|------------|-------|-------|
| Faza 1 | gpt-4.1-mini | 1,647 | 505 | 2,152 | $0.0015 |
| Faza 2 | gpt-5 | 0 | 0 | 0 | $0.0000 |
| **SUMA** | — | 1,647 | 505 | **2,152** | **$0.0015** |

## Porównanie z poprzednimi krokami
| Krok | Tokeny | Koszt | Oszcz. tokenów vs poprz. | Oszcz. kosztów vs poprz. |
|------|--------|-------|----------------|----------------|
| Step 01 (PL, brak opt.) | 12,875 | $0.2061 | — (baseline) | — (baseline) |
| Step 02 (EN) | 10,074 | $0.1675 | 2,801 (21.8%) | $0.0386 (18.7%) |
| Step 03 (JS filter wierszy) | 4,447 | $0.0956 | 5,627 (55.9%) | $0.0719 (42.9%) |
| Step 04 (Model routing) | 10,814 | $0.0154 | -6,367 (-143.2%) | $0.0802 (83.9%) |
| Step 05 (Trim kolumn) | 2,854 | $0.0018 | 7,960 (73.6%) | $0.0136 (88.3%) |
| Step 06 (Kompresja promptu) | 2,504 | $0.0016 | 350 (12.3%) | $0.0002 (11.1%) |
| **Step 07 (obecne)** | **2,152** | **$0.0015** | 352 (14.1%) | $0.0001 (8.3%) |

## Czas odpowiedzi
- Faza 1: 7.9s
- Faza 2: 0s
- **Łącznie:** 7.9s

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

✅ **Dane idealnie się pokrywają!** Wszystkie 19 ticketów zgadza się co do ticket_id, priority i sentiment.
