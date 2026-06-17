# Step 05 — Column trimming

## Parameters
- **Cheap model:** gpt-4o-mini
- **Expensive model:** gpt-5.5
- **Prompt language:** English
- **Optimizations:** JS row filter + EN + Model Routing + Column trim
- **Electronics tickets:** 19
- **Columns sent to model:** 3 of 14 (ticket_id, subject, description)
- **High confidence (cheap model):** 18
- **Low confidence (→ expensive model):** 1

## Token usage
| Phase | Model | Prompt | Completion | Total | Cost |
|-------|-------|--------|------------|-------|------|
| Phase 1 | gpt-4o-mini | 2,421 | 506 | 2,927 | $0.0007 |
| Phase 2 | gpt-5.5 | 827 | 120 | 947 | $0.0077 |
| **TOTAL** | — | 3,248 | 626 | **3,874** | **$0.0084** |

## Comparison with previous steps
| Step | Tokens | Cost | Token savings vs prev. | Cost savings vs prev. |
|------|--------|------|------------------------|----------------------|
| Step 01 (PL, no opt.) | 10,850 | $0.0988 | — (baseline) | — (baseline) |
| Step 02 (EN) | 8,386 | $0.0810 | 2,464 (22.7%) | $0.0178 (18.0%) |
| Step 03 (JS row filter) | 5,589 | $0.0529 | 2,797 (33.4%) | $0.0281 (34.7%) |
| Step 04 (Model routing) | 11,532 | $0.0174 | -5,943 (-106.3%) | $0.0355 (67.1%) |
| **Step 05 (current)** | **3,874** | **$0.0084** | 7,658 (66.4%) | $0.0090 (51.7%) |

## Response time
- Phase 1: 14.8s
- Phase 2: 4.0s
- **Total:** 18.8s

## What we trim
From 14 CSV columns we send only 3:
- ✅ ticket_id (identifier)
- ✅ subject (subject line — key for classification)
- ✅ description (body — key for classification)
- ❌ customer_name, customer_email, customer_phone, product_name, product_category, order_id, order_date, ticket_date, channel, status, country

Data size: 13.7 KB → 6.9 KB (50% less)

## Comparison with reference file
- **Reference tickets (Electronics):** 19
- **Tickets returned by model:** 19

✅ **Data matches perfectly!** All 19 tickets agree on ticket_id, priority and sentiment.
