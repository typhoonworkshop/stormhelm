# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.


Built with [Observable Notebook Kit](https://observablehq.com/notebook-kit/) as a static site. 

## Commands

- `npm run preview` — `notebooks preview --root nbks --template nbks/custom.tmpl` (local dev server over the `nbks/` notebooks)
- `npm run build` — `notebooks build --root nbks --template nbks/custom.tmpl --out ../dist -- nbks/*.html` (builds to `dist/`)

There is no test suite, linter, or type checker configured. Deployment is automatic: pushing to `main` triggers `.github/workflows/deploy.yml`, which calls a reusable workflow (`obsnotebooks/obsnbsetup`) to build and publish to GitHub Pages.

### Observable Notebook Kit cell mechanics

Each notebook `.html` file is a sequence of `<script id="N" type="...">` cells inside `<notebook>`. The `type` attribute is the cell's *mode*, and it changes how the cell compiles (`node_modules/@observablehq/notebook-kit/dist/src/javascript/transpile.js` is the dispatcher; worth reading directly rather than guessing, since this is a fast-moving pre-1.0 tool):

- **`type="module"` → "js" mode.** Despite the attribute name, this is *not* a native ES module executed by the browser — it's transpiled into a plain function body. Top-level `const`/`let`/`function` declarations (and `import {x} from ...` bindings) become **named outputs** that other cells in the notebook can reference as free variables; the runtime figures out dependency order from that, not from document order or explicit wiring. Nothing in this repo uses TypeScript, but for reference: **`type="text/x-typescript"` → "ts" mode** compiles the same way (declarations/references → outputs/inputs, same auto-display rule), just parsed with `@sveltejs/acorn-typescript` first and run through `stripTypes()` to erase type annotations before the rest of the "js"-mode pipeline runs — it's type-*stripped*, not type-*checked*; there's no diagnostics pass, so a cell with a type error still runs if it's otherwise valid JS once the annotations are removed. (There's also a separate `application/vnd.observable.javascript`/"ojs" mode for classic Observable syntax — `viewof`/`mutable` declarations, `name = expr` cell-naming, generator `function*` bodies — parsed by `@observablehq/parser` instead of plain acorn; this repo doesn't use it either, since `Generators.observe` below gets the same reactive effect from plain "js"-mode cells.)
- **`type="text/html"` → "html" mode.** The cell's literal content is HTML markup; `${expr}` interpolates a value, and any free variable used inside an interpolation becomes a dependency on whatever cell publishes it. Under the hood this compiles to an `htl.html\`...\`` tagged template.
- A cell whose body is a single expression (as html/md-mode cells always are) **auto-displays** its result — no explicit `display()` call needed. A `module`/"js"-mode cell that's a block of statements does need an explicit `display(...)` if it wants to show something.
- An html-mode cell can publish its rendered node under a name with the `output="name"` attribute on the `<script>` tag (e.g. `<script id="2" type="text/html" output="page">`); another cell can then take `page` as an input and query/mutate its actual live DOM nodes (the node is appended into the page by reference, not cloned, so mutating it is visible immediately). Cell order in the file doesn't matter — dependencies resolve by name, not by document position or id.

**Preferred style for pages (data displayed with no interactive form): separate containers from content.** Put the static page structure — the elements that always exist, with ids, with no conditionals or loops — in one html-mode cell (the *container*), and publish it via `output="page"`. Put all the logic that decides what to show — polling/loading data, picking which element to update, building any repeated rows — in one `module`/"js"-mode cell (the *content*), which takes `page` as input, grabs specific elements off it (`page.querySelector("#id")`), and injects content with plain DOM methods (`.textContent`, `.style`, `createElement`/`append`), not the `html` tag. Toggle visibility of pre-existing elements (`style.display`) rather than conditionally constructing different markup. `nbks/screen.html` and `nbks/index.html` (Titles — see "What this is" above) are the canonical examples of this pattern — read them before adding another data-display page or cell, rather than reaching for `html\`...\`` / `html.fragment\`...\`` the way `nbks/admin.js` does (that file is the exception: a stateful form/CRUD UI, not a plain display of data, so it legitimately builds dynamic DOM with the `html` tag instead).
