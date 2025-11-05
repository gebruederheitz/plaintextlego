/**
 * @property {string|null} content
 */
export class Block {
    /**
     * @param {RegExpMatchArray|string[]} regexMatch
     */
    constructor(regexMatch) {
        this.name = regexMatch[1];
        this.content = regexMatch[2];
        this.originalBlock = regexMatch[0];
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
     * @returns {string}
     */
    getOriginalBlock() {
        return this.originalBlock;
    }
}
