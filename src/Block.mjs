/**
 * A block parsed from a file: the text between a `# BEGIN <name>` and the
 * matching `# END <name>` line.
 */
export class Block {
    /**
     * @param {RegExpMatchArray|RegExpExecArray} regexMatch A match of the
     *        block extractor: [0] the whole block, [1] its name, [2] its
     *        content, `index` its position in the parsed string.
     */
    constructor(regexMatch) {
        this.name = regexMatch[1];
        this.content = regexMatch[2];
        this.originalBlock = regexMatch[0];
        this.index = regexMatch.index ?? null;
    }

    /**
     * @returns {string}
     */
    getName() {
        return this.name;
    }

    /**
     * @param {string} newName
     */
    setName(newName) {
        this.name = newName;
    }

    /**
     * @returns {string}
     */
    getContent() {
        return this.content;
    }

    /**
     * @param {string|null} newContent
     */
    setContent(newContent) {
        this.content = newContent;
    }

    /**
     * The whole block as it was parsed, from `# BEGIN` to the end of the
     * `# END` line (without its line break).
     * @returns {string}
     */
    getOriginalBlock() {
        return this.originalBlock;
    }

    /**
     * Position of the block in the string it was parsed from.
     * @returns {number|null}
     */
    getIndex() {
        return this.index;
    }
}
