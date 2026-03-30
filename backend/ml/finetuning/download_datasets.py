"""
download_datasets.py
--------------------
Downloads the three HuggingFace datasets used for therapy chatbot finetuning:

  1. nbertagnolli/counsel-chat       — Real counsellor Q&A from counselchat.com
  2. facebook/empathetic_dialogues   — 25k empathetic conversation starters (Facebook Research)
  3. Amod/mental_health_counseling_conversations — ~3k curated mental-health chats

Saves raw splits to  data/raw/<dataset_name>/
Run:
    python download_datasets.py [--data-dir ./data] [--hf-token HF_TOKEN]
"""

import argparse
import json
import os
import sys
from pathlib import Path

try:
    from datasets import load_dataset, DownloadConfig
except ImportError:
    sys.exit("Install dependencies first:  pip install datasets huggingface_hub")


# ---------------------------------------------------------------------------
# Dataset registry
# ---------------------------------------------------------------------------
DATASETS = [
    {
        "id": "nbertagnolli/counsel-chat",
        "name": "counsel_chat",
        "description": "Real therapist-client Q&A pairs from counselchat.com (~700 Q/A with 4k+ upvoted answers)",
        "splits": ["train"],                  # only 'train' split available
        "text_columns": ["questionText", "answerText"],
    },
    {
        "id": "facebook/empathetic_dialogues",
        "name": "empathetic_dialogues",
        "description": "25k multi-turn empathetic conversations (Facebook Research, 32 emotion labels)",
        "splits": ["train", "validation", "test"],
        "text_columns": ["utterance"],         # context is '|'-separated history
    },
    {
        "id": "Amod/mental_health_counseling_conversations",
        "name": "mental_health_counseling",
        "description": "~3k curated mental-health counseling exchanges (context + response)",
        "splits": ["train"],
        "text_columns": ["Context", "Response"],
    },
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def save_split_as_jsonl(dataset_split, output_path: Path) -> int:
    """Writes a HuggingFace Dataset split to a .jsonl file. Returns row count."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    count = 0
    with open(output_path, "w", encoding="utf-8") as f:
        for row in dataset_split:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")
            count += 1
    return count


def print_sample(dataset_split, n: int = 2):
    """Prints n random rows for a quick sanity check."""
    import random
    indices = random.sample(range(len(dataset_split)), min(n, len(dataset_split)))
    for i in indices:
        row = dataset_split[i]
        keys = list(row.keys())[:4]          # show first 4 columns only
        preview = {k: str(row[k])[:120] for k in keys}
        print(f"    sample[{i}]: {preview}")


# ---------------------------------------------------------------------------
# Main download logic
# ---------------------------------------------------------------------------
def download_dataset(ds_cfg: dict, data_dir: Path, hf_token: str | None) -> dict:
    """Downloads one dataset, saves all splits, returns stats dict."""
    ds_id   = ds_cfg["id"]
    ds_name = ds_cfg["name"]
    target  = data_dir / "raw" / ds_name

    print(f"\n{'='*60}")
    print(f"  Downloading: {ds_id}")
    print(f"  Description: {ds_cfg['description']}")
    print(f"  Target dir : {target}")
    print(f"{'='*60}")

    dl_config = DownloadConfig(token=hf_token) if hf_token else None

    try:
        dataset = load_dataset(
            ds_id,
            download_config=dl_config,
            trust_remote_code=True,
        )
    except Exception as e:
        print(f"  ERROR loading {ds_id}: {e}")
        return {"dataset": ds_id, "status": "error", "error": str(e)}

    stats = {"dataset": ds_id, "name": ds_name, "splits": {}, "status": "ok"}

    for split_name, split_data in dataset.items():
        out_file = target / f"{split_name}.jsonl"
        n = save_split_as_jsonl(split_data, out_file)
        stats["splits"][split_name] = {"rows": n, "file": str(out_file)}
        print(f"  [{split_name}] {n:,} rows  →  {out_file}")
        print_sample(split_data, n=2)

    # Save dataset info (column names, features) for preprocess.py
    info_file = target / "info.json"
    info = {
        "hf_id":         ds_id,
        "name":          ds_name,
        "description":   ds_cfg["description"],
        "text_columns":  ds_cfg["text_columns"],
        "splits":        list(dataset.keys()),
        "features":      {k: str(v) for k, v in dataset[list(dataset.keys())[0]].features.items()},
    }
    with open(info_file, "w") as f:
        json.dump(info, f, indent=2)
    print(f"  Info saved → {info_file}")

    return stats


def main():
    parser = argparse.ArgumentParser(description="Download therapy finetuning datasets")
    parser.add_argument("--data-dir", default="./data",
                        help="Root directory to save raw datasets (default: ./data)")
    parser.add_argument("--hf-token", default=os.getenv("HF_TOKEN"),
                        help="HuggingFace token (needed for gated datasets). "
                             "Defaults to $HF_TOKEN env var.")
    parser.add_argument("--dataset", choices=[d["name"] for d in DATASETS],
                        help="Download only a specific dataset (default: all)")
    args = parser.parse_args()

    data_dir = Path(args.data_dir).resolve()
    data_dir.mkdir(parents=True, exist_ok=True)

    targets = DATASETS if not args.dataset else [
        d for d in DATASETS if d["name"] == args.dataset
    ]

    print(f"\nTheraAI Finetuning — Dataset Downloader")
    print(f"Output directory : {data_dir}")
    print(f"Datasets to fetch: {len(targets)}")
    if args.hf_token:
        print("HuggingFace token: provided")

    all_stats = []
    for ds_cfg in targets:
        stats = download_dataset(ds_cfg, data_dir, args.hf_token)
        all_stats.append(stats)

    # Summary report
    summary_file = data_dir / "raw" / "download_summary.json"
    with open(summary_file, "w") as f:
        json.dump(all_stats, f, indent=2)

    print(f"\n{'='*60}")
    print("DOWNLOAD SUMMARY")
    print(f"{'='*60}")
    total_rows = 0
    for s in all_stats:
        if s["status"] == "error":
            print(f"  FAILED  {s['dataset']}: {s.get('error')}")
        else:
            rows = sum(sp["rows"] for sp in s["splits"].values())
            total_rows += rows
            print(f"  OK      {s['dataset']} — {rows:,} rows across {len(s['splits'])} splits")

    print(f"\nTotal rows downloaded: {total_rows:,}")
    print(f"Summary saved → {summary_file}")
    print(f"\nNext step: python preprocess.py --data-dir {args.data_dir}")


if __name__ == "__main__":
    main()
