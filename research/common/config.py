"""Central configuration: load keys from research/.env.local and expose model constants.

All experiments import from here so model names and hosts live in exactly one place.
Mirrors the production functions in ../../api/*.js so research results are comparable
to what the live site produces.
"""
from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

# research/ root (this file is research/common/config.py)
RESEARCH_DIR = Path(__file__).resolve().parent.parent
load_dotenv(RESEARCH_DIR / ".env.local")

# ── Keys & host ──────────────────────────────────────────────────────────────
MINIMAX_API_KEY = os.environ.get("MINIMAX_API_KEY")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY")
MINIMAX_HOST = os.environ.get("MINIMAX_API_HOST", "https://api.minimax.io").rstrip("/")

# ── Models (must match ../../api/emoji-translate.js and emoji-eval.js) ─────────
MINIMAX_MODEL = "MiniMax-Text-01"
OPENAI_MODEL = "gpt-4o-mini"
REFEREE_MODEL = "MiniMax-Text-01"  # the production fixed referee

# Providers that produce translations (the two original contestants).
# Kept for backward compatibility; the full multi-model set is TRANSLATORS below.
PROVIDERS = ("minimax", "openai")

# ── Translator registry ────────────────────────────────────────────────────
# Ordered list of every text→emoji translator the harness can benchmark.
# Each entry: {"slug", "kind", "model"} where kind ∈ {minimax, openai, openrouter}.
# The first two route through the native MiniMax/OpenAI clients (matching
# production); the rest go through OpenRouter's OpenAI-compatible endpoint.
TRANSLATORS = [
    {"slug": "minimax",  "kind": "minimax",    "model": "MiniMax-Text-01"},
    {"slug": "openai",   "kind": "openai",     "model": "gpt-4o-mini"},
    {"slug": "claude",   "kind": "openrouter", "model": "anthropic/claude-sonnet-4.5"},
    {"slug": "gemini",   "kind": "openrouter", "model": "google/gemini-2.5-flash"},
    {"slug": "llama",    "kind": "openrouter", "model": "meta-llama/llama-3.3-70b-instruct"},
    {"slug": "deepseek", "kind": "openrouter", "model": "deepseek/deepseek-chat-v3.1"},
    {"slug": "qwen",     "kind": "openrouter", "model": "qwen/qwen-2.5-72b-instruct"},
    {"slug": "mistral",  "kind": "openrouter", "model": "mistralai/mistral-large-2512"},
]

# slug -> registry entry, for quick lookup.
TRANSLATORS_BY_SLUG = {t["slug"]: t for t in TRANSLATORS}


def translator_model(slug: str) -> str:
    """Return the underlying model id for a registry slug."""
    try:
        return TRANSLATORS_BY_SLUG[slug]["model"]
    except KeyError:
        raise ValueError(f"unknown translator slug {slug!r}")


def _kind_key_available(kind: str) -> bool:
    if kind == "minimax":
        return bool(MINIMAX_API_KEY)
    if kind == "openai":
        return bool(OPENAI_API_KEY)
    if kind == "openrouter":
        return bool(OPENROUTER_API_KEY)
    return False


def available_translators() -> list[str]:
    """Registry slugs whose backing API key is actually present (registry order)."""
    return [t["slug"] for t in TRANSLATORS if _kind_key_available(t["kind"])]

# The system prompt used by the production translator. Reused so research
# translations are identical in spirit to production ones.
TRANSLATE_SYSTEM = (
    "You are an emoji translator. Output ONLY a short sequence of emoji (1-8) that "
    "captures the meaning and tone. No words, no punctuation, no explanation."
)

# Game-deck prompt: a richer, phrase-by-phrase rendering for the "guess the lyric"
# flashcard game (game/). Deliberately NOT used by production or the research paper —
# those must stay faithful to the shipped 1-8 emoji product. Selected explicitly via
# bootstrap_translations.py --prompt game; never the default.
GAME_TRANSLATE_SYSTEM = (
    "You are an expert emoji translator for a 'guess the song lyric' game. "
    "Translate the lyric into emoji as fully and vividly as possible: render the key "
    "words, named people and places, actions, objects, and imagery phrase by phrase, in "
    "the order they appear, so a player could reconstruct the line's full meaning - not "
    "just its gist. Use about 6 to 14 emoji. Prefer specific, evocative emoji over generic "
    "ones, and convey the tone. Output ONLY emoji: no words, no numbers, no punctuation, "
    "no explanation."
)

# Prompt styles selectable at bake time -> (system prompt, max output tokens, temperature).
# "production" mirrors the shipped app (and the paper); "game" is the richer deck bake.
PROMPT_STYLES = {
    "production": (TRANSLATE_SYSTEM, 32, 0.7),
    "game": (GAME_TRANSLATE_SYSTEM, 120, 0.5),
}


def require(provider: str) -> None:
    """Raise a clear error if the key for `provider`/kind is missing."""
    if provider in ("minimax",) and not MINIMAX_API_KEY:
        raise RuntimeError("MINIMAX_API_KEY not set (research/.env.local)")
    if provider in ("openai",) and not OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY not set (research/.env.local)")
    if provider in ("openrouter",) and not OPENROUTER_API_KEY:
        raise RuntimeError("OPENROUTER_API_KEY not set (research/.env.local)")


def available_providers() -> list[str]:
    """Providers whose keys are actually present."""
    out = []
    if MINIMAX_API_KEY:
        out.append("minimax")
    if OPENAI_API_KEY:
        out.append("openai")
    return out
