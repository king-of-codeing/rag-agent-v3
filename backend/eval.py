"""
RAG Agent v3 — Evaluation Harness.

Loads golden Q&A test cases from eval_dataset.json, runs each through the
RAG agent, and scores two dimensions:
  1. Retrieval accuracy — did the expected source doc appear in citations?
  2. Keyword coverage   — does the answer contain expected keywords?

Outputs:
  - Color-coded console table
  - Summary scores (retrieval / keyword / overall)
  - eval_report.md for inclusion in README or RKT
"""
import json
import time
from pathlib import Path
from datetime import datetime
from rag_agent import get_agent


DATASET_PATH = Path("eval_dataset.json")
REPORT_PATH = Path("eval_report.md")


# ---------- ANSI color helpers (works in Windows Terminal too) ----------
class C:
    GREEN = "\033[92m"
    RED = "\033[91m"
    YELLOW = "\033[93m"
    CYAN = "\033[96m"
    BOLD = "\033[1m"
    DIM = "\033[2m"
    END = "\033[0m"


def check_retrieval(expected_source, sources):
    """Did the expected source appear in the cited sources?"""
    if expected_source is None:
        # For grounded refusal cases, retrieval check is trivially OK
        return True
    cited = {s["source"] for s in sources}
    return expected_source in cited


def check_keywords(expected_keywords, answer):
    """Do at least 50% of expected keywords appear in the answer?"""
    if not expected_keywords:
        return True
    answer_lower = answer.lower()
    hits = sum(1 for kw in expected_keywords if kw.lower() in answer_lower)
    return hits >= max(1, len(expected_keywords) // 2)


def run_eval():
    if not DATASET_PATH.exists():
        print(f"{C.RED}❌ {DATASET_PATH} not found. Create it first.{C.END}")
        return

    with open(DATASET_PATH, encoding="utf-8") as f:
        dataset = json.load(f)

    test_cases = dataset["test_cases"]
    n = len(test_cases)

    print(f"\n{C.BOLD}{C.CYAN}{'=' * 78}{C.END}")
    print(f"{C.BOLD}{C.CYAN}  RAG AGENT v3 — EVALUATION HARNESS  ({n} test cases){C.END}")
    print(f"{C.BOLD}{C.CYAN}{'=' * 78}{C.END}\n")

    print(f"{C.DIM}Loading RAG agent (singleton — first call is slow)...{C.END}")
    agent = get_agent()
    print(f"{C.DIM}Agent ready. Running test cases...\n{C.END}")

    results = []
    retrieval_pass = 0
    keyword_pass = 0
    total_time = 0.0

    for i, case in enumerate(test_cases, 1):
        cid = case["id"]
        query = case["query"]
        expected_source = case.get("expected_source")
        expected_keywords = case.get("expected_keywords", [])
        category = case.get("category", "unknown")

        # Run the query
        t0 = time.time()
        result = agent.ask(query)
        elapsed = time.time() - t0
        total_time += elapsed

        answer = result["answer"]
        sources = result["sources"]

        # Score
        retrieval_ok = check_retrieval(expected_source, sources)
        keyword_ok = check_keywords(expected_keywords, answer)

        if retrieval_ok:
            retrieval_pass += 1
        if keyword_ok:
            keyword_pass += 1

        # Build console row
        ret_mark = f"{C.GREEN}✓{C.END}" if retrieval_ok else f"{C.RED}✗{C.END}"
        kw_mark = f"{C.GREEN}✓{C.END}" if keyword_ok else f"{C.RED}✗{C.END}"

        # Truncate query for display
        q_display = query if len(query) <= 50 else query[:47] + "..."

        # Show actual cited source(s) if retrieval failed
        cited = [s["source"] for s in sources]
        cited_display = ", ".join(cited[:2]) if cited else "(none)"

        print(f"{C.BOLD}[{i:2}/{n}]{C.END} {cid}")
        print(f"      Q: {q_display}")
        print(f"      Retrieval {ret_mark}  expected={expected_source or 'N/A (refusal)'}  got=[{cited_display}]")
        print(f"      Keywords  {kw_mark}  expected={expected_keywords}")
        print(f"      Time: {elapsed:.2f}s\n")

        results.append({
            "id": cid,
            "query": query,
            "category": category,
            "expected_source": expected_source,
            "got_sources": cited,
            "expected_keywords": expected_keywords,
            "answer_preview": answer[:200],
            "retrieval_ok": retrieval_ok,
            "keyword_ok": keyword_ok,
            "elapsed_sec": round(elapsed, 2),
        })

    # ---------- Summary ----------
    ret_score = retrieval_pass / n * 100
    kw_score = keyword_pass / n * 100
    overall = (ret_score + kw_score) / 2
    avg_time = total_time / n

    print(f"{C.BOLD}{C.CYAN}{'=' * 78}{C.END}")
    print(f"{C.BOLD}  SUMMARY{C.END}")
    print(f"{C.BOLD}{C.CYAN}{'=' * 78}{C.END}")
    print(f"  Retrieval accuracy : {C.BOLD}{retrieval_pass}/{n}{C.END} ({ret_score:.1f}%)")
    print(f"  Keyword coverage   : {C.BOLD}{keyword_pass}/{n}{C.END} ({kw_score:.1f}%)")
    print(f"  Overall score      : {C.BOLD}{overall:.1f}%{C.END}")
    print(f"  Avg query time     : {C.BOLD}{avg_time:.2f}s{C.END}")
    print(f"{C.BOLD}{C.CYAN}{'=' * 78}{C.END}\n")

    # ---------- Markdown report ----------
    write_report(results, retrieval_pass, keyword_pass, n, avg_time)
    print(f"{C.GREEN}✓ Report written to {REPORT_PATH}{C.END}\n")


def write_report(results, retrieval_pass, keyword_pass, n, avg_time):
    """Write a clean markdown report suitable for README inclusion."""
    ret_score = retrieval_pass / n * 100
    kw_score = keyword_pass / n * 100
    overall = (ret_score + kw_score) / 2

    lines = []
    lines.append("# RAG Agent v3 — Evaluation Report")
    lines.append("")
    lines.append(f"_Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}_")
    lines.append("")
    lines.append("## Summary")
    lines.append("")
    lines.append("| Metric | Score |")
    lines.append("|---|---|")
    lines.append(f"| Retrieval accuracy | **{retrieval_pass}/{n}** ({ret_score:.1f}%) |")
    lines.append(f"| Keyword coverage | **{keyword_pass}/{n}** ({kw_score:.1f}%) |")
    lines.append(f"| Overall score | **{overall:.1f}%** |")
    lines.append(f"| Avg query latency | {avg_time:.2f}s |")
    lines.append("")
    lines.append("## Test Cases")
    lines.append("")
    lines.append("| # | ID | Query | Retrieval | Keywords | Time |")
    lines.append("|---|---|---|---|---|---|")
    for i, r in enumerate(results, 1):
        ret = "✅" if r["retrieval_ok"] else "❌"
        kw = "✅" if r["keyword_ok"] else "❌"
        q = r["query"][:60] + ("..." if len(r["query"]) > 60 else "")
        lines.append(f"| {i} | {r['id']} | {q} | {ret} | {kw} | {r['elapsed_sec']}s |")
    lines.append("")
    lines.append("## Methodology")
    lines.append("")
    lines.append("- **Retrieval accuracy**: did the expected source document appear in the cited sources?")
    lines.append("- **Keyword coverage**: do at least 50% of the expected keywords appear in the generated answer?")
    lines.append("- Test cases live in `backend/eval_dataset.json`. To regenerate this report, run `python eval.py` from the `backend/` directory.")
    lines.append("")

    with open(REPORT_PATH, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))


if __name__ == "__main__":
    run_eval()