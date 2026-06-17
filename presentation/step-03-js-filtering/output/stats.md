# Step 03 — JS filters data BEFORE the model

## Parameters

- **Model:** gpt-5.5
- **Prompt language:** English
- **Optimization:** JS filters CSV by product_category="Electronics" → model receives less data
- **Total tickets in CSV:** 50
- **Electronics tickets (after JS filter):** 19
- **Filtered out by JS at 0 tokens:** 31

## Token usage

| Metric            | Value       |
| ----------------- | ----------- |
| Prompt tokens     | 4,589       |
| Completion tokens | 1,000       |
| **TOTAL tokens**  | **5,589**   |
| **Cost**          | **$0.0529** |

## Comparison with previous steps

| Step                    | Tokens    | Cost        | Token savings vs prev. | Cost savings vs prev. |
| ----------------------- | --------- | ----------- | ---------------------- | --------------------- |
| Step 01 (PL, no opt.)   | 10,850    | $0.0988     | — (baseline)           | — (baseline)          |
| Step 02 (EN)            | 8,386     | $0.0810     | 2,464 (22.7%)          | $0.0178 (18.0%)       |
| **Step 03 (current)**   | **5,589** | **$0.0529** | 2,797 (33.4%)          | $0.0281 (34.6%)       |

## Response time

22.4s

## Notes

JS filtered out 31 tickets at 0 token cost. The model in step-01 had to read ALL 50 tickets to find the same 19.

## Comparison with reference file

- **Reference tickets (Electronics):** 19
- **Tickets returned by model:** 19

✅ **Data matches perfectly!** All 19 tickets agree on ticket_id, priority and sentiment.
