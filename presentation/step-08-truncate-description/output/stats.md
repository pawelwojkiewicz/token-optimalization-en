# Step 08 — Obcinanie opisów (description truncation)

## Parametry

- **Tani model:** gpt-4.1-mini
- **Drogi model:** gpt-5
- **Język promptu:** Angielski (skompresowany)
- **Optymalizacje:** JS filter + EN + Model Routing + Trim kolumn + Kompresja promptu + Pipe format + Truncation
- **Ticketów Electronics:** 19
- **High confidence (tani model):** 19
- **Low confidence (→ drogi model):** 0

## Obcinanie opisów

- **Limit:** 150 znaków
- **Obciętych opisów:** 19/19
- **Średnia długość przed:** 242 znaków
- **Średnia długość po:** 150 znaków

## Format danych (pipe)

- **JSON:** 4946 znaków
- **Pipe-separated:** 3681 znaków (26% mniej)

## Zużycie tokenów

| Faza     | Model        | Prompt | Completion | Total     | Koszt       |
| -------- | ------------ | ------ | ---------- | --------- | ----------- |
| Faza 1   | gpt-4.1-mini | 1,303  | 505        | 1,808     | $0.0013     |
| Faza 2   | gpt-5        | 0      | 0          | 0         | $0.0000     |
| **SUMA** | —            | 1,303  | 505        | **1,808** | **$0.0013** |

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
| **Step 08 (obecne)**        | **1,808** | **$0.0013** | 348 (16.1%)              | $0.0002 (11.4%)          |

## Czas odpowiedzi

- Faza 1: 7.6s
- Faza 2: 0s
- **Łącznie:** 7.6s

## Przykład formatu pipe

````
ticket_id|subject|description
T-1002|ACCOUNT BLOCKED - MONEY CHARGED!!!|SCANDAL! You charged me 4000 PLN TWICE and there is NO order in the system! I am contacting my LAWYER TODAY and filing a report with the POLICE! Refun
T-1010|Smartwatch does not connect to phone|The smartwatch I bought cannot pair with my phone via Bluetooth. The app does not detect it at all. I tried resetting both devices many times without
...```

## Dlaczego pipe oszczędza tokeny
JSON powtarza nazwy kluczy ("ticket_id", "subject", "description") dla każdego z 19 ticketów.
Pipe używa jednego wiersza nagłówka — eliminuje ~57 powtórzeń kluczy.

## Porównanie z plikiem referencyjnym
- **Tickety referencyjne (Electronics):** 19
- **Tickety zwrócone przez model:** 19

⚠️ **Pokrycie: 17/19 ticketów zgodnych w 100%**

### Różnice w klasyfikacji (ticket_id: pole: ref vs wynik)
- **T-1010**: sentiment: ref=`neutral` vs wynik=`negative`
- **T-1021**: sentiment: ref=`positive` vs wynik=`neutral`
````
