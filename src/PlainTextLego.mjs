import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import _difference from 'lodash-es/difference.js';
import _trim from 'lodash-es/trim.js';

import { Block } from './Block.mjs';

/**
 * "Block"  -- the text block inside a source or target file, string content
 *             sandwiched between "BEGIN" and "END" comments
 * "Module" -- the source files that are used to create or update blocks in
 *             a target.
 *
 * @typedef {Record<string, string>} ModuleDefinition A flat mapping of module names to file paths
 * @typedef {{name: string, content: string}} ParsedModule
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
     * @public
     * @param {ModuleDefinition?} modules
     * @param {string|null} target Filename / path for the target to write to. Default null, which writes back to the source file.
     * @returns {Promise<void>}
     */
    async run(modules = {}, target = null) {
        const baseFileContent = await this.readFile(this.baseFileName);
        let blocks = this.parseBlocks(baseFileContent);
        const mappedModuleContents = await this.parseModuleFiles(modules);
        blocks = this.updateBlockContents(blocks, mappedModuleContents);
        const updatedBaseFileContent = this.applyUpdatedBlockContents(
            blocks,
            baseFileContent
        );
        await this.writeFile(target, updatedBaseFileContent);
    }

    /**
     * @protected
     * @param {?Block[]} blocks
     * @param {?string} fileContent
     * @returns {string}
     */
    applyUpdatedBlockContents(blocks = [], fileContent = '') {
        const blocksReplaced = [];

        let updatedFileContents = fileContent.replace(
            this.getBlockExtractor(),
            (match, blockName, blockContent) => {
                const originalBlock = this.getBlockByName(blocks, blockName);
                if (originalBlock && match !== originalBlock.getContent()) {
                    const newContent = originalBlock.getContent();
                    blocksReplaced.push(blockName);

                    if (newContent === null) {
                        return '';
                    } else {
                        return match.replace(
                            blockContent,
                            originalBlock.getContent()
                        );
                    }
                } else {
                    return match;
                }
            }
        );

        const blocksToInsert = _difference(
            blocks.map((el) => el.getName()),
            blocksReplaced
        );

        blocksToInsert.forEach((blockName) => {
            updatedFileContents += `\n# BEGIN ${blockName}\n\n`;
            updatedFileContents += this.getBlockByName(
                blocks,
                blockName
            ).getContent();
            updatedFileContents += `\n\n# END ${blockName}\n`;
        });

        return updatedFileContents;
    }

    /**
     * @protected
     *
     * @param {string} blockName
     * @returns {RegExp}
     */
    getBlockExtractor(blockName = '[^\\n]*') {
        return new RegExp(`^# BEGIN (${blockName})\\n(.*)^# END \\1$`, 'gms');
    }

    /**
     * @protected
     *
     * @param {Block[]} blocks
     * @param {string} name
     * @returns {Block|undefined}
     */
    getBlockByName(blocks, name) {
        return blocks.find((el) => el.getName() === name);
    }

    /**
     * Finds all module blocks contained in the input string and extracts their
     * names. Returns an array of Block objects.
     * @protected
     * @param {string} string The input to be parsed for block content.
     * @returns {Block[]}
     */
    parseBlocks(string) {
        let namedBlocks = [];
        let loopResults;

        const allBlocksRe = this.getBlockExtractor();
        while ((loopResults = allBlocksRe.exec(string)) !== null) {
            namedBlocks.push(new Block(loopResults));
        }

        return namedBlocks;
    }

    /**
     * @protected
     * @param {ModuleDefinition} modules
     * @returns {Promise<ParsedModule[]>}
     */
    async parseModuleFiles(modules = {}) {
        const parsedModules = [];

        for (let moduleName in modules) {
            try {
                const fileName = modules[moduleName];
                const fileContent = await this.readFile(fileName);
                parsedModules.push({
                    name: moduleName,
                    content: fileContent,
                });
            } catch {
                // noop
            }
        }

        return parsedModules;
    }

    /**
     * @protected
     * @param {string} filename
     * @returns {Promise<string>}
     */
    async readFile(filename) {
        return await readFile(path.resolve(filename), this.fileEncoding);
    }

    updateBlockContents(blocks = [], updatedContents = []) {
        updatedContents.forEach((module) => {
            const block = this.getBlockByName(blocks, module.name);
            if (block) {
                if (!_trim(module.content).length) {
                    // empty module input, remove this section from output
                    block.setContent(null);
                } else {
                    block.setContent(module.content);
                }
            } else {
                blocks.push(new Block(['', module.name, module.content]));
            }
        });
        return blocks;
    }

    /**
     * @protected
     * @param {string|null?} targetFileName
     * @param {?string|Iterable<string>|Stream} data
     * @returns {Promise<void>}
     */
    async writeFile(targetFileName = null, data = '') {
        if (!targetFileName) {
            targetFileName = this.baseFileName;
        }
        await writeFile(path.resolve(targetFileName), data, this.fileEncoding);
    }
}
