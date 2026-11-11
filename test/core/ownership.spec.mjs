import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { PlainTextLego } from '@gebruederheitz/plaintextlego';

let dir;

beforeEach(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), 'plaintextlego-'));
});

afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
});

/**
 * Writes the given module contents to files and returns the module
 * definition for `run()`.
 * @param {Record<string, string>} contents Module name => content.
 * @returns {Promise<Record<string, string>>}
 */
async function modules(contents) {
    const definition = {};
    for (const [name, content] of Object.entries(contents)) {
        const file = path.join(dir, `module-${name}`);
        await writeFile(file, content);
        definition[name] = file;
    }
    return definition;
}

/**
 * Creates the base file and returns a function that runs plaintextlego on it
 * in place, like htmodules does, and resolves with the resulting content.
 * @param {string} content
 */
async function base(content) {
    const file = path.join(dir, 'base');
    await writeFile(file, content);

    return {
        file,
        read: () => readFile(file, 'utf8'),
        /**
         * @param {Record<string, string>} contents
         * @param {object} [options]
         */
        run: async (contents, options) => {
            const removed = await new PlainTextLego(file).run(
                await modules(contents),
                null,
                options
            );
            return { content: await readFile(file, 'utf8'), removed };
        },
    };
}

describe('Block ownership', () => {
    it('removes an owned block whose module is gone, with the blank line before it', async () => {
        const b = await base(
            'a\n\n# BEGIN ptl:gone\nold\n# END ptl:gone\n\nb\n'
        );

        const { content, removed } = await b.run({ kept: 'new\n' });

        expect(content).toBe(
            'a\n\nb\n\n# BEGIN ptl:kept\nnew\n# END ptl:kept\n'
        );
        expect(removed).toEqual(['gone']);
    });

    it('restores the original file when an appended block is removed again', async () => {
        const original = 'top\n\n# BEGIN WordPress\nwp\n# END WordPress\n';
        const b = await base(original);

        const appended = await b.run({ x: 'content\n' });
        expect(appended.content).toBe(
            original + '\n# BEGIN ptl:x\ncontent\n# END ptl:x\n'
        );

        const { content, removed } = await b.run({}, { force: true });
        expect(content).toBe(original);
        expect(removed).toEqual(['x']);
    });

    it('produces identical output on consecutive runs', async () => {
        const b = await base('top\n\n# BEGIN ptl:a\nold\n# END ptl:a\n');
        const contents = { a: 'replaced\n', b: 'appended\n', c: '' };

        const first = await b.run(contents);
        const second = await b.run(contents);

        expect(second.content).toBe(first.content);
        expect(second.removed).toEqual([]);
    });

    it('never touches foreign blocks, even one named like a module', async () => {
        const original =
            '# BEGIN WordPress\nwp\n# END WordPress\n\n# BEGIN x\nmine\n# END x\n';
        const b = await base(original);

        const { content, removed } = await b.run({ x: 'module\n' });

        expect(content).toBe(
            original + '\n# BEGIN ptl:x\nmodule\n# END ptl:x\n'
        );
        expect(removed).toEqual([]);
    });

    it('uses a custom owner and treats other owners as foreign', async () => {
        const original = '# BEGIN ptl:x\nother\n# END ptl:x\n';
        const b = await base(original);

        const { content, removed } = await b.run(
            { x: 'mine\n' },
            { owner: 'htmodules' }
        );

        expect(content).toBe(
            original + '\n# BEGIN htmodules:x\nmine\n# END htmodules:x\n'
        );
        expect(removed).toEqual([]);
    });

    it.each(['', 'a:b', 'a b', 'a\nb', 42])(
        'rejects the invalid owner %j',
        async (owner) => {
            const b = await base('top\n');

            await expect(b.run({ x: 'y\n' }, { owner })).rejects.toThrow(
                TypeError
            );
            expect(await b.read()).toBe('top\n');
        }
    );
});

describe('Module content', () => {
    it('writes an empty module as an empty block', async () => {
        const b = await base('top\n\n# BEGIN ptl:x\nold\n# END ptl:x\n');

        const { content } = await b.run({ x: '' });

        expect(content).toBe('top\n\n# BEGIN ptl:x\n# END ptl:x\n');
    });

    it('adds a missing final line break, so # END keeps its own line', async () => {
        const b = await base('top\n');

        const { content } = await b.run({ x: 'no line break' });

        expect(content).toBe(
            'top\n\n# BEGIN ptl:x\nno line break\n# END ptl:x\n'
        );
    });

    it('inserts content verbatim, including $ patterns, into an empty block', async () => {
        const rule = "RewriteRule ^(.*)$ /$1 [L]\n$$ $& $` $'\n";
        const b = await base('# BEGIN ptl:x\n# END ptl:x\n');

        const { content } = await b.run({ x: rule });

        expect(content).toBe(`# BEGIN ptl:x\n${rule}# END ptl:x\n`);
    });
});

describe('Failure paths', () => {
    it('refuses to remove all owned blocks when no module is given', async () => {
        const original = 'top\n\n# BEGIN ptl:x\nold\n# END ptl:x\n';
        const b = await base(original);

        await expect(b.run({})).rejects.toMatchObject({
            code: 'PTL_NO_MODULES',
        });
        expect(await b.read()).toBe(original);
    });

    it('removes all owned blocks without modules when forced', async () => {
        const b = await base('top\n\n# BEGIN ptl:x\nold\n# END ptl:x\n');

        const { content, removed } = await b.run({}, { force: true });

        expect(content).toBe('top\n');
        expect(removed).toEqual(['x']);
    });

    it('accepts no modules when the file holds no owned blocks', async () => {
        const original = '# BEGIN WordPress\nwp\n# END WordPress\n';
        const b = await base(original);

        const { content, removed } = await b.run({});

        expect(content).toBe(original);
        expect(removed).toEqual([]);
    });

    it('rejects an unreadable module file without writing anything', async () => {
        const original = 'top\n\n# BEGIN ptl:x\nold\n# END ptl:x\n';
        const b = await base(original);

        await expect(
            new PlainTextLego(b.file).run({
                x: path.join(dir, 'does-not-exist'),
            })
        ).rejects.toMatchObject({ code: 'PTL_MODULE_UNREADABLE' });
        expect(await b.read()).toBe(original);
    });

    it.each([
        ['an owned END line', 'doc\n# END ptl:a\nrule\n', 2],
        ['a foreign END line', '# END WordPress\n', 1],
        ['a BEGIN line', 'one\ntwo\n# BEGIN WordPress\n', 3],
        ['a CRLF END line', 'doc\r\n# END WordPress\r\n', 2],
    ])(
        'rejects a module with %s without writing anything',
        async (_, moduleContent, line) => {
            const original =
                '# BEGIN ptl:a\nA\n# END ptl:a\n\n# BEGIN WordPress\nwp\n# END WordPress\n';
            const b = await base(original);

            await expect(
                b.run({ a: 'A\n', b: moduleContent })
            ).rejects.toMatchObject({
                code: 'PTL_MODULE_INVALID',
                message: expect.stringContaining(`line ${line}`),
            });
            expect(await b.read()).toBe(original);
        }
    );

    it('accepts lines that only resemble block delimiters', async () => {
        const lookalikes =
            '  # END ptl:a\n#END ptl:a\n# ENDING\n# BEGINNING\n# END\nfoo # BEGIN x\n';
        const b = await base('# BEGIN ptl:a\nA\n# END ptl:a\n');

        const first = await b.run({ a: lookalikes });
        const second = await b.run({ a: lookalikes });

        expect(first.content).toBe(`# BEGIN ptl:a\n${lookalikes}# END ptl:a\n`);
        expect(second.content).toBe(first.content);
    });
});
