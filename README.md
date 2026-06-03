# Emojify

**Translate English text into emoji with two LLMs head-to-head — and measure whether the translation is any good.**

Live at **[emojify.me](https://emojify.me)**.

Most emoji translators just emit emoji and stop. The hard part is knowing whether the
translation actually *preserves the meaning* and *reads like something a human would send*.
Emojify runs two language models side by side and scores each output along three axes
grounded in the academic literature.

## How it works

1. You enter text. Two models translate it to emoji concurrently:
   - **MiniMax** (`MiniMax-Text-01`)
   - **OpenAI** (`gpt-4o-mini`)
2. Each output is scored by a **single fixed referee model** (`MiniMax-Text-01`) so the
   comparison is fair — same grader, two contestants:
   - **Fidelity** — does the emoji preserve the source meaning? (back-translation / cloze probe)
   - **Naturalness** — would a real person actually text this?
   - **Tone match** — does the emoji's emotional read match the source?

### The research behind the metrics

The metrics are motivated by prior work on text-to-emoji translation and evaluation:

- **EmojiLM** (Peng et al., 2023) — seq2seq text↔emoji trained on an LLM-synthesized parallel corpus. [arXiv:2311.01751](https://arxiv.org/abs/2311.01751)
- **emoji2vec** (Eisner et al., 2016) — emoji embeddings in word2vec space. [arXiv:1609.08359](https://arxiv.org/abs/1609.08359)
- **Emojinize** (2024) — back-translation / cloze evaluation of emoji informativeness. [arXiv:2403.03857](https://arxiv.org/abs/2403.03857)
- **Semantics-preserving evaluation** (2024) — score attribute preservation, not exact match. [arXiv:2409.10760](https://arxiv.org/abs/2409.10760)
- **SemEval-2018 Task 2** — single-emoji prediction benchmark. [ACL S18-1003](https://aclanthology.org/S18-1003)

The core problem these address: one sentence maps to *many* valid emoji renderings, so
token-overlap metrics like BLEU and exact-match are invalid. Emojify measures meaning
preservation and human-likeness instead.

## Architecture

Static front end + two Vercel serverless functions. No build step, no framework, no
external JS libraries (strict CSP). Zero npm dependencies.

```
index.html              # the whole UI (vanilla, inline CSS/JS)
api/emoji-translate.js  # POST: { text } -> { results: [{provider, emoji, latencyMs, ok}] }
api/emoji-eval.js       # POST: { text, emoji } -> { fidelity, naturalness, tone, toneMatch, backTranslation }
vercel.json             # cleanUrls + security headers (CSP)
```

## Configuration

API keys are read **only** from environment variables — never hardcoded, never committed.
Set these in your Vercel project (Settings → Environment Variables):

| Variable           | Required | Purpose                                  |
| ------------------ | -------- | ---------------------------------------- |
| `MINIMAX_API_KEY`  | yes      | MiniMax translation + the referee judge  |
| `OPENAI_API_KEY`   | optional | Enables the OpenAI column (degrades gracefully if unset) |

`MINIMAX_API_HOST` defaults to `https://api.minimax.io`.

### Local development

```bash
vercel dev      # serves the page AND the /api functions
```

Create a local, git-ignored `.env.local` with your keys (this file is in `.gitignore` and
must never be committed):

```
MINIMAX_API_KEY=...
OPENAI_API_KEY=...
```

## License

MIT
