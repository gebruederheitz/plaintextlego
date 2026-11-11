import { readFile, writeFile } from 'fs/promises';
import path from 'path';

import { Block } from './Block.mjs';

const DEFAULT_OWNER = 'ptl';

/**
 * "Block"  -- the text block inside a source or target file, string content
 *             sandwiched between "BEGIN" and "END" comments
 * "Module" -- the source files that are used to create or update blocks in
 *             a target.
 * "Owner"  -- the prefix that marks the blocks plaintextlego writes:
 *             `# BEGIN <owner>:<module name>`. A block is owned exactly when
 *             its name starts with `<owner>:`; all other blocks are foreign
 *             and never touched.
 *
 * @typedef {Record<string, string>} ModuleDefinition A flat mapping of module names to file paths
 * @typedef {{owner?: string, force?: boolean}} RunOptions
 *
 * @property {BufferEncoding} fileEncoding
 * @property {string} baseFileName
 */
export class PlainTextLego {
    /**
     * @param {string} filename The source file's path.
     * @param {BufferEncoding?} encoding The source file's encoding, default UTF-8.
     */
    constructor(filename, encoding = 'utf8') {
        this.baseFileName = filename;
        this.fileEncoding = encoding;
    }

    /**
     * Applies the modules to the source file: owned blocks with a module get
     * the module's content, modules without an owned block are appended,
     * and owned blocks without a module are removed.
     *
     * Rejects without writing anything if a module file cannot be read, or
     * if no module is given at all while the source holds owned blocks
     * (unless `force` is set).
     *
     * @public
     * @param {ModuleDefinition?} modules
     * @param {string|null} target Filename / path for the target to write to. Default null, which writes back to the source file.
     * @param {RunOptions?} options `owner`: block name prefix, default "ptl". `force`: remove all owned blocks even if no module is given.
     * @returns {Promise<string[]>} The module names (without the owner prefix) of the blocks that were removed.
     */
    async run(
        modules = {},
        target = null,
        { owner = DEFAULT_OWNER, force = false } = {}
    ) {
        this.validateOwner(owner);
        const prefix = `${owner}:`;

        const baseFileContent = await this.readFile(this.baseFileName);
        const blocks = this.parseBlocks(baseFileContent);
        const moduleContents = await this.parseModuleFiles(modules);

        const hasOwnedBlocks = blocks.some((block) =>
            block.getName().startsWith(prefix)
        );
        if (moduleContents.size === 0 && hasOwnedBlocks && !force) {
            throw this.createError(
                'PTL_NO_MODULES',
                `No modules given, but ${this.baseFileName} contains blocks owned by "${owner}". Refusing to remove them all; pass the force option to do so.`
            );
        }

        const { content, removed } = this.assemble(
            baseFileContent,
            blocks,
            moduleContents,
            prefix
        );
        await this.writeFile(target, content);

        return removed;
    }

    /**
     * @protected
     * @param {string} source The parsed file content.
     * @param {Block[]} blocks All blocks parsed from `source`, in order.
     * @param {Map<string, string>} moduleContents Module name => content.
     * @param {string} prefix `<owner>:`
     * @returns {{content: string, removed: string[]}}
     */
    assemble(source, blocks, moduleContents, prefix) {
        const removed = [];
        const written = new Set();
        let output = '';
        let cursor = 0;

        blocks.forEach((block) => {
            output += source.slice(cursor, block.getIndex());
            cursor = block.getIndex() + block.getOriginalBlock().length;

            const name = block.getName();
            if (!name.startsWith(prefix)) {
                output += block.getOriginalBlock();
                return;
            }

            const moduleName = name.slice(prefix.length);
            if (moduleContents.has(moduleName)) {
                output += this.renderBlock(
                    name,
                    moduleContents.get(moduleName)
                );
                written.add(moduleName);
                return;
            }

            // Remove the block with its line break and one preceding blank
            // line, which reverses what appending added.
            removed.push(moduleName);
            if (source[cursor] === '\n') {
                cursor += 1;
            }
            if (output.endsWith('\n\n')) {
                output = output.slice(0, -1);
            }
        });
        output += source.slice(cursor);

        moduleContents.forEach((content, moduleName) => {
            if (written.has(moduleName)) {
                return;
            }
            if (output.length) {
                if (!output.endsWith('\n')) {
                    output += '\n';
                }
                output += '\n';
            }
            output += this.renderBlock(prefix + moduleName, content) + '\n';
        });

        return { content: output, removed };
    }

    /**
     * Renders a block from `# BEGIN` to the end of the `# END` line, without
     * a trailing line break. Content is inserted verbatim, except that a line
     * break is added if it does not end with one, so `# END` always starts
     * its own line.
     *
     * @protected
     * @param {string} name
     * @param {string} content
     * @returns {string}
     */
    renderBlock(name, content) {
        const body =
            content && !content.endsWith('\n') ? `${content}\n` : content;
        return `# BEGIN ${name}\n${body}# END ${name}`;
    }

    /**
     * @protected
     * @returns {RegExp}
     */
    getBlockExtractor() {
        return /^# BEGIN ([^\n]*)\n(.*)^# END \1$/gms;
    }

    /**
     * Finds all blocks contained in the input string, in order.
     * @protected
     * @param {string} string The input to be parsed for block content.
     * @returns {Block[]}
     */
    parseBlocks(string) {
        return [...string.matchAll(this.getBlockExtractor())].map(
            (match) => new Block(match)
        );
    }

    /**
     * Reads all module files. Rejects if one cannot be read, because
     * skipping it would remove its block, or if one contains a block
     * delimiter line.
     *
     * @protected
     * @param {ModuleDefinition} modules
     * @returns {Promise<Map<string, string>>} Module name => content, in the order given.
     */
    async parseModuleFiles(modules = {}) {
        const contents = new Map();

        for (const [moduleName, fileName] of Object.entries(modules)) {
            if (!moduleName || moduleName.includes('\n')) {
                throw new TypeError(
                    `Invalid module name ${JSON.stringify(moduleName)}: it must be non-empty and fit on one line.`
                );
            }
            let content;
            try {
                content = await this.readFile(fileName);
            } catch (cause) {
                throw this.createError(
                    'PTL_MODULE_UNREADABLE',
                    `Cannot read module "${moduleName}" from ${fileName}.`,
                    cause
                );
            }
            this.validateModuleContent(moduleName, fileName, content);
            contents.set(moduleName, content);
        }

        return contents;
    }

    /**
     * Rejects content with a line that the parser would read as a block
     * delimiter on the next run. Such a line can end another block early,
     * deleting the foreign blocks in between, or hide this module's block so
     * it is appended again on every run.
     *
     * @protected
     * @param {string} moduleName
     * @param {string} fileName
     * @param {string} content
     */
    validateModuleContent(moduleName, fileName, content) {
        const index = content
            .split('\n')
            .findIndex((line) => /^# (BEGIN|END) /.test(line));
        if (index !== -1) {
            throw this.createError(
                'PTL_MODULE_INVALID',
                `Module "${moduleName}" in ${fileName} contains a block delimiter on line ${index + 1}. Lines starting with "# BEGIN " or "# END " would break the file on the next run.`
            );
        }
    }

    /**
     * @protected
     * @param {string} owner
     */
    validateOwner(owner) {
        if (typeof owner !== 'string' || !/^[^\s:]+$/.test(owner)) {
            throw new TypeError(
                `Invalid owner ${JSON.stringify(owner)}: it must be a non-empty string without whitespace or ":".`
            );
        }
    }

    /**
     * @protected
     * @param {string} code
     * @param {string} message
     * @param {unknown?} cause
     * @returns {Error & {code: string}}
     */
    createError(code, message, cause = undefined) {
        const error = new Error(message, cause ? { cause } : undefined);
        error.code = code;
        return error;
    }

    /**
     * @protected
     * @param {string} filename
     * @returns {Promise<string>}
     */
    async readFile(filename) {
        return await readFile(path.resolve(filename), this.fileEncoding);
    }

    /**
     * @protected
     * @param {string|null?} targetFileName
     * @param {string} data
     * @returns {Promise<void>}
     */
    async writeFile(targetFileName = null, data = '') {
        if (!targetFileName) {
            targetFileName = this.baseFileName;
        }
        await writeFile(path.resolve(targetFileName), data, this.fileEncoding);
    }
}
