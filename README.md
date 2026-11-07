# MKJ CALC

A scientific calculator web app with three classic calculator personalities.
Everything is branded **MKJ CALC** — no third-party brand names appear anywhere in the UI.

## Models

| Model | Personality | Extras |
|---|---|---|
| **991 ES Plus** | Classic pad, natural display, S⇔D | M+, RCL/STO, 5-column pad |
| **991 EX Plus** | Class-style pad with menu row | nCr / nPr / GCD / LCM shortcut keys |
| **991 CW** | Flat pad with round HOME key | FORMAT / CATALOG / TOOLS / VARIABLE row |

Switch models from the tabs at the top — each model keeps its own look (accent colour,
screen tint, plate text) and its own key layout.

## Features

- Natural-style expression entry with a blinking caret and cursor movement (◀ ▶)
- `=` evaluation, `Ans`, `M+`, STO/RCL variables A–F and M
- S⇔D — toggles between a decimal result and a clean fraction (`1/8`, `1⌐1/2`, …)
- DEG / RAD / GRAD angle modes
- Number formats: Norm, Fix 2, Fix 4, Sci (×10ⁿ)
- History panel (tap an entry to reuse it), arrow-key history browsing
- Optional key-click sound, dark / light theme
- Fully responsive; works offline as plain static files
- Keyboard support: digits, operators, `Enter` = equals, `Backspace` = DEL,
  `Esc` = AC, `Shift+Enter` = S⇔D, `s` / `a` = SHIFT / ALPHA

## Functions

`+ − × ÷ ^ ² ³ x⁻¹ √ ∛ x! % |x|`  ·  `sin cos tan` and inverses/hyperbolics  ·
`log ln log₂ eˣ 10ˣ`  ·  `nCr nPr gcd lcm min max round floor ceil`  ·
constants `π e`, variables `A–F`, `x`, `y`.

## Structure

```
index.html        markup: header, LCD screen, keypad, panels
css/style.css     shell + LCD + key styling, 3 model skins, light theme
js/engine.js      tokenizer → recursive-descent parser → formatter
js/layouts.js     key definitions for the 3 models
js/app.js         state, key dispatch, panels, persistence
```

## Run

Just open `index.html`, or serve the folder:

```bash
python3 -m http.server 8080
```

No build step, no dependencies.
