# Step 06 — Prompt compression

## Parameters
- **Cheap model:** gpt-4o-mini
- **Expensive model:** gpt-5.5
- **Prompt language:** English (compressed)
- **Optimizations:** JS row filter + EN + Model Routing + Column trim + Prompt compression
- **Electronics tickets:** 19
- **High confidence (cheap model):** 19
- **Low confidence (→ expensive model):** 0

## Prompt compression
- **Original prompt:** 2718 characters
- **Compressed prompt:** 1055 characters (61% less)

## Token usage
| Phase | Model | Prompt | Completion | Total | Cost |
|-------|-------|--------|------------|-------|------|
| Phase 1 | gpt-4o-mini | 2,075 | 499 | 2,574 | $0.0006 |
| Phase 2 | gpt-5.5 | 0 | 0 | 0 | $0.0000 |
| **TOTAL** | — | 2,075 | 499 | **2,574** | **$0.0006** |

## Comparison with previous steps
| Step | Tokens | Cost | Token savings vs prev. | Cost savings vs prev. |
|------|--------|------|------------------------|----------------------|
| Step 01 (PL, no opt.) | 10,850 | $0.0988 | — (baseline) | — (baseline) |
| Step 02 (EN) | 8,386 | $0.0810 | 2,464 (22.7%) | $0.0178 (18.0%) |
| Step 03 (JS row filter) | 5,589 | $0.0529 | 2,797 (33.4%) | $0.0281 (34.7%) |
| Step 04 (Model routing) | 11,532 | $0.0174 | -5,943 (-106.3%) | $0.0355 (67.1%) |
| Step 05 (Column trim) | 3,874 | $0.0084 | 7,658 (66.4%) | $0.0090 (51.7%) |
| **Step 06 (current)** | **2,574** | **$0.0006** | 1,300 (33.6%) | $0.0078 (92.7%) |

## Response time
- Phase 1: 6.8s
- Phase 2: 0s
- **Total:** 6.8s

## What we compress
System prompt shortened from full descriptions and 8 examples to:
- Single-line priority definitions (pipe-separated)
- 6 inline examples (instead of multi-line blocks)
- Removed repetitions and filler text

## Comparison with reference file
- **Reference tickets (Electronics):** 19
- **Tickets returned by model:** 19

✅ **Data matches perfectly!** All 19 tickets agree on ticket_id, priority and sentiment.
