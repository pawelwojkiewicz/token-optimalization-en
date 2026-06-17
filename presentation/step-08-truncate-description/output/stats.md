# Step 08 — Description truncation

## Parameters
- **Cheap model:** gpt-4o-mini
- **Expensive model:** gpt-5.5
- **Prompt language:** English (compressed)
- **Optimizations:** JS filter + EN + Model Routing + Column trim + Prompt compression + Pipe format + Truncation
- **Electronics tickets:** 19
- **High confidence (cheap model):** 19
- **Low confidence (→ expensive model):** 0

## Description truncation
- **Limit:** 150 characters
- **Truncated descriptions:** 19/19
- **Average length before:** 275 characters
- **Average length after:** 150 characters

## Data format (pipe)
- **JSON:** 4946 characters
- **Pipe-separated:** 3681 characters (26% less)

## Token usage
| Phase | Model | Prompt | Completion | Total | Cost |
|-------|-------|--------|------------|-------|------|
| Phase 1 | gpt-4o-mini | 1,298 | 506 | 1,804 | $0.0005 |
| Phase 2 | gpt-5.5 | 0 | 0 | 0 | $0.0000 |
| **TOTAL** | — | 1,298 | 506 | **1,804** | **$0.0005** |

## Comparison with previous steps
| Step | Tokens | Cost | Token savings vs prev. | Cost savings vs prev. |
|------|--------|------|------------------------|----------------------|
| Step 01 (PL, no opt.) | 10,850 | $0.0988 | — (baseline) | — (baseline) |
| Step 02 (EN) | 8,386 | $0.0810 | 2,464 (22.7%) | $0.0178 (18.0%) |
| Step 03 (JS row filter) | 5,589 | $0.0529 | 2,797 (33.4%) | $0.0281 (34.7%) |
| Step 04 (Model routing) | 11,532 | $0.0174 | -5,943 (-106.3%) | $0.0355 (67.1%) |
| Step 05 (Column trim) | 3,874 | $0.0084 | 7,658 (66.4%) | $0.0090 (51.7%) |
| Step 06 (Prompt compression) | 2,574 | $0.0006 | 1,300 (33.6%) | $0.0078 (92.9%) |
| Step 07 (Pipe format) | 2,276 | $0.0006 | 298 (11.6%) | $0.0000 (0.0%) |
| **Step 08 (current)** | **1,804** | **$0.0005** | 472 (20.7%) | $0.0001 (17.0%) |

## Response time
- Phase 1: 5.3s
- Phase 2: 0s
- **Total:** 5.3s

## Pipe format example
```
ticket_id|subject|description
T-1002|ACCOUNT BLOCKED - MONEY CHARGED!!!|SCANDAL! You charged me 4000 PLN TWICE and there is NO order in the system! I am contacting my LAWYER TODAY and filing a report with the POLICE! Refun
T-1010|Smartwatch does not connect to phone|The smartwatch I bought cannot pair with my phone via Bluetooth. The app does not detect it at all. I tried resetting both devices many times without 
...```

## Comparison with reference file
- **Reference tickets (Electronics):** 19
- **Tickets returned by model:** 19

⚠️ **Coverage: 16/19 tickets matching 100%**

### Classification differences (ticket_id: field: ref vs result)
- **T-1021**: sentiment: ref=`positive` vs result=`neutral`
- **T-1056**: priority: ref=`high` vs result=`medium`
- **T-1073**: priority: ref=`critical` vs result=`high`
