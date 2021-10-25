export class Block {
    constructor(regexMatch) {
        this.name = regexMatch[1];
        this.content = regexMatch[2];
        this.originalBlock = regexMatch[0];
    }

    getName() {
        return this.name;
    }

    setName(newName) {
        this.name = newName;
    }

    getContent() {
        return this.content;
    }

    setContent(newContent) {
        this.content = newContent;
    }

    getOriginalBlock() {
        return this.originalBlock;
    }
}
