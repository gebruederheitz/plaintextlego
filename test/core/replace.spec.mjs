import chai, { expect } from 'chai';
import chaiFiles, { file } from 'chai-files';
import { PlainTextLego } from '../../src/index.mjs';
import path from 'path';
import { URL } from 'url'; // in Browser, the URL in native accessible on window

chai.use(chaiFiles);
const __dirname = decodeURIComponent(new URL('.', import.meta.url).pathname);

function filePath(relativePath) {
    return path.resolve(__dirname, relativePath);
}

describe('The plaintextlego module', () => {

    it('should replace an existing section in a file with a module', async () => {
        const p = new PlainTextLego(filePath('./fixtures/base'));
        const modules = {
            replacement: filePath('./fixtures/replacement'),
        };
        const target = filePath('./fixtures/result');


        await p.run(modules, target);
        expect(file(filePath('./fixtures/result'))).to.exist;
        expect(file(filePath('./fixtures/result'))).to.equal(
            file(filePath('./fixtures/expected.replace'))
        );
    });

    it('should append an new module to the file', async () => {
        const p = new PlainTextLego(filePath('./fixtures/base'));
        const modules = {
            appendage: filePath('./fixtures/appendage'),
        };
        const target = filePath('./fixtures/result');


        await p.run(modules, target);
        expect(file(filePath('./fixtures/result'))).to.exist;
        expect(file(filePath('./fixtures/result'))).to.equal(
            file(filePath('./fixtures/expected.append'))
        );
    });

    it('should ignore non-matching closing tags', async () => {
        const p = new PlainTextLego(filePath('./fixtures/base.non-matching-close'));
        const modules = {
            replacement: filePath('./fixtures/replacement'),
        };
        const target = filePath('./fixtures/result');


        await p.run(modules, target);
        expect(file(filePath('./fixtures/result'))).to.exist;
        expect(file(filePath('./fixtures/result'))).to.equal(
            file(filePath('./fixtures/expected.non-matching-close'))
        );
    });

});
