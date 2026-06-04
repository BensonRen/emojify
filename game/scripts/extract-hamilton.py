#!/usr/bin/env python3
"""Extract HAMILTON+Script.pdf into structured JSON (and a clean txt).

Heuristics (see notes in the JSON output):
- ACT markers:   a line matching ^ACT\\s+\\d+
- Song headers:  ^<n>. <Title>  with 1 <= n <= 30  (excludes e.g. "1776. New York City.")
- Speaker cues:  a line whose alphabetic chars are ALL uppercase (lyrics are sentence-case)
- Page numbers:  standalone integer lines are dropped
- Stage notes:   non-speaker lines that appear before any speaker in a song are kept as `notes`

Known limitation: the PDF typesets simultaneous singing in two columns. pdfplumber
flattens these, so some cues arrive pre-merged (e.g. "WASHINGTON COMPANY"). These are
preserved verbatim as the speaker label rather than guessed apart.
"""
import json
import re
import pdfplumber

import os

# Paths are resolved relative to this script (game/scripts/) so it runs from anywhere.
HERE = os.path.dirname(os.path.abspath(__file__))
PDF = os.path.join(HERE, "..", "HAMILTON+Script.pdf")
JSON_OUT = os.path.join(HERE, "..", "data", "packs", "hamilton.script.json")
TXT_OUT = os.path.join(HERE, "..", "data", "packs", "hamilton.script.txt")

ACT_RE = re.compile(r"^ACT\s+(\d+)$")
SONG_RE = re.compile(r"^(\d+)\.\s+(\S.*)$")
PAGENUM_RE = re.compile(r"^\d+$")

# A few all-caps tokens that are lyric content, not speaker cues.
NOT_A_SPEAKER = {"I", "A", "OK"}


def is_speaker(line: str) -> bool:
    letters = [c for c in line if c.isalpha()]
    if not letters:
        return False
    if not all(c.isupper() for c in letters):
        return False
    if line in NOT_A_SPEAKER:
        return False
    if len(line) > 60:  # a speaker cue is never a full sung line
        return False
    return True


def main():
    raw_lines = []
    with pdfplumber.open(PDF) as pdf:
        npages = len(pdf.pages)
        for page in pdf.pages:
            txt = page.extract_text() or ""
            raw_lines.extend(txt.split("\n"))

    acts = []
    cur_act = None
    cur_song = None
    cur_block = None  # {"speaker": str, "lines": [str, ...]}

    def flush_block():
        nonlocal cur_block
        if cur_block and cur_song is not None:
            cur_song["lines"].append({
                "speaker": cur_block["speaker"],
                "text": "\n".join(cur_block["lines"]),
            })
        cur_block = None

    def flush_song():
        nonlocal cur_song
        flush_block()
        if cur_song is not None and cur_act is not None:
            cur_act["songs"].append(cur_song)
        cur_song = None

    for raw in raw_lines:
        s = raw.strip()
        if not s:
            continue
        if PAGENUM_RE.match(s):
            continue  # page number

        m = ACT_RE.match(s)
        if m:
            flush_song()
            cur_act = {"act": int(m.group(1)), "songs": []}
            acts.append(cur_act)
            continue

        m = SONG_RE.match(s)
        if m and 1 <= int(m.group(1)) <= 30:
            flush_song()
            cur_song = {
                "number": int(m.group(1)),
                "title": m.group(2).strip(),
                "notes": [],
                "lines": [],
            }
            continue

        if cur_song is None:
            continue  # preamble before first song, if any

        if is_speaker(s):
            flush_block()
            cur_block = {"speaker": s, "lines": []}
            continue

        # dialogue / lyric line
        if cur_block is None:
            # text before any speaker in this song -> stage note / setting
            cur_song["notes"].append(s)
        else:
            cur_block["lines"].append(s)

    flush_song()

    doc = {
        "title": "Hamilton: An American Musical",
        "source_pdf": os.path.basename(PDF),
        "source_pages": npages,
        "parser_notes": [
            "Speaker cues detected as all-uppercase lines; lyrics are sentence-case.",
            "Song headers are '<n>. <Title>' with 1<=n<=30.",
            "Simultaneous two-column singing is flattened by text extraction; some "
            "speaker labels are pre-merged (e.g. 'WASHINGTON COMPANY') and kept verbatim.",
            "Standalone page-number lines were removed.",
        ],
        "acts": acts,
    }

    with open(JSON_OUT, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, indent=2)

    # Clean plain-text rendering
    out = [doc["title"], ""]
    for act in acts:
        out.append(f"ACT {act['act']}")
        out.append("=" * 40)
        for song in act["songs"]:
            out.append("")
            out.append(f"{song['number']}. {song['title']}")
            out.append("-" * 40)
            for note in song["notes"]:
                out.append(f"[{note}]")
            for ln in song["lines"]:
                out.append("")
                out.append(ln["speaker"])
                out.append(ln["text"])
        out.append("")
    with open(TXT_OUT, "w", encoding="utf-8") as f:
        f.write("\n".join(out))

    # stats
    nsongs = sum(len(a["songs"]) for a in acts)
    nlines = sum(len(s["lines"]) for a in acts for s in a["songs"])
    print(f"acts={len(acts)} songs={nsongs} speaker_blocks={nlines}")
    for a in acts:
        print(f"  ACT {a['act']}: {len(a['songs'])} songs")


if __name__ == "__main__":
    main()
