# Upgrading

## From 2.x to 3.0

Version 3 changes which blocks plaintextlego manages. A block belongs to
plaintextlego exactly when its name carries the owner prefix, `ptl:` by
default (`# BEGIN ptl:module-one`). Every other block is foreign and is never
changed or removed. A block is removed by no longer passing its module.

### 1. Rename the blocks your modules manage

Do this once in every base file, before the first run with version 3:

```diff
-# BEGIN module-one
+# BEGIN ptl:module-one
 …
-# END module-one
+# END ptl:module-one
```

Placeholder blocks that only control the order need the prefix too. With GNU
sed, list the module names so that foreign blocks such as `WordPress` stay as
they are (on macOS, write `sed -i '' -E`):

```sh
sed -i -E 's/^# (BEGIN|END) (module-one|module-two)$/# \1 ptl:\2/' .htaccess
```

If you pass the `owner` option, use `<owner>:` instead of `ptl:`.

If you skip the rename, the old blocks become foreign: every module is
appended as a new block and the old block stays, so its content appears
twice. Delete the old blocks by hand to recover.

### 2. Remove blocks by dropping their module

|                              | 2.x               | 3.0                   |
| ---------------------------- | ----------------- | --------------------- |
| Owned block without a module | kept              | **removed**           |
| Empty module file            | removes the block | writes an empty block |

After the rename, a block whose module you no longer pass is removed on the
next run. Check that every block you rename still has its module, unless you
want it gone.

If you used empty module files to remove blocks, delete those files instead.

### 3. Expect new rejections

`run()` now rejects in these cases. It always rejects before writing, so the
file stays as it was.

| `error.code`            | Cause                                                     | In 2.x                                 |
| ----------------------- | --------------------------------------------------------- | -------------------------------------- |
| `PTL_MODULE_UNREADABLE` | A module file cannot be read.                             | The module was skipped.                |
| `PTL_MODULE_INVALID`    | A module has a line starting with `# BEGIN ` or `# END `. | Accepted; the next run broke the file. |
| `PTL_NO_MODULES`        | No modules are given, but the file holds owned blocks.    | Nothing happened.                      |

For `PTL_MODULE_INVALID`, reword the offending comment lines in the module.
For `PTL_NO_MODULES`, pass `{ force: true }` if you really want every owned
block removed. The `PTL_MODULE_*` errors name the module and its file;
`PTL_MODULE_INVALID` also names the line.

### 4. Optional: use the return value

`run()` now resolves with the names of the modules whose blocks were removed,
instead of `undefined`. Code that ignores the result needs no change.

```js
const removed = await ptl.run(modules);
// e.g. ['old-module']
```

### Output changes

- Appended blocks have no extra blank lines inside them. A block that 2.x
  appended and that was not replaced since loses those blank lines on the
  first run with 3.0. After that, repeated runs give the same file.
- Removing a block also removes the blank line before it, so no blank lines
  pile up.
- `$$`, `$&`, `` $` `` and `$'` in module content are written as they are. In
  2.x, replacing a block interpreted them as `String.replace` patterns.

### Subclasses

If you extend `PlainTextLego`, its protected methods have changed:
`applyUpdatedBlockContents()`, `updateBlockContents()` and `getBlockByName()`
are gone, and the merge now happens in `assemble()` and `renderBlock()`.
`Block` only gained `getIndex()`.

## From 1.x to 2.0

Version 2 is published as an ES module only; the CommonJS build is gone.
Import the package as an ES module:

```js
import { PlainTextLego } from '@gebruederheitz/plaintextlego';
```

CommonJS code can load it with a dynamic `import()`:

```js
async function build() {
    const { PlainTextLego } = await import('@gebruederheitz/plaintextlego');
    // …
}
```

Since Node 22.12, a plain `require()` of the package also works, because Node
can load ES modules that way. This is not tested and not part of the
package's contract.

The minimum Node version is the `engines` field in `package.json`. 2.0
requires Node 22 or later: lower than 1.3.2 (Node 24), higher than 1.3.1 and
earlier (Node 16). The API did not change.
