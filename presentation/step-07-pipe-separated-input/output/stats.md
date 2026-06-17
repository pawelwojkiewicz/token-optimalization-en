# Step 07 — Compact data format (pipe-separated)

## Parameters
- **Cheap model:** gpt-4o-mini
- **Expensive model:** gpt-5.5
- **Prompt language:** English (compressed)
- **Optimizations:** JS filter + EN + Model Routing + Column trim + Prompt compression + Pipe format
- **Electronics tickets:** 19
- **High confidence (cheap model):** 19
- **Low confidence (→ expensive model):** 0

## Compact data format
- **JSON:** 7315 characters
- **Pipe-separated:** 6050 characters (17% less)

## Token usage
| Phase | Model | Prompt | Completion | Total | Cost |
|-------|-------|--------|------------|-------|------|
| Phase 1 | gpt-4o-mini | 1,767 | 509 | 2,276 | $0.0006 |
| Phase 2 | gpt-5.5 | 0 | 0 | 0 | $0.0000 |
| **TOTAL** | — | 1,767 | 509 | **2,276** | **$0.0006** |

## Comparison with previous steps
| Step | Tokens | Cost | Token savings vs prev. | Cost savings vs prev. |
|------|--------|------|------------------------|----------------------|
| Step 01 (PL, no opt.) | 10,850 | $0.0988 | — (baseline) | — (baseline) |
| Step 02 (EN) | 8,386 | $0.0810 | 2,464 (22.7%) | $0.0178 (18.0%) |
| Step 03 (JS row filter) | 5,589 | $0.0529 | 2,797 (33.4%) | $0.0281 (34.7%) |
| Step 04 (Model routing) | 11,532 | $0.0174 | -5,943 (-106.3%) | $0.0355 (67.1%) |
| Step 05 (Column trim) | 3,874 | $0.0084 | 7,658 (66.4%) | $0.0090 (51.7%) |
| Step 06 (Prompt compression) | 2,574 | $0.0006 | 1,300 (33.6%) | $0.0078 (92.9%) |
| **Step 07 (current)** | **2,276** | **$0.0006** | 298 (11.6%) | $0.0000 (4.9%) |

## Response time
- Phase 1: 5.3s
- Phase 2: 0s
- **Total:** 5.3s

## Pipe format example
```
ticket_id|subject|description
T-1002|ACCOUNT BLOCKED - MONEY CHARGED!!!|SCANDAL! You charged me 4000 PLN TWICE and there is NO order in the system! I am contacting my LAWYER TODAY and filing a report with the POLICE! Refund the money IMMEDIATELY or we will meet in court! This is FRAUD!
T-1010|Smartwatch does not connect to phone|The smartwatch I bought cannot pair with my phone via Bluetooth. The app does not detect it at all. I tried resetting both devices many times without success. Please advise how to solve the problem or start the warranty procedure.
...```

## Why pipe saves tokens
JSON repeats key names ("ticket_id", "subject", "description") for each of the 19 tickets.
Pipe uses a single header row — eliminates ~57 key repetitions.

## Comparison with reference file
- **Reference tickets (Electronics):** 19
- **Tickets returned by model:** 19

✅ **Data matches perfectly!** All 19 tickets agree on ticket_id, priority and sentiment.
