# Step 05 — Trimowanie kolumn

## Parametry
- **Tani model:** gpt-4o-mini
- **Drogi model:** gpt-5.5
- **Język promptu:** Angielski
- **Optymalizacje:** JS filter wierszy + EN + Model Routing + Trim kolumn
- **Ticketów Electronics:** 19
- **Kolumny wysłane do modelu:** 3 z 14 (ticket_id, subject, description)
- **High confidence (tani model):** 18
- **Low confidence (→ drogi model):** 1

## Zużycie tokenów
| Faza | Model | Prompt | Completion | Total | Koszt |
|------|-------|--------|------------|-------|-------|
| Faza 1 | gpt-4o-mini | 2,421 | 506 | 2,927 | $0.0007 |
| Faza 2 | gpt-5.5 | 827 | 120 | 947 | $0.0077 |
| **SUMA** | — | 3,248 | 626 | **3,874** | **$0.0084** |

## Porównanie z poprzednimi krokami
| Krok | Tokeny | Koszt | Oszcz. tokenów vs poprz. | Oszcz. kosztów vs poprz. |
|------|--------|-------|----------------|----------------|
| Step 01 (PL, brak opt.) | 10,850 | $0.0988 | — (baseline) | — (baseline) |
| Step 02 (EN) | 8,386 | $0.0810 | 2,464 (22.7%) | $0.0178 (18.0%) |
| Step 03 (JS filter wierszy) | 5,589 | $0.0529 | 2,797 (33.4%) | $0.0281 (34.7%) |
| Step 04 (Model routing) | 11,532 | $0.0174 | -5,943 (-106.3%) | $0.0355 (67.1%) |
| **Step 05 (obecne)** | **3,874** | **$0.0084** | 7,658 (66.4%) | $0.0090 (51.7%) |

## Czas odpowiedzi
- Faza 1: 14.8s
- Faza 2: 4.0s
- **Łącznie:** 18.8s

## Co trimujemy
Z 14 kolumn CSV wysyłamy tylko 3:
- ✅ ticket_id (identyfikator)
- ✅ subject (temat — kluczowy dla klasyfikacji)
- ✅ description (opis — kluczowy dla klasyfikacji)
- ❌ customer_name, customer_email, customer_phone, product_name, product_category, order_id, order_date, ticket_date, channel, status, country

Rozmiar danych: 13.7 KB → 6.9 KB (50% mniej znaków)

## Porównanie z plikiem referencyjnym
- **Tickety referencyjne (Electronics):** 19
- **Tickety zwrócone przez model:** 19

✅ **Dane idealnie się pokrywają!** Wszystkie 19 ticketów zgadza się co do ticket_id, priority i sentiment.
