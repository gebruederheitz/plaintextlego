const { PlainTextLego } = require('../dist');

const p = new PlainTextLego('../examples/.htaccess');
p.run({
    ghwp: '../examples/ghwp.htaccess',
    replaceme: '../examples/replaceme.htaccess',
}).then(console.log);
