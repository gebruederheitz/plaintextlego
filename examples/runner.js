const { PlainTextLego } = require('../dist');

const p = new PlainTextLego('./examples/.htaccess');
const modules = {
    ghwp: './examples/ghwp.htaccess',
    replaceme: './examples/replaceme.htaccess',
};
const target = './examples/result';

p.run(modules, target).then(console.log);
