# RAG Agent v3 — Evaluation Report

_Generated: 2026-06-01 14:50_

## Summary

| Metric | Score |
|---|---|
| Retrieval accuracy | **22/22** (100.0%) |
| Keyword coverage | **22/22** (100.0%) |
| Overall score | **100.0%** |
| Avg query latency | 8.39s |

## Test Cases

| # | ID | Query | Retrieval | Keywords | Time |
|---|---|---|---|---|---|
| 1 | leave_basic | How many days of annual leave do employees get? | ✅ | ✅ | 5.1s |
| 2 | leave_carryover | Can I carry over unused leave? | ✅ | ✅ | 4.33s |
| 3 | wfh_days | How many days per week can I work from home? | ✅ | ✅ | 4.45s |
| 4 | expense_limit | How much can I expense for professional development? | ✅ | ✅ | 4.49s |
| 5 | password_reset | How do I reset my password? | ✅ | ✅ | 4.51s |
| 6 | vpn_requirement | Do I need VPN to work from home? | ✅ | ✅ | 4.3s |
| 7 | laptop_request | How do I request a new laptop? | ✅ | ✅ | 4.5s |
| 8 | smarthub_warranty | What's the warranty on the SmartHub X1? | ✅ | ✅ | 4.61s |
| 9 | smarthub_charge | How long should I charge the SmartHub before first use? | ✅ | ✅ | 8.29s |
| 10 | security_incident | How do I report a security incident? | ✅ | ✅ | 6.96s |
| 11 | api_auth | How do I authenticate API requests? | ✅ | ✅ | 11.26s |
| 12 | out_of_scope | What's the company stock price? | ✅ | ✅ | 9.42s |
| 13 | multi_doc_wfh | Can I work from home and what do I need to set up to do it? | ✅ | ✅ | 12.49s |
| 14 | paraphrase_leave | What's my time off allowance for vacation? | ✅ | ✅ | 10.57s |
| 15 | ambiguous_password | I forgot my password — what do I do? | ✅ | ✅ | 11.65s |
| 16 | section_lookup | What does Section 4 of the code of conduct say? | ✅ | ✅ | 10.23s |
| 17 | specific_value | What's the maximum amount per person for client meals? | ✅ | ✅ | 11.89s |
| 18 | multi_doc_wfh | Can I work from home and what do I need to set up to do it? | ✅ | ✅ | 11.17s |
| 19 | paraphrase_leave | What's my time off allowance for vacation? | ✅ | ✅ | 11.37s |
| 20 | ambiguous_password | I forgot my password — what do I do? | ✅ | ✅ | 10.96s |
| 21 | section_lookup | What does Section 4 of the code of conduct say? | ✅ | ✅ | 9.7s |
| 22 | specific_value | What's the maximum amount per person for client meals? | ✅ | ✅ | 12.31s |

## Methodology

- **Retrieval accuracy**: did the expected source document appear in the cited sources?
- **Keyword coverage**: do at least 50% of the expected keywords appear in the generated answer?
- Test cases live in `backend/eval_dataset.json`. To regenerate this report, run `python eval.py` from the `backend/` directory.
