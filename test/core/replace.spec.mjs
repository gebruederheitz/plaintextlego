import { describe, it } from 'vitest';

import * as chai from 'chai';
import chaiFiles, { file } from 'chai-files';
import { PlainTextLego } from '@gebruederheitz/plaintextlego';
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
    it('replaces the content of an owned block with its module', async () => {
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

    it('appends a module without an owned block', async () => {
        const p = new PlainTextLego(filePath('./fixtures/base'));
        const modules = {
            replacement: filePath('./fixtures/replacement'),
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
});
