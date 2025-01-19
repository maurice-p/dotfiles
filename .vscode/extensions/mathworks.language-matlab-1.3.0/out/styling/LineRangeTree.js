"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * A node used in the LineRangeTree.
 * @class TreeNode
 */
class TreeNode {
    constructor(range) {
        this.range = range;
        this.children = [];
        this.parent = undefined;
    }
    add(treeNode) {
        this.children.push(treeNode);
        treeNode.parent = this;
    }
    getStartLine() {
        if (this.range !== undefined) {
            return this.range.start.line;
        }
        return 0;
    }
    getEndLine() {
        if (this.range !== undefined) {
            return this.range.end.line;
        }
        return Infinity;
    }
}
class LineRangeTree {
    constructor(sectonRanges) {
        this._set(sectonRanges);
    }
    /**
     * Creates a tree from the given section ranges array based on the start and end lines.
     */
    _set(sectonRanges) {
        this._root = new TreeNode(undefined);
        const objectLength = sectonRanges.length;
        let currentNode;
        currentNode = this._root;
        for (let i = 0; i < objectLength; i++) {
            const sectionRange = new TreeNode(sectonRanges[i]);
            while (currentNode != null) {
                if (sectionRange.getStartLine() >= currentNode.getStartLine() &&
                    sectionRange.getEndLine() <= currentNode.getEndLine()) {
                    currentNode.add(sectionRange);
                    currentNode = sectionRange;
                    break;
                }
                else {
                    currentNode = currentNode.parent;
                }
            }
        }
    }
    /**
     * Finds the object with smallest range (dfs) containing the given line number
     * @param line number
     * @returns Section Range
     */
    find(line) {
        let currentNode;
        currentNode = this._root;
        let lastNode = currentNode;
        while (currentNode != null) {
            currentNode = this._searchByLine(line, currentNode);
            lastNode = currentNode !== null && currentNode !== void 0 ? currentNode : lastNode;
        }
        return (lastNode != null) ? lastNode.range : undefined;
    }
    _searchByLine(line, parentNode) {
        var _a;
        const length = parentNode.children.length;
        if (length === 0) {
            return undefined;
        }
        let result;
        let start = 0;
        let end = length - 1;
        while (start <= end) {
            const mid = Math.floor((start + end) / 2);
            const midNode = parentNode.children[mid];
            const midNodeStartLine = (_a = midNode.getStartLine()) !== null && _a !== void 0 ? _a : 0;
            if (line >= midNodeStartLine &&
                line <= midNode.getEndLine()) {
                result = midNode;
                break;
            }
            else if (line < midNodeStartLine) {
                end = mid - 1;
            }
            else {
                start = mid + 1;
            }
        }
        return result;
    }
}
exports.default = LineRangeTree;
//# sourceMappingURL=LineRangeTree.js.map