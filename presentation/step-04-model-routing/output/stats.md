# Step 04 — Model Routing

## Parameters
- **Cheap model:** gpt-4o-mini
- **Expensive model:** gpt-5.5
- **Prompt language:** English
- **Optimizations:** JS filtering + EN + Model Routing
- **Electronics tickets:** 19
- **High confidence (cheap model):** 17
- **Medium/Low confidence (→ expensive model):** 2

## Token usage
| Phase | Model | Prompt | Completion | Total | Cost |
|-------|-------|--------|------------|-------|------|
| Phase 1 | gpt-4o-mini | 9,520 | 548 | 10,068 | $0.0018 |
| Phase 2 | gpt-5.5 | 1,133 | 331 | 1,464 | $0.0156 |
| **TOTAL** | — | 10,653 | 879 | **11,532** | **$0.0174** |

## Comparison with previous steps
| Step | Tokens | Cost | Token savings vs prev. | Cost savings vs prev. |
|------|--------|------|------------------------|----------------------|
| Step 01 (PL, no opt.) | 10,850 | $0.0988 | — (baseline) | — (baseline) |
| Step 02 (EN) | 8,386 | $0.0810 | 2,464 (22.7%) | $0.0178 (18.0%) |
| Step 03 (JS row filter) | 5,589 | $0.0529 | 2,797 (33.4%) | $0.0281 (34.7%) |
| **Step 04 (current)** | **11,532** | **$0.0174** | -5,943 (-106.3%) | $0.0355 (67.2%) |

## Response time
- Phase 1: 24.2s
- Phase 2: 7.0s
- **Total:** 31.2s

## How it works
1. Cheap model (gpt-4o-mini) classifies ALL tickets + returns confidence
2. Tickets with confidence="high" → final result (cheap!)
3. Tickets with confidence="medium"/"low" → reclassified by expensive model (gpt-5.5)
4. Merge results

## Comparison with reference file
- **Reference tickets (Electronics):** 19
- **Tickets returned by model:** 19

✅ **Data matches perfectly!** All 19 tickets agree on ticket_id, priority and sentiment.
