# Step 03 — JS filtruje dane PRZED modelem

## Parametry
- **Model:** gpt-5
- **Język promptu:** Angielski
- **Optymalizacja:** JS filtruje CSV po product_category="Electronics" → model dostaje mniej danych
- **Wszystkich ticketów w CSV:** 50
- **Ticketów Electronics (po JS filter):** 19
- **Odrzuconych przez JS za 0 tokenów:** 31

## Zużycie tokenów
| Metryka | Wartość |
|---------|---------|
| Prompt tokens | 1,891 |
| Completion tokens | 2,556 |
| **TOTAL tokens** | **4,447** |
| **Koszt** | **$0.0956** |

## Porównanie z poprzednimi krokami
| Krok | Tokeny | Koszt | Oszcz. tokenów vs poprz. | Oszcz. kosztów vs poprz. |
|------|--------|-------|----------------|----------------|
| Step 01 (PL, brak opt.) | 12,875 | $0.2061 | — (baseline) | — (baseline) |
| Step 02 (EN) | 10,074 | $0.1675 | 2,801 (21.8%) | $0.0386 (18.7%) |
| **Step 03 (obecne)** | **4,447** | **$0.0956** | 5,627 (55.9%) | $0.0719 (42.9%) |

## Czas odpowiedzi
26.7s

## Uwagi
JS odfiltrował 31 ticketów za 0 tokenów. Model w step-01 musiał przeczytać WSZYSTKIE 50, żeby znaleźć te same 19.

## Porównanie z plikiem referencyjnym
- **Tickety referencyjne (Electronics):** 19
- **Tickety zwrócone przez model:** 19

✅ **Dane idealnie się pokrywają!** Wszystkie 19 ticketów zgadza się co do ticket_id, priority i sentiment.
