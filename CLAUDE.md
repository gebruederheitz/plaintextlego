# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`@gebruederheitz/plaintextlego` assembles a plain-text file from a base file plus "module" files. Blocks in the base file are delimited by `# BEGIN <name>` and `# END <name>` comment lines. Blocks that plaintextlego writes carry an owner prefix (`# BEGIN ptl:<module>`); each module file supplies the content of its owned block, and owned blocks without a module are removed. The README has a full input/output example, the API and the upgrade notes.

Two terms are used throughout `src/PlainTextLego.mjs`: a **block** is the text between a BEGIN/END pair in the base (or target) file, represented by `src/Block.mjs`; a **module** is a source file whose content creates or replaces an owned block; the **owner** is the name prefix (`ptl` by default, `run()` option `owner`) that marks a block as written by plaintextlego. A block is owned exactly when its name starts with `<owner>:`; every other block is foreign and never touched.

## Main consumer: htmodules

The library exists mainly for [`@gebruederheitz/htmodules`](https://github.com/gebruederheitz/htmodules) (local checkout at `~/projects/htmodules/git`, which has its own CLAUDE.md). htmodules is a thin CLI that finds a base `.htaccess`, maps every `*.htaccess` file next to it to a block name, and calls:

```js
new PlainTextLego(baseFilePath).run(modules); // rewrites the base file in place
// after gebruederheitz/htmodules#1: .run(modules, null, { owner: 'htmodules', force })
```

All merge behaviour (replace, append, remove) lives here, and the htmodules README links to this README for the examples and caveats. So:

- **Treat the public surface as a contract:** the named exports `PlainTextLego` and `Block`, the constructor `(filename, encoding = 'utf8')`, `run(modules, target = null, { owner = 'ptl', force = false } = {})` resolving with the removed module names, the error codes `PTL_NO_MODULES` and `PTL_MODULE_UNREADABLE`, and the BEGIN/END comment format including the owner prefix. htmodules' consumers (deployed `.htaccess` files on real sites) depend on the exact output, including whitespace.
- **Keep file I/O on Node's `fs` / `fs/promises`** (with or without the `node:` prefix). htmodules' API tests mock exactly those four specifiers with memfs and inline all dependencies in vitest so the mock reaches this package's `dist/index.mjs`. Any other I/O route (a third-party fs wrapper, a native addon) would bypass that mock.
- **Mind the supported Node lines.** Both packages support every Node LTS line: each has `engines` in `package.json` and a Node matrix in `task test` (`Taskfile.yaml`). This package must not demand more than htmodules does, so change those four places together.

A behaviour change here should be checked by running htmodules' test suite against a local build of this package.

## Commands

Development tooling is described in the README: asdf (Node pinned in `.tool-versions`, minimum in `engines` in `package.json`), go-task, npm. Each task first runs `asdf install` and `npm i`, the latter only when `package.json` or `package-lock.json` changed.

```bash
task lint                # eslint + prettier --check, src/ only (tests are not linted)
task test                # lint, build once, then vitest run against the build on every supported Node LTS line
task test:node NODE=24   # build, then vitest run on one major line only
task build               # parcel build into dist/ on the .tool-versions Node, as published
task dev                 # parcel in watch mode
npm run run:demo         # applies examples/*.htaccess modules to examples/.htaccess; needs dist/
```

Lint and the build run once, on the `.tool-versions` Node: both only depend on the source, and Parcel derives the output syntax from `engines`, not from the Node that runs it. What differs between Node lines is running the build, so only the tests run in a matrix. `task test` loops over a `for: matrix:` of Node major versions. For each major, it runs the newest Node of that line that asdf has installed, selected through `ASDF_NODEJS_VERSION`; if none is installed, it installs `latest:<major>` first. The runs are sequential because the tests share the fixture result file.

The tests run against `dist/`, so they need a current build. While developing, keep `task dev` (Parcel watch) running next to `npx vitest`; the watch mode reruns when `dist/` changes. Run a single test by name, on the `.tool-versions` Node:

```bash
npx vitest run -t 'appends a module'
```

## Build and packaging

Plain JavaScript (`.mjs`, JSDoc types), no transpilation of syntax. The package is ESM only: Parcel builds `source` (`src/index.mjs`) into the single library target `module` (`dist/index.mjs`), which `exports` exposes as the package entry. The package has no runtime dependencies; Parcel would not bundle them for a library target, so any added later is imported at runtime.

`dist/` is gitignored and built during the release (see below).

## How the merge works

`run()` validates the owner, reads the base file, parses its blocks, reads all module files, and only then writes the result to `target` or, if no target is given, back to the base file. Every failure happens before the write, so a rejected run leaves the file untouched. The output is assembled in one pass over the parsed blocks (`assemble()`), copying the text between blocks as it is.

- **Parsing** uses a single regex, `^# BEGIN (name)\n(.*)^# END \1$` with flags `gms`. The block name is the rest of the BEGIN line. The END line must repeat that exact name, so `# END other` lines inside a block are ordinary content (see the `non-matching-close` fixtures). `.*` is greedy: if the same block name appears twice, one match spans from the first BEGIN to the last END.
- **Foreign blocks** (no `<owner>:` prefix) are copied unchanged, even when a module has the same name; that module is appended as a new owned block.
- **Replace:** an owned block with a module is rendered anew by `renderBlock()`: `# BEGIN <owner>:<name>\n`, the module content verbatim (a final line break is added if missing), `# END <owner>:<name>`. Blocks are built by concatenation, never with `String.replace`, whose replacement patterns (`$&`, `$$`, …) would mangle `.htaccess` content.
- **Append:** a module without an owned block is appended at the end: a line break if the file does not end with one, a blank line (unless the file is empty), then the rendered block and a line break. Replace renders the same block, so a second run with the same modules produces the same file.
- **Remove:** an owned block without a module is dropped with its trailing line break and one preceding blank line, which reverses an append byte for byte.
- **Guards:** a module file that cannot be read rejects with `PTL_MODULE_UNREADABLE` (skipping it would remove its block). An empty module set while the file holds owned blocks rejects with `PTL_NO_MODULES` unless `force` is set. An invalid owner (empty, whitespace or `:`) throws a `TypeError`.

## Tests

The tests cover the build that gets published, not the source. The specs import the package by its own name (package self-reference), which resolves through `exports` to `dist/index.mjs`. `vitest.config.mjs` externalizes `dist/`, so Node itself loads the build and resolves its imports, as it does for consumers, instead of Vite's module runner transforming it. Keep that setting.

Both specs run `PlainTextLego` against the real filesystem:

- `test/core/replace.spec.mjs` covers the output format with readable fixtures. Every test writes to the same `test/core/fixtures/result` (gitignored) and compares it byte for byte with an `expected.*` fixture via `chai-files`.
- `test/core/ownership.spec.mjs` covers ownership, removal, idempotency, module content and the failure paths with inline strings, each test in its own temporary directory, running in place like htmodules.

Because whitespace is compared exactly, a change to the output format shows up as a fixture diff; update the `expected.*` files deliberately, not to make a test pass.

## Releasing

`task release` runs `release-it --only-version` (`.release-it.yaml`): only from `main`; it runs `task test build` first: lint, build, test matrix. `build` runs only once (`run: once`), so the published `dist/` is the one the matrix tested; it is listed explicitly so the release keeps building even if `test` stops depending on it. `dist/` is gitignored but not npmignored, so npm publishes it without it being committed. release-it then bumps the version, refreshes and commits `package-lock.json`, tags, publishes to npm and opens a GitHub release in the browser. Release commits are `chore: Release v<version>`; other commits follow Conventional Commits (`feat:`, `chore:`).
