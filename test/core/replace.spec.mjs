import { describe, it } from 'vitest';

import * as chai from 'chai';
import chaiFiles, { file } from 'chai-files';
import { PlainTextLego } from '../../src/index.mjs';
import path from 'path';

chai.use(chaiFiles);
const { expect } = chai;

const __dirname = decodeURIComponent(new URL('.', import.meta.url).pathname);

/**
 * @param {string} relativePath
 * @returns {string}
 */
function filePath(relativePath) {
    return path.resolve(__dirname, relativePath);
}

describe('The plaintextlego module', () => {
    it('replaces an existing section in a file with a module', async () => {
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

    it('appends a new module to the file', async () => {
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

    it('ignores non-matching closing tags', async () => {
        const p = new PlainTextLego(
            filePath('./fixtures/base.non-matching-close')
        );
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

    it('preserves non-module blocks', async () => {
        const p = new PlainTextLego(filePath('./fixtures/base'));
        const modules = {
            replacement: filePath('./fixtures/replacement'),
            appendage: filePath('./fixtures/appendage'),
        };
        const target = filePath('./fixtures/result');

        await p.run(modules, target);

        expect(file(filePath('./fixtures/result'))).to.exist;
        expect(file(filePath('./fixtures/result'))).to.equal(
            file(filePath('./fixtures/expected.preserved'))
        );
    });

    it('deletes a block when the module is empty', async () => {
        const p = new PlainTextLego(filePath('./fixtures/base.removal'));
        const modules = {
            removal: filePath('./fixtures/removal'),
        };
        const target = filePath('./fixtures/result');

        await p.run(modules, target);

        expect(file(filePath('./fixtures/result'))).to.exist;
        expect(file(filePath('./fixtures/result'))).to.equal(
            file(filePath('./fixtures/expected.removal'))
        );
    });
});
