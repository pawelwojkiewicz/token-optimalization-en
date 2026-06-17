# Step 09 — Local model instead of API (LM Studio)

## Parameters

- **Local model (phase 1):** google/gemma-4-e4b @ LM Studio (cost: $0)
- **Expensive model (fallback):** gpt-5.5
- **Prompt language:** English (compressed)
- **Optimizations:** JS filter + EN + Model Routing + Column trim + Prompt compression + Pipe format + Truncation + Local model
- **Electronics tickets:** 19
- **High confidence (local model):** 19
- **Low confidence (→ expensive model):** 0

## Description truncation

- **Limit:** 150 characters
- **Truncated descriptions:** 0/19
- **Average length before:** 242 characters
- **Average length after:** 242 characters

## Data format (pipe)

- **JSON:** 6687 characters
- **Pipe-separated:** 5422 characters (19% less)

## Token usage

| Phase    | Model                        | Prompt | Completion | Total     | Cost        |
| -------- | ---------------------------- | ------ | ---------- | --------- | ----------- |
| Phase 1  | google/gemma-4-e4b (local)   | 3,749  | 1,810      | 5,559     | $0.0000     |
| Phase 2  | gpt-5.5                      | 0      | 0          | 0         | $0.0000     |
| **TOTAL** | —                           | 3,749  | 1,810      | **5,559** | **$0.0000** |

## Comparison with previous steps

| Step                        | Tokens    | Cost        | Token savings vs prev. | Cost savings vs prev. |
| --------------------------- | --------- | ----------- | ---------------------- | --------------------- |
| Step 01 (PL, no opt.)       | 12,875    | $0.1611     | — (baseline)           | — (baseline)          |
| Step 02 (EN)                | 10,074    | $0.1338     | 2,801 (21.8%)          | $0.0273 (16.9%)       |
| Step 03 (JS row filter)     | 4,447     | $0.0861     | 5,627 (55.9%)          | $0.0477 (35.7%)       |
| Step 04 (Model routing)     | 10,814    | $0.0131     | -6,367 (-143.2%)       | $0.0730 (84.8%)       |
| Step 05 (Column trim)       | 2,854     | $0.0018     | 7,960 (73.6%)          | $0.0113 (86.3%)       |
| Step 06 (Prompt compression) | 2,504    | $0.0016     | 350 (12.3%)            | $0.0002 (11.1%)       |
| Step 07 (Pipe format)       | 2,156     | $0.0015     | 348 (13.9%)            | $0.0001 (6.3%)        |
| Step 08 (Truncation)        | 1,808     | $0.0013     | 348 (16.1%)            | $0.0002 (13.3%)       |
| **Step 09 (current)**       | **5,559** | **$0.0000** | -3,751 (-207.5%)       | $0.0013 (100.0%)      |

## Response time

- Phase 1: 63.3s
- Phase 2: 0s
- **Total:** 63.3s

## Comparison with reference file

- **Reference tickets (Electronics):** 19
- **Tickets returned by model:** 19

⚠️ **Coverage: 12/19 tickets matching 100%**

### Classification differences (ticket_id: field: ref vs result)

- **T-1010**: priority: ref=`medium` vs result=`high`, sentiment: ref=`neutral` vs result=`negative`
- **T-1033**: priority: ref=`high` vs result=`critical`
- **T-1073**: priority: ref=`high` vs result=`critical`
- **T-1074**: priority: ref=`low` vs result=`medium`
- **T-1081**: sentiment: ref=`neutral` vs result=`negative`
- **T-1113**: priority: ref=`low` vs result=`medium`
- **T-1155**: sentiment: ref=`neutral` vs result=`negative`
