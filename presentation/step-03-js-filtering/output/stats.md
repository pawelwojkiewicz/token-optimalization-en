# Step 03 — JS filtruje dane PRZED modelem

## Parametry

- **Model:** gpt-5.5
- **Język promptu:** Angielski
- **Optymalizacja:** JS filtruje CSV po product_category="Electronics" → model dostaje mniej danych
- **Wszystkich ticketów w CSV:** 50
- **Ticketów Electronics (po JS filter):** 19
- **Odrzuconych przez JS za 0 tokenów:** 31

## Zużycie tokenów

| Metryka           | Wartość     |
| ----------------- | ----------- |
| Prompt tokens     | 4,589       |
| Completion tokens | 1,000       |
| **TOTAL tokens**  | **5,589**   |
| **Koszt**         | **$0.0529** |

## Porównanie z poprzednimi krokami

| Krok                    | Tokeny    | Koszt       | Oszcz. tokenów vs poprz. | Oszcz. kosztów vs poprz. |
| ----------------------- | --------- | ----------- | ------------------------ | ------------------------ |
| Step 01 (PL, brak opt.) | 10,850    | $0.0988     | — (baseline)             | — (baseline)             |
| Step 02 (EN)            | 8,386     | $0.0810     | 2,464 (22.7%)            | $0.0178 (18.0%)          |
| **Step 03 (obecne)**    | **5,589** | **$0.0529** | 2,797 (33.4%)            | $0.0281 (34.6%)          |

## Czas odpowiedzi

22.4s

## Uwagi

JS odfiltrował 31 ticketów za 0 tokenów. Model w step-01 musiał przeczytać WSZYSTKIE 50, żeby znaleźć te same 19.

## Porównanie z plikiem referencyjnym

- **Tickety referencyjne (Electronics):** 19
- **Tickety zwrócone przez model:** 19

✅ **Dane idealnie się pokrywają!** Wszystkie 19 ticketów zgadza się co do ticket_id, priority i sentiment.
