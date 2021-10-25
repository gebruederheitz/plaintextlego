import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import _difference from 'lodash-es/difference.js';

import { Block } from './Block.mjs';

export class PlainTextLego {
    constructor(filename, encoding = 'utf8') {
        this.baseFileName = filename;
        this.fileEncoding = encoding;
    }

    applyUpdatedBlockContents(blocks = [], fileContent = '') {
        const blocksReplaced = [];

        let updatedFileContents = fileContent.replace(
            this.getBlockExtractor(),
            (match, blockName, blockContent) => {
                const originalBlock = this.getBlockByName(blocks, blockName);
                if (originalBlock && match !== originalBlock.getContent()) {
                    blocksReplaced.push(blockName);
                    return match.replace(
                        blockContent,
                        originalBlock.getContent()
                    );
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

    getBlockExtractor(blockName = '[^\\n]*') {
        return new RegExp(`^# BEGIN (${blockName})\\n(.*)^# END \\1$`, 'gms');
    }

    getBlockByName(blocks, name) {
        return blocks.find((el) => el.getName() === name);
    }

    parseBlocks(string) {
        let namedBlocks = [];
        let loopResults;

        const allBlocksRe = this.getBlockExtractor();
        // eslint-disable-next-line
        while ((loopResults = allBlocksRe.exec(string)) !== null) {
            namedBlocks.push(new Block(loopResults));
        }

        return namedBlocks;
    }

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
            } catch (e) {
                // noop
            }
        }

        return parsedModules;
    }

    async readFile(filename) {
        return await readFile(path.resolve(filename), this.fileEncoding);
    }

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

    updateBlockContents(blocks = [], updatedContents = []) {
        updatedContents.forEach((module) => {
            const block = this.getBlockByName(blocks, module.name);
            if (block) {
                block.setContent(module.content);
            } else {
                blocks.push(new Block(['', module.name, module.content]));
            }
        });
        return blocks;
    }

    async writeFile(targetFileName = null, data = '') {
        if (!targetFileName) {
            targetFileName = this.baseFileName;
        }
        await writeFile(path.resolve(targetFileName), data, this.fileEncoding);
    }
}
