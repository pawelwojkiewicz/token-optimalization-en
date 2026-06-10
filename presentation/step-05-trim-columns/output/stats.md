# Step 05 — Trimowanie kolumn

## Parametry
- **Tani model:** gpt-4.1-mini
- **Drogi model:** gpt-5
- **Język promptu:** Angielski
- **Optymalizacje:** JS filter wierszy + EN + Model Routing + Trim kolumn
- **Ticketów Electronics:** 19
- **Kolumny wysłane do modelu:** 3 z 14 (ticket_id, subject, description)
- **High confidence (tani model):** 19
- **Low confidence (→ drogi model):** 0

## Zużycie tokenów
| Faza | Model | Prompt | Completion | Total | Koszt |
|------|-------|--------|------------|-------|-------|
| Faza 1 | gpt-4.1-mini | 2,347 | 507 | 2,854 | $0.0018 |
| Faza 2 | gpt-5 | 0 | 0 | 0 | $0.0000 |
| **SUMA** | — | 2,347 | 507 | **2,854** | **$0.0018** |

## Porównanie z poprzednimi krokami
| Krok | Tokeny | Koszt | Oszcz. tokenów vs poprz. | Oszcz. kosztów vs poprz. |
|------|--------|-------|----------------|----------------|
| Step 01 (PL, brak opt.) | 12,875 | $0.2061 | — (baseline) | — (baseline) |
| Step 02 (EN) | 10,074 | $0.1675 | 2,801 (21.8%) | $0.0386 (18.7%) |
| Step 03 (JS filter wierszy) | 4,447 | $0.0956 | 5,627 (55.9%) | $0.0719 (42.9%) |
| Step 04 (Model routing) | 10,814 | $0.0154 | -6,367 (-143.2%) | $0.0802 (83.9%) |
| **Step 05 (obecne)** | **2,854** | **$0.0018** | 7,960 (73.6%) | $0.0137 (88.6%) |

## Czas odpowiedzi
- Faza 1: 6.0s
- Faza 2: 0s
- **Łącznie:** 6.0s

## Co trimujemy
Z 14 kolumn CSV wysyłamy tylko 3:
- ✅ ticket_id (identyfikator)
- ✅ subject (temat — kluczowy dla klasyfikacji)
- ✅ description (opis — kluczowy dla klasyfikacji)
- ❌ customer_name, customer_email, customer_phone, product_name, product_category, order_id, order_date, ticket_date, channel, status, country

Rozmiar danych: 13.3 KB → 6.5 KB (51% mniej znaków)

## Porównanie z plikiem referencyjnym
- **Tickety referencyjne (Electronics):** 19
- **Tickety zwrócone przez model:** 19

✅ **Dane idealnie się pokrywają!** Wszystkie 19 ticketów zgadza się co do ticket_id, priority i sentiment.
