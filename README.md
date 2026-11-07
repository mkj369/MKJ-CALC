# MKJ CALC

A full scientific calculator that runs in the browser — three calculator *models*,
twelve *modes*, and a real math engine written from scratch (no libraries).
Everything is branded **MKJ CALC**; no third-party brand names appear in the UI.

## Flow

1. **Pick a model** — 991 ES Plus / 991 EX Plus / 991 CW.
2. **Pick a mode** — 16 modes: Calculate, Complex, Statistics, Distribution,
   Matrix, Vector, Equation, Inequality, Base-N, Ratio, Table, Spreadsheet,
   Solve, Verify, Math Box, Constants.
3. **Calculate** — the keypad is that model's own layout: its key order, its SHIFT
   (yellow) and ALPHA (red) functions, its plate text and screen tint.

## Models

| Model | Personality | Key traits |
|---|---|---|
| **991 ES Plus** | classic pad | CALC / SOLVE / ∫dx row, ∫ Σ M+ STO, rectangular keys |
| **991 EX Plus** | ClassWiz pad | S⇔D, x⁻¹, 4 function rows + number block, MENU key |
| **991 CW** | flat pad | circular function keys, HOME / SETTINGS / FORMAT / CATALOG / TOOLS / VARIABLE |

Every model renders a real device frame: brushed-plastic body with screws, solar cell
strip, 4-gradation LCD, round ON/MENU keys and a genuine navigation pad
(▲ ◀ ▶ ▼ around a centre key).

Each model carries its own `keys[]` table in `js/layouts.js`, including per-key
SHIFT (`s` / `sv`) and ALPHA (`a` / `av`) bindings.

## Modes

- **Calculate** — arithmetic, functions, Ans, M+, STO/RCL, CALC (with variable prompt)
- **Complex** — a+bi arithmetic, i, ∠, Conjg/Arg/Re/Im, rectangular ⇄ polar
- **Statistics** — 1-var and 2-var data, mean/σ/s/Q1/Q3, linear & quadratic regression
- **Distribution** — Normal (P, Q, between, inverse), Binomial (P, Q), Poisson (P, Q)
- **Matrix** — 3 stored matrices (A/B/C), 1×1 … 4×4, det, inverse, transpose, trace, A±B, A×B, kA, solve A·X=B
- **Vector** — 3-D a, b: sum, difference, dot, cross, magnitude, angle, unit vector
- **Equation** — polynomial roots degree 2–4 (Durand–Kerner, complex safe) + simultaneous 2–4 unknowns
- **Inequality** — 2nd/3rd/4th degree inequalities → solution intervals
- **Base-N** — DEC/HEX/BIN/OCT conversion with AND/OR/XOR/NOR and per-base digit locking
- **Ratio** — solve a : b = c : d for the missing term, with fraction form
- **Table** — f(x) and optional g(x) tables with start/end/step
- **Spreadsheet** — 5 × 8 cell grid with `=A1+B1`, `=SUM(A1:A3)`, `=AVERAGE/MAX/MIN/COUNT(…)`
- **Math Box** — dice roll (2–20 sides), coin toss probability, random integers
- **Solve** — numeric root of f(x) = 0 (Newton + bisection fallback), accepts `lhs=rhs`
- **Verify** — compares two expressions and reports TRUE/FALSE
- **Constants** — 18 physical constants, tap to insert

## Engine (`js/engine.js`)

- Tokenizer → recursive-descent parser → evaluator
- Complex-number library (add/sub/mul/div/pow/sqrt/arg/abs)
- Calculus: `∫(f,a,b)`, `d/dx(f,a)`, `∑(f,from,to)`, `Π(f,from,to)`
- `Pol(x,y)` / `Rec(r,θ)` returning `r=… θ=…` pairs
- Functions: trig + inverse + hyperbolic, log/ln/log₂, roots, factorial, nCr/nPr,
  gcd/lcm, floor/ceil/round/frac/sign, min/max, rand/randInt
- Matrices (det, inverse, Gauss-Jordan), statistics + distributions (normal, t),
  base conversion, fraction and π-form recognisers
- Formatting: Norm / Fix 2–4 / Sci / Eng / Fraction / π-form, rectangular or polar complex

## Features

- Natural-style entry with caret, ◀ ▶ cursor movement, ↑ ↓ history browsing
- S⇔D cycles decimal → fraction → π-form (and rectangular → polar for complex)
- SHIFT / ALPHA modifiers, optional auto-fraction display
- History sheet, variables sheet (A–F, M), catalog of every function
- DEG / RAD / GRAD, key click sound, haptics, dark / light theme
- Everything persisted in `localStorage`; works offline as static files
- Physical keyboard: digits, operators, `Enter` = equals, `Backspace` = DEL,
  `Esc` = AC, `Shift+Enter` = S⇔D, arrows for caret/history

## Structure

```
index.html       views: model picker → mode grid → calculator + panels
css/style.css    shell, LCD, keys, 3 model skins, mode panels, sheets
js/engine.js     math engine (parser, complex, calculus, stats, matrices, formatting)
js/layouts.js    per-model keypads + function catalog
js/modes.js      the twelve mode modules
js/app.js        router, input, evaluation, persistence
```

## Run

Open `index.html`, or serve the folder:

```bash
python3 -m http.server 8080
```

No build step, no dependencies.
