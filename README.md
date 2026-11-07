# MKJ CALC

A full scientific calculator that runs in the browser — three calculator *models*,
sixteen *modes*, and a real math engine written from scratch (no libraries).
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
| **991 CW** | flat pad | circular function keys, icon **HOME** screen, SETTINGS / FORMAT / CATALOG / TOOLS / VARIABLE, tall right-edge scroll rocker |

Every model renders a real device frame: plastic body, red solar cell strip,
green-grey LCD, small round control keys and a genuine navigation pad
(▲ ◀ ▶ ▼ around a centre OK key). The 991 CW follows the real key map
key-for-key: 3 control rows (ON · HOME · ▲ / SETTINGS · MENU · ◀ OK ▶ /
SHIFT · VARIABLE · FUNCTION · ▼ · CATALOG · TOOLS), six function columns
(1/x x² √ x^ x³ log and Ans sin cos tan ( )), a five-column number pad
ending in DEL AC / × ÷ / + − / 0 . ×10ˣ FORMAT EXE, and a gold SHIFT key.
Boot lands on the CW **icon home screen** (4 × 4: Calculate, Statistics,
Distribution, Spreadsheet, Table, Equation, Inequality, Complex, Base-N,
Matrix, Vector, Ratio, Solve, Verify, Math Box, Constants) where the arrow
keys move the boxed selection and EXE/OK opens it. `HOME` returns to it.

Key sizes are measured at runtime (`fitKeys()`) so the whole device always
fits without scrolling, from 360 × 640 phones up to tablets.

Each model carries its own key table in `js/layouts.js`, including per-key
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
- **Constants** — 19 physical constants with a live search box, tap to insert the value

## Engine (`js/engine.js`)

- Tokenizer → recursive-descent parser → evaluator
- Complex-number library (add/sub/mul/div/pow/sqrt/arg/abs)
- Calculus: `∫(f,a,b)`, `d/dx(f,a)`, `∑(f,from,to)`, `Π(f,from,to)`
- `Pol(x,y)` / `Rec(r,θ)` returning `r=… θ=…` pairs
- Functions: trig + inverse + hyperbolic, log/ln/log₂, roots, factorial, nCr/nPr,
  `mod`, variadic `GCD`/`LCM`, `PrimeFac` (prime factorisation with `a^b×c` display),
  `isPrime`, `RanInt`/`RanList`, `Vector`/`Dot`/`Cross`/`Mag`/`UnitV`/`Angle`,
  floor/ceil/round/frac/sign, min/max, rand
- Matrices (det, inverse, Gauss-Jordan), statistics + distributions (normal, t),
  base conversion, fraction and π-form recognisers
- Formatting: Norm / Fix 2–4 / Sci / Eng / Fraction / π-form, rectangular or polar complex;
  display digits and significant digits are configurable
- Postfix `²`, `³`, `⁻¹`, `!`, `%`, `°`, `ʳ`, `ᵍ`; list results render as `[a  b  c]`

## Features

- Natural-style entry with caret, ◀ ▶ cursor movement, ↑ ↓ history browsing
- S⇔D cycles decimal → fraction → π-form (and rectangular → polar for complex)
- SHIFT / ALPHA modifiers, optional auto-fraction display
- History sheet, variables sheet (A–F, M), catalog of every function
- DEG / RAD / GRAD, key click sound, haptics, dark / light theme
- Everything persisted in `localStorage`; works offline as static files
- Physical keyboard: digits and operators, `Enter` = EXE, `Backspace` = DEL,
  `Delete` = AC, `Esc` = back out / AC, arrows for caret, history and menus,
  `F1` SHIFT · `F2` VARIABLE · `F3` CATALOG · `F4` SETTINGS · `F5` MENU · `F9` FORMAT,
  `Ctrl+H` home, `Ctrl+R` AC

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


---

# Feature Reference

Everything below is implemented and exercised by the test suites. Anything that is
*not* implemented is listed in **Unsupported / differences from the fx-991CW** — no
button in this app pretends to work.

## Display

| Element | Behaviour |
|---|---|
| Flags line | `S` `A` `M` `STO` `RCL` indicators reflect SHIFT, ALPHA, memory and store state |
| Right cluster | current app (`COMP`, `CMPLX`, `STAT`, …) and angle unit (`D`/`R`/`G`) |
| Expression line | caret-tracked entry, `◀ ▶` move, `DEL` backspace, pretty `×` `÷` `−` `√` glyphs |
| Result line | formatted per the Number Format setting |
| Second line | alternative forms (fraction, π-form, factorisation, element count) |
| LCD menus | SETTINGS / FORMAT / TOOLS render inside the display and take the keypad |

## SETTINGS menu (SETTINGS key or `F4`)

| Item | Options |
|---|---|
| Angle Unit | Degree / Radian / Gradian |
| Input/Output | MathI/O / LineI/O |
| Number Format | Norm 1 · Fix 2–4 · Sci · Eng · Fraction · π-form |
| Complex Result | a+bi / r∠θ |
| Frequency | On / Off |
| Display Contrast | 1–5 (applies live) |
| Language | English / বাংলা (UI strings only, maths notation never changes) |
| Key Sound | On / Off |
| Vibration | On / Off |
| Reset | Reset all settings, variables and history, or Cancel |

All of it persists in `localStorage` under `mkjcalc.v4`.

## FORMAT key / TOOLS key

- **FORMAT** (`F9`): S⇔D toggle, number format, fraction result on/off, display digits, sci digits.
- **TOOLS**: calculation history (open / clear), variable manager, function catalog, about.

## Variables and memory

- Ten variables: `A B C D E F M x y z`.
- **STO**: stores the current Ans into a variable (`SHIFT`+`STO`-equivalent row key, VARIABLE key, or the sheet tabs).
- **RCL**: places a variable value in the result line.
- **Variable key (`F2`) / sheet "Insert" tab**: inserts the symbol into the expression.
- `M+` / `M−` accumulate Ans into `M` and show the new total.

## History

- Last 60 calculations, newest first, persisted.
- `↑` / `↓` (and the scroll rocker) recall previous entries into the expression line.
- Browsable and clearable from the history sheet and the TOOLS menu.

## Keyboard map

| Key | Action |
|---|---|
| `0-9` `.` `+ - * / ^ ( ) %` | insert |
| `Enter` / `=` | EXE |
| `Backspace` | DEL |
| `Delete` | AC |
| `Esc` | close menu → back out → AC |
| `←` `→` `↑` `↓` | caret, history, menu navigation |
| `F1` `F2` `F3` `F4` `F5` `F9` | SHIFT · VARIABLE · CATALOG · SETTINGS · MENU · FORMAT |
| `Ctrl+H` / `Ctrl+R` | home screen / AC |
| `p` `e` `i` `A-F` `x` `y` `z` `!` | constants, variables, factorial |

## Tests

```bash
node tests/run.js              # everything
node tests/engine.test.js      # 170 assertions, no dependencies
node tests/ui.test.js          # 54 assertions, needs puppeteer-core + Chromium
node tests/modes.test.js       # 41 assertions driving every app's own controls
```

`tests/engine.test.js` covers arithmetic and precedence, angle units, logarithms,
complex arithmetic, calculus, series, the solver, matrices, statistics, base
conversion, vectors, randomness bounds, formatting and error cases.

`tests/ui.test.js` boots the real page in headless Chromium and checks that every
key on the pad has a unique action and that pressing all of them throws nothing,
that arithmetic works through the physical keys, that the LCD menus navigate and
change state, that history/variables/memory work, that settings round-trip through
a reload, that MathI/O draws stacked fractions while LineI/O stays linear, that all
16 apps render with live controls, that there is no overflow from 360 px to
1280 px, and that no third-party brand name appears in the DOM.

`tests/modes.test.js` drives the apps themselves and asserts on their output:
matrix determinant, quadratic and complex equation roots, Base-N rows, statistics
mean and SD, ratio solving, the table of values, spreadsheet formulas, numeric
solve, VERIFY true/false, normal density and CDF, dice, constant search, vector
dot product and magnitude, and an inequality interval.

The two browser suites need `puppeteer-core` and a Chromium binary; set
`CHROME_PATH` if Chromium is not one of the usual locations, otherwise they skip.

## Unsupported / differences from the fx-991CW

This is a faithful web calculator, not an emulator of Casio firmware. The
following are intentionally different, and every one of them is *absent* rather
than faked:

- **Exact symbolic algebra.** Results are numeric. Simplifying `x²/x` to `x`,
  expanding brackets or solving for a symbol in terms of others is not done.
- **Natural (stacked) fraction display** covers simple `a/b` in the entry line;
  nested fractions, mixed numbers and stacked radical/exponent layouts are still
  drawn linearly.
- **MathI/O vs LineI/O** switches the stacked-fraction display of the entry line;
  the underlying editor is always the same caret editor.
- **QR code / ClassPad sync** — not applicable to a web page.
- **Distribution values** are computed numerically (erf-based), so extreme tails
  can differ from the device in the last digit.
- **Matrix elements** are real numbers only; complex matrices are not supported.
- **Base-N** supports 32-bit integers (the real device uses 32-bit too, but
  negative-value bit display differs).
- **Equation app** covers polynomials (2–4) and linear simultaneous systems; it
  does not solve general transcendental equations symbolically (Solve does that numerically).
- **Spreadsheet** covers a 5 × 8 grid with arithmetic references and
  SUM/AVERAGE/MAX/MIN/COUNT; it is not a full spreadsheet.
- **Language** switches the UI strings of the sheets (English/বাংলা); the device
  labels on the plastic are physical print and stay English, as printed hardware would.
- **Models.** The 991 CW pad is the reference for the physical device; the ES Plus
  and EX Plus skins reuse the app's engine under their own key maps.
