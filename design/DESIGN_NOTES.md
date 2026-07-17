# TABLE — Contact Sheet direction (design notes)

Working notes for the redesign study in `table-contact-sheet.html`
(published mockup: https://claude.ai/code/artifact/dceaae7a-9a9f-49cc-8355-49fafa951bb6).
Bring this file along when working on the design in another tool — it carries
the tokens and rules the mockup was built from.

## Product idea in one line

TABLE is an archive of how everyday life felt around food. Entries (a meal that
happened once) are the object; dishes (reusable: name, ingredients, method) sit
underneath them. HOME shows entries as a photographic contact sheet; SUNDAY
reuses dishes.

## Aesthetic stance

Physical archival feeling — photographic contact sheet, archive box, collection
of prints. **Not** scrapbook, **not** faux paper: no fibres, no tape, no torn
edges, no Polaroid frames. Physicality comes from interaction (press-to-swell,
detail slides up like a print pulled from a stack, returns exactly to its grid
slot), not from texture.

## Tokens

Color (light, single theme):
- ground        #f1eee7  (bone)
- ground-2      #e9e5db
- card          #fbf9f4
- ink           #1a1817
- muted         #8a8378  (graphite)
- hairline      #dcd7cc
- Photographs are the only saturation. Brand rule: monochrome UI, no orange.

Type:
- Wordmark / display: Cormorant Garamond 600 (fallback Georgia), uppercase,
  letter-spacing -0.05em; italic for headlines and memory fragments.
- Archival voice: monospace (ui-monospace / SF Mono) for index lines, dates,
  frame counts, labels — always small, uppercase, generous letter-spacing.
- Body: system sans (Geist/Inter stack).

## Layout rules (HOME contact sheet)

- Two-column grid, 3px gutters, original image ratios (mix 4/5, 1/1, 4/3,
  and an occasional full-width 21/10 frame for rhythm).
- Month + places as index lines (e.g. "JULY 2026 / London · Vilnius · Greece"),
  plus an optional film-index strip ("Archive 07 · 2026 · 24 frames").
- Hairline dividers with a small centered label for episodes
  ("A rainy week at home").
- No cards, borders, titles, or tags in the gallery. Long-press peeks a
  two-line label (date · place / conditions). One editor's mark allowed:
  a hand-drawn ink circle on a selected frame (china-marker, in ink not red).

## Detail screen (two layers)

1. Memory first: photograph, date, place, auto-weather ("11°C · Rain ·
   Evening"), the atmosphere dot, optional serif-italic fragment.
2. Practical drawer beneath: DISH NAME · Made N times, then rows —
   How we made it / Ingredients / Plan again / Other times we had this.

## Atmosphere stamp

One-touch 2-axis field after saving: horizontal = drained ↔ energised,
vertical = quiet/soothing ↔ vivid/lively. Skippable, one dot, ~1 second.
Weather + daypart attach automatically (editable, never asked). Afterwards the
atmosphere shows only as a tiny dot mark, never a chart. Optional prompt
("Anything worth keeping?") with text or voice; never required.

## Status

Mockup only — nothing in the shipped app uses this yet. The current app still
uses the card-based HOME and the paper-texture pass.
