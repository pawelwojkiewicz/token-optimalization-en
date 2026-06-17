# Token optimization summary

Generated: 10.06.2026, 20:03:03

## Comparison table

| Step | Tokens | Cost | Time | Coverage | vs baseline | vs prev. |
|------|--------|------|------|----------|-------------|----------|
| Step 01 — PL, no opt., gpt-5.5 | 10 850 | $0.0988 | 31.9s | 19/19 | — (baseline) | — |
| Step 02 — EN prompt, gpt-5.5 | 8386 | $0.0810 | 28.1s | 19/19 | -2,464 (23%) | -2,464 (23%) |
| Step 03 — JS row filter, gpt-5.5 | 5589 | $0.0529 | — | 19/19 | -5,261 (48%) | -2,797 (33%) |
| Step 04 — Model routing | 11 532 | $0.0174 | 31.2s | 19/19 | +682 (-6%) | +5,943 (-106%) |
| Step 05 — Column trim (3/14) | 3874 | $0.0084 | 18.8s | 19/19 | -6,976 (64%) | -7,658 (66%) |
| Step 06 — Prompt compression | 2574 | $0.0006 | 6.8s | 19/19 | -8,276 (76%) | -1,300 (34%) |
| Step 07 — Pipe-separated input | 2276 | $0.0006 | 5.3s | 19/19 | -8,574 (79%) | -298 (12%) |
| **Step 08 — Truncate description** | **1804** | **$0.0005** | **5.3s** | **16/19** | **-9,046 (83%)** | **-472 (21%)** |

## Total savings (Step 01 → Step 08)

| Metric | Baseline | Final result | Savings |
|--------|----------|--------------|---------|
| Tokens | 10 850 | 1804 | **9046 (83.4%)** |
| Cost | $0.0988 | $0.0005 | **$0.0983 (99.5%)** |
| Time | 31.9s | 5.3s | **26.6s (83.4%)** |

## Scalability — real-world scenario

> A company spent **\$14 000** on ticket classification. It could have spent **~\$71**.

The savings ratio from this presentation (`$0.0988 → $0.0005`, i.e. **99.5%**) scaled to \$14 000:

| Scenario | Cost |
|----------|------|
| Without optimizations (baseline) | **\$14 000** |
| After optimizations | **~\$71** |
| **Savings** | **~\$13 929 (99.5%)** |

## Local model comparison (step-09)

| Model | Runs | Avg accuracy | Time | Notes |
|-------|------|-------------|------|-------|
| gpt-4o-mini (reference) | — | 100% | ~7s | baseline |
| meta-llama-3.1-8b-instruct | 3× | **63.0%** | ~20s | 68% / 68% / 53% |
| qwen2.5-7b-instruct | 3× | **61.3%** | ~30s | 68% / 53% / 63% |
| google/gemma-4-e4b | 2× | **52.5%** | ~40s | 47% / 58% |

> ⚠️ All three local models showed **very low accuracy** compared to the reference — below 65% on average.
> Best result: meta-llama-3.1-8b-instruct (avg 63%), but still 37 percentage points behind gpt-4o-mini.
> High variability between runs (differences up to 15 pp) suggests instability in local model classification.
> 💡 The tested models have 7–8B parameters. Models with more parameters (e.g. 32B, 70B) could achieve significantly better accuracy — at the cost of higher hardware requirements and longer inference times.
