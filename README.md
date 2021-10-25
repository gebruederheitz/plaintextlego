# PlainTextLego

_Assemble plaintext files from modules (via comment lines)_

---

This library is mainly used for the `@gebruederheitz/htmodules` utility to dynamically
build modular `.htaccess` files.


## Installation

```
npm i @gebruederheitz/plaintextlego
```

## Usage

This library will parse a base file passed to the constructor and attempt to
find "blocks" surrounded by `# BEGIN ${blockName}` and `# END ${blockName}`
comments. These blocks can be replaced or appended via separate files.

### Basic usage (replace source file)

Say you have the following files:
```sh
--some/path/file.txt--

Some generic content to kick us off

# BEGIN generic

some generic content that could be manipulated through a module
# it can contain comments
# it could even contain "closing tags" as long as they don't match the module
# name
# END different module

# END generic

# BEGIN module-one
I will be replaced by the content of the module file...
# END module-one

# This is another generic comment that serves only demonstration purposes.

```
```sh
--some/path/module-one.txt--
You have been replaced! h4xx0rZ!!
```
```sh
--some/etc/module-two--

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
ptl.run({
    'module-one': './module-one.txt',
    'module-two': '../etc/module-two',
});

```

Which would result in:
```sh
--some/path/file.txt--

Some generic content to kick us off

# BEGIN generic

some generic content that could be manipulated through a module
# it can contain comments
# it could even contain "closing tags" as long as they don't match the module
# name
# END different module

# END generic

# BEGIN module-one
You have been replaced! h4xx0rZ!!
# END module-one

# This is another generic comment that serves only demonstration purposes.

# BEGIN module-two

# This module will be appended to the base file

#         _       _       _            _   _                  
#        | |     (_)     | |          | | | |                 
#   _ __ | | __ _ _ _ __ | |_ _____  _| |_| | ___  __ _  ___  
#  | '_ \| |/ _` | | '_ \| __/ _ \ \/ / __| |/ _ \/ _` |/ _ \ 
#  | |_) | | (_| | | | | | ||  __/>  <| |_| |  __/ (_| | (_) |
#  | .__/|_|\__,_|_|_| |_|\__\___/_/\_\\__|_|\___|\__, |\___/ 
#  | |                                             __/ |      
#  |_|                                            |___/       

# END module-two

```

### Advanced usage

In order to create a new file instead of manipulating the base file, you can
pass a file path as a second parameter to the `run` method:

```js
const modules = {
    mymodule: './myptlmodule.txt',
    anothermodule: '/some/path/to/another/module',
};

ptl.run(modules, './result.txt');
```

All of the above describes usage with ES modules. In many cases you might want
to use the CommonJS builds (when building nodeJS libraries for instance):

```js
const {PlainTextLego} = require('@gebruederheitz/plaintextlego');
```

### Caveats

 - Modules can currently not be removed. They can only be "emptied" by providing 
   an empty module file.
 - Custom ordering is currently not possible and can only be guaranteed if the
   module blocks exists in the base file. New blocks will always be appended to
   the end of the file.

## Development

Please use the [`yarn`](https://classic.yarnpkg.com/en/docs/install) package manager.
Use `eslint` & `prettier`.

```shell
# Install dependencies implicitly...
$> yarn
# ...or explicitly
$> yarn install

# Watch sources
$> yarn watch
# or
$> make dev

# Create production builds
$> yarn build
# or
$> make build

# Run the demo: Apply example modules to example base file; print result
$> yarn run:demo

# Lint files and check if they match the code style using eslint & prettier
$> yarn lint

# Run the mocha test suite
$> yarn test

# Install dependencies, lint sources, run test suite:
$> make test
```
