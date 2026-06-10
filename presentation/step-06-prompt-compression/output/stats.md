# Step 06 — Kompresja promptu

## Parametry
- **Tani model:** gpt-4.1-mini
- **Drogi model:** gpt-5
- **Język promptu:** Angielski (skompresowany)
- **Optymalizacje:** JS filter wierszy + EN + Model Routing + Trim kolumn + Kompresja promptu
- **Ticketów Electronics:** 19
- **High confidence (tani model):** 19
- **Low confidence (→ drogi model):** 0

## Kompresja promptu
- **Oryginalny prompt:** 2718 znaków
- **Skompresowany prompt:** 1055 znaków (61% mniej)

## Zużycie tokenów
| Faza | Model | Prompt | Completion | Total | Koszt |
|------|-------|--------|------------|-------|-------|
| Faza 1 | gpt-4.1-mini | 1,999 | 505 | 2,504 | $0.0016 |
| Faza 2 | gpt-5 | 0 | 0 | 0 | $0.0000 |
| **SUMA** | — | 1,999 | 505 | **2,504** | **$0.0016** |

## Porównanie z poprzednimi krokami
| Krok | Tokeny | Koszt | Oszcz. tokenów vs poprz. | Oszcz. kosztów vs poprz. |
|------|--------|-------|----------------|----------------|
| Step 01 (PL, brak opt.) | 12,875 | $0.2061 | — (baseline) | — (baseline) |
| Step 02 (EN) | 10,074 | $0.1675 | 2,801 (21.8%) | $0.0386 (18.7%) |
| Step 03 (JS filter wierszy) | 4,447 | $0.0956 | 5,627 (55.9%) | $0.0719 (42.9%) |
| Step 04 (Model routing) | 10,814 | $0.0154 | -6,367 (-143.2%) | $0.0802 (83.9%) |
| Step 05 (Trim kolumn) | 2,854 | $0.0018 | 7,960 (73.6%) | $0.0136 (88.3%) |
| **Step 06 (obecne)** | **2,504** | **$0.0016** | 350 (12.3%) | $0.0002 (10.7%) |

## Czas odpowiedzi
- Faza 1: 8.1s
- Faza 2: 0s
- **Łącznie:** 8.1s

## Co kompresujemy
System prompt skrócony z pełnych opisów i 8 przykładów do:
- Jednoliniowe definicje priorytetów (pipe-separated)
- 6 przykładów w formacie inline (zamiast wieloliniowych bloków)
- Usunięte powtórzenia i wypełniacze

## Porównanie z plikiem referencyjnym
- **Tickety referencyjne (Electronics):** 19
- **Tickety zwrócone przez model:** 19

✅ **Dane idealnie się pokrywają!** Wszystkie 19 ticketów zgadza się co do ticket_id, priority i sentiment.
