# Step 02 — Angielski prompt

## Parametry
- **Model:** gpt-5.5
- **Język promptu:** Angielski
- **Optymalizacja:** Zamiana języka PL → EN (mniej tokenów)
- **Ticketów w CSV:** 51
- **Zwróconych (Electronics):** 19

## Zużycie tokenów
| Metryka | Wartość |
|---------|---------|
| Prompt tokens | 6,824 |
| Completion tokens | 1,562 |
| **TOTAL tokens** | **8,386** |
| **Koszt** | **$0.0810** |

## Porównanie z poprzednimi krokami
| Krok | Tokeny | Koszt | Oszcz. tokenów vs poprz. | Oszcz. kosztów vs poprz. |
|------|--------|-------|----------------|----------------|
| Step 01 (PL, brak opt.) | 10,850 | $0.0988 | — (baseline) | — (baseline) |
| **Step 02 (obecne)** | **8,386** | **$0.0810** | 2,464 (22.7%) | $0.0178 (18.0%) |

## Czas odpowiedzi
28.1s

## Porównanie z plikiem referencyjnym
- **Tickety referencyjne (Electronics):** 19
- **Tickety zwrócone przez model:** 19

✅ **Dane idealnie się pokrywają!** Wszystkie 19 ticketów zgadza się co do ticket_id, priority i sentiment.
