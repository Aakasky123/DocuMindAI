import argparse
import json
import statistics
import time
from pathlib import Path

import httpx


def main() -> None:
    parser = argparse.ArgumentParser(description="Run DocuMind AI RAG evaluation questions.")
    parser.add_argument("--api-url", default="http://localhost:8000/api")
    parser.add_argument("--questions", default="evaluation/eval_questions.json")
    parser.add_argument("--provider", default="openai", choices=["openai", "ollama"])
    parser.add_argument("--retrieval-mode", default="hybrid", choices=["vector", "keyword", "hybrid"])
    args = parser.parse_args()

    questions = json.loads(Path(args.questions).read_text(encoding="utf-8"))
    latencies = []
    rows = []
    with httpx.Client(timeout=180) as client:
        for item in questions:
            start = time.perf_counter()
            response = client.post(
                f"{args.api_url}/chat/ask",
                json={
                    "question": item["question"],
                    "document_ids": [],
                    "retrieval_mode": args.retrieval_mode,
                    "model_provider": args.provider,
                    "top_k": 5,
                },
            )
            response.raise_for_status()
            payload = response.json()
            latency = int((time.perf_counter() - start) * 1000)
            latencies.append(latency)
            rows.append(
                {
                    "question": item["question"],
                    "ground_truth": item["ground_truth"],
                    "answer": payload["answer"],
                    "citations": payload["citations"],
                    "latency_ms": latency,
                }
            )

        run = client.post(
            f"{args.api_url}/evaluation/run",
            json={
                "run_name": f"CLI Evaluation {int(time.time())}",
                "retrieval_mode": args.retrieval_mode,
                "model_provider": args.provider,
            },
        )
        run.raise_for_status()

    report = {
        "avg_latency_ms": int(statistics.mean(latencies)) if latencies else 0,
        "results": rows,
        "evaluation_run": run.json(),
    }
    output = Path("evaluation/reports") / f"eval_report_{int(time.time())}.json"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"Wrote {output}")


if __name__ == "__main__":
    main()
