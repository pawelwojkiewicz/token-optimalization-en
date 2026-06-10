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
| Prompt tokens | 6,738 |
| Completion tokens | 3,336 |
| **TOTAL tokens** | **10,074** |
| **Koszt** | **$0.1675** |

## Porównanie z poprzednimi krokami
| Krok | Tokeny | Koszt | Oszcz. tokenów vs poprz. | Oszcz. kosztów vs poprz. |
|------|--------|-------|----------------|----------------|
| Step 01 (PL, brak opt.) | 12,875 | $0.2061 | — (baseline) | — (baseline) |
| **Step 02 (obecne)** | **10,074** | **$0.1675** | 2,801 (21.8%) | $0.0386 (18.7%) |

## Czas odpowiedzi
51.0s

## Porównanie z plikiem referencyjnym
- **Tickety referencyjne (Electronics):** 19
- **Tickety zwrócone przez model:** 19

✅ **Dane idealnie się pokrywają!** Wszystkie 19 ticketów zgadza się co do ticket_id, priority i sentiment.
