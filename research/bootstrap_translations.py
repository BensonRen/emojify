"""Generate the canonical translation set ONCE, consumed by every experiment.

For each source sentence, asks EVERY registry translator (common.config.TRANSLATORS)
whose API key is present to translate text -> emoji using the production system
prompt, writing one cell per slug. Writes <run-dir>/translations.jsonl:

    {"id", "text", "category", "expected_tone",
     "translations": {
         "<slug>": {"emoji": str, "model": str, "latency_ms": int, "ok": bool, "error": str|None},
         ...
     }}

RESUME / MERGE: if the target translations.jsonl already exists (e.g. the scaled
corpora already contain minimax+openai cells), it is loaded and ONLY missing or
ok:false cells are (re)generated. Existing ok cells are preserved byte-for-byte.
This lets new models be added without re-translating the existing ones.

Per-provider failures are isolated (mirrors production): one provider failing
never aborts the row.

Run:
    python3 bootstrap_translations.py --eval data/scaled_eval_semeval.jsonl \
        --run-dir results/smoke_multi --limit 3
    python3 bootstrap_translations.py --models claude,gemini --eval ...
"""
from __future__ import annotations

import argparse
import time

from common import config, llm
from common.datasets import load_curated
from common.io_utils import read_jsonl, resolve_run_dir, translations_path, write_jsonl


def translate(slug: str, text: str, *,
              system: str = config.TRANSLATE_SYSTEM,
              max_tokens: int = 32, temperature: float = 0.7) -> dict:
    """Translate one source with one registry translator. Failures are isolated.

    `system`/`max_tokens`/`temperature` default to the production prompt style; the
    game deck bake passes the richer style via --prompt game (see config.PROMPT_STYLES).
    """
    model = config.translator_model(slug)
    t0 = time.time()
    try:
        content = llm.translate_chat(
            slug,
            [{"role": "system", "content": system},
             {"role": "user", "content": text}],
            max_tokens=max_tokens, temperature=temperature,
        )
        return {"emoji": content.strip(), "model": model,
                "latency_ms": int((time.time() - t0) * 1000), "ok": True, "error": None}
    except Exception as e:  # noqa: BLE001 — isolate per-provider failure
        return {"emoji": "", "model": model,
                "latency_ms": int((time.time() - t0) * 1000), "ok": False, "error": str(e)}


def _load_existing(out_path) -> dict[str, dict]:
    """Load any prior translations.jsonl, indexed by row id (for merge/resume)."""
    existing: dict[str, dict] = {}
    if out_path.exists():
        for r in read_jsonl(out_path):
            existing[r["id"]] = r
    return existing


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--limit", type=int, default=None, help="only first N sources")
    ap.add_argument("--eval", default=None,
                    help="eval JSONL file (same schema as curated_eval.jsonl); "
                         "default = the curated set via load_curated()")
    ap.add_argument("--run-dir", default=None,
                    help="write translations.jsonl under this dir "
                         "(default: results/translations.jsonl)")
    ap.add_argument("--models", default=None,
                    help="comma-separated translator slugs to generate "
                         "(default: all registry translators with a key present)")
    ap.add_argument("--sleep", type=float, default=0.0,
                    help="seconds to sleep between translate calls (default: 0)")
    ap.add_argument("--prompt", choices=list(config.PROMPT_STYLES), default="production",
                    help="prompt style (default: production = shipped 1-8 emoji app, used by "
                         "the paper). 'game' = richer phrase-by-phrase deck prompt.")
    args = ap.parse_args()

    system, max_tokens, temperature = config.PROMPT_STYLES[args.prompt]

    run_dir = resolve_run_dir(args.run_dir)
    out_path = translations_path(run_dir)

    avail = config.available_translators()
    if args.models:
        requested = [s.strip() for s in args.models.split(",") if s.strip()]
        unknown = [s for s in requested if s not in config.TRANSLATORS_BY_SLUG]
        if unknown:
            raise SystemExit(f"unknown translator slug(s): {unknown}")
        no_key = [s for s in requested if s not in avail]
        if no_key:
            print(f"WARNING: skipping {no_key} — backing API key not present.")
        slugs = [s for s in requested if s in avail]
    else:
        slugs = avail
    print(f"Translators to generate: {slugs}  (prompt style: {args.prompt})")
    if not slugs:
        raise SystemExit("No translators available (no API keys present).")

    if args.eval:
        rows = list(read_jsonl(resolve_run_dir(args.eval)))
        print(f"Loaded {len(rows)} rows from eval file {args.eval}")
    else:
        rows = load_curated()
    if args.limit:
        rows = rows[: args.limit]

    # Merge/resume: preserve existing ok cells; only (re)generate missing/failed ones.
    existing = _load_existing(out_path)
    print(f"Resume: {len(existing)} existing row(s) in {out_path}")

    out = []
    gen_count = 0
    for i, row in enumerate(rows, 1):
        prior = existing.get(row["id"], {})
        translations = dict(prior.get("translations") or {})
        statuses = []
        for slug in slugs:
            cell = translations.get(slug)
            if cell and cell.get("ok"):
                statuses.append(f"{slug}=cached")
                continue
            new_cell = translate(slug, row["text"],
                                 system=system, max_tokens=max_tokens, temperature=temperature)
            translations[slug] = new_cell
            gen_count += 1
            statuses.append(f"{slug}={'ok' if new_cell['ok'] else 'ERR'}")
            if args.sleep:
                time.sleep(args.sleep)
        # Preserve original row fields; merged translations dict carries all slugs.
        out.append({**row, "translations": translations})
        print(f"[{i}/{len(rows)}] {row['id']}: {' '.join(statuses)}")

    write_jsonl(out_path, out)
    print(f"\nWrote {len(out)} rows ({gen_count} cells generated this run) -> {out_path}")


if __name__ == "__main__":
    main()
