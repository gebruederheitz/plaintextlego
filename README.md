# PlainTextLego

_Assemble plaintext files from modules (via comment lines)_

---

This library is mainly used for the `@gebruederheitz/htmodules` utility to dynamically
build modular `.htaccess` files.


## Installation

```
npm i @gebruederheitz/plaintextlego
```

plaintextlego supports every Node.js release line that is currently in LTS
(active or maintenance), and the published build is tested on each of them. The exact
minimum version is the `engines` field in `package.json`.

## Usage

This library parses a base file passed to the constructor and finds "blocks"
surrounded by `# BEGIN ${blockName}` and `# END ${blockName}` comments. It then
applies "modules", separate files mapped to block names:

- Every block plaintextlego writes is **owned**: its name carries the owner
  prefix, by default `ptl:` (`# BEGIN ptl:module-one`). All other blocks are
  **foreign** and are never touched, whatever their name. This lets other tools
  (such as WordPress in an `.htaccess`) keep their own blocks in the same file.
- A module whose owned block exists replaces that block's content in place.
- A module without an owned block is appended to the end of the file.
- An owned block without a module is removed. **To remove a block, stop passing
  its module.**

### Basic usage (replace source file)

Say you have the following files:

```sh
--some/path/file.txt--
Some generic content to kick us off

# BEGIN generic
This block has no "ptl:" prefix, so it is foreign to plaintextlego:
it is never replaced or removed, even by a module called "generic".
# it could even contain "closing tags" as long as they don't match the block
# name
# END different module
# END generic

# BEGIN ptl:module-one
I will be replaced by the content of the module file...
# END ptl:module-one

# BEGIN ptl:module-three
I was written by an earlier run, but my module is gone, so I will be removed.
# END ptl:module-three

# This is another generic comment that serves only demonstration purposes.
```
```sh
--some/path/module-one.txt--
You have been replaced! h4xx0rZ!!
```
```sh
--some/path/module-two.txt--
# This module will be appended to the base file

#         _       _       _            _   _
#        | |     (_)     | |          | | | |
#   _ __ | | __ _ _ _ __ | |_ _____  _| |_| | ___  __ _  ___
#  | '_ \| |/ _` | | '_ \| __/ _ \ \/ / __| |/ _ \/ _` |/ _ \
#  | |_) | | (_| | | | | | ||  __/>  <| |_| |  __/ (_| | (_) |
#  | .__/|_|\__,_|_|_| |_|\__\___/_/\_\\__|_|\___|\__, |\___/
#  | |                                             __/ |
#  |_|                                            |___/
```

You could then run the following:

```js
import { PlainTextLego } from '@gebruederheitz/plaintextlego';

const ptl = new PlainTextLego('./file.txt');
const removed = await ptl.run({
    'module-one': './module-one.txt',
    'module-two': './module-two.txt',
});
// removed: ['module-three']
```

Which would result in:

```sh
--some/path/file.txt--
Some generic content to kick us off

# BEGIN generic
This block has no "ptl:" prefix, so it is foreign to plaintextlego:
it is never replaced or removed, even by a module called "generic".
# it could even contain "closing tags" as long as they don't match the block
# name
# END different module
# END generic

# BEGIN ptl:module-one
You have been replaced! h4xx0rZ!!
# END ptl:module-one

# This is another generic comment that serves only demonstration purposes.

# BEGIN ptl:module-two
# This module will be appended to the base file

#         _       _       _            _   _
#        | |     (_)     | |          | | | |
#   _ __ | | __ _ _ _ __ | |_ _____  _| |_| | ___  __ _  ___
#  | '_ \| |/ _` | | '_ \| __/ _ \ \/ / __| |/ _ \/ _` |/ _ \
#  | |_) | | (_| | | | | | ||  __/>  <| |_| |  __/ (_| | (_) |
#  | .__/|_|\__,_|_|_| |_|\__\___/_/\_\\__|_|\___|\__, |\___/
#  | |                                             __/ |
#  |_|                                            |___/
# END ptl:module-two
```

Running it again with the same modules gives the same file.

### API

```js
const removed = await ptl.run(modules, target, { owner, force });
```

- `modules`: an object mapping module names to file paths. The module name is
  the block name without the owner prefix.
- `target` (default `null`): a file path to write the result to. With `null`,
  the base file is rewritten in place.
- `owner` (default `'ptl'`): the prefix of the blocks this run owns, without
  the colon. Blocks of other owners are foreign to this run, so independent
  callers can maintain their own blocks in the same file. It must not contain
  whitespace or `:`.
- `force` (default `false`): see "No modules" below.
- Resolves with the names of the modules whose blocks were removed.

Module content is inserted verbatim. A missing final line break is added, so
`# END` always starts its own line. An empty module produces an empty block.
Module content must not contain lines starting with `# BEGIN ` or `# END `,
see below.

`run()` rejects without writing anything when:

- **a module file cannot be read** (`error.code === 'PTL_MODULE_UNREADABLE'`):
  skipping it would remove its block.
- **a module contains a block delimiter**, a line starting with `# BEGIN ` or
  `# END ` (`error.code === 'PTL_MODULE_INVALID'`): the next run would read it
  as the start or end of a block, which can delete other blocks or append the
  module again on every run. This applies to delimiters of any name, including
  foreign ones such as `# END WordPress`.
- **no modules are given** while the file holds owned blocks
  (`error.code === 'PTL_NO_MODULES'`): this usually means the module files went
  missing, and it would remove every owned block. Pass `force: true` if that is
  what you want.

### Controlling the order

New blocks are always appended to the end of the file. To place a block
elsewhere, add an empty placeholder with the owner prefix to the base file:

```sh
# BEGIN ptl:module-two
# END ptl:module-two
```

A placeholder without the prefix (`# BEGIN module-two`) is a foreign block: it
stays as it is, and the module is appended at the end.

The package is published as an ES module only.

### Upgrading

See [UPGRADING.md](UPGRADING.md) for the steps from version 1 to 2 and from 2
to 3.

## Development

Use [asdf](https://asdf-vm.com) with NPM, eslint and prettier. Using 
[go-task / Taskfiles](https://taskfile.dev) gives you a head start over the
competition.

```shell
# List all the available tasks
$> task -l 

# Build once, then test the build on every supported Node.js LTS line
$> task test

# The tests run against dist/: while developing, rebuild on change …
$> task dev
# … and rerun the tests on rebuild (in a second terminal)
$> npx vitest

# Run the demo (needs a build in dist/): Apply example modules to example base file; print result
$> npm run run:demo
```
