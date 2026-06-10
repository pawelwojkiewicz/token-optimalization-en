# Step 06 — Kompresja promptu

## Parametry
- **Tani model:** gpt-4o-mini
- **Drogi model:** gpt-5.5
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
| Faza 1 | gpt-4o-mini | 2,075 | 499 | 2,574 | $0.0006 |
| Faza 2 | gpt-5.5 | 0 | 0 | 0 | $0.0000 |
| **SUMA** | — | 2,075 | 499 | **2,574** | **$0.0006** |

## Porównanie z poprzednimi krokami
| Krok | Tokeny | Koszt | Oszcz. tokenów vs poprz. | Oszcz. kosztów vs poprz. |
|------|--------|-------|----------------|----------------|
| Step 01 (PL, brak opt.) | 10,850 | $0.0988 | — (baseline) | — (baseline) |
| Step 02 (EN) | 8,386 | $0.0810 | 2,464 (22.7%) | $0.0178 (18.0%) |
| Step 03 (JS filter wierszy) | 5,589 | $0.0529 | 2,797 (33.4%) | $0.0281 (34.7%) |
| Step 04 (Model routing) | 11,532 | $0.0174 | -5,943 (-106.3%) | $0.0355 (67.1%) |
| Step 05 (Trim kolumn) | 3,874 | $0.0084 | 7,658 (66.4%) | $0.0090 (51.7%) |
| **Step 06 (obecne)** | **2,574** | **$0.0006** | 1,300 (33.6%) | $0.0078 (92.7%) |

## Czas odpowiedzi
- Faza 1: 6.8s
- Faza 2: 0s
- **Łącznie:** 6.8s

## Co kompresujemy
System prompt skrócony z pełnych opisów i 8 przykładów do:
- Jednoliniowe definicje priorytetów (pipe-separated)
- 6 przykładów w formacie inline (zamiast wieloliniowych bloków)
- Usunięte powtórzenia i wypełniacze

## Porównanie z plikiem referencyjnym
- **Tickety referencyjne (Electronics):** 19
- **Tickety zwrócone przez model:** 19

✅ **Dane idealnie się pokrywają!** Wszystkie 19 ticketów zgadza się co do ticket_id, priority i sentiment.
