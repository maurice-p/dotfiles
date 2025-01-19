"use strict";
// Copyright 2022 - 2023 The MathWorks, Inc.
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTextOnLine = exports.getRangeUntilLineEnd = void 0;
const vscode_languageserver_1 = require("vscode-languageserver");
/**
 * Gets a Range within a text document from the given line/column position to
 * the end of the provided line.
 *
 * @param doc The text document
 * @param line The line number
 * @param char The character number on the line
 * @returns A range
 */
function getRangeUntilLineEnd(doc, line, char) {
    const lineText = getTextOnLine(doc, line);
    const endChar = lineText.length;
    // Note: Range will throw when provided a negative character number,
    // so we do not need to explicitly capture that case ourselves
    if (char > endChar) {
        throw new Error(`Start character exceeds line length (${char} > ${endChar})`);
    }
    return vscode_languageserver_1.Range.create(line, char, line, lineText.length);
}
exports.getRangeUntilLineEnd = getRangeUntilLineEnd;
/**
 * Gets the text on the given line of the document.
 *
 * @param doc The text document
 * @param line The line number
 * @returns The text on the line
 */
function getTextOnLine(doc, line) {
    const textLines = doc.getText().split('\n');
    if (line < 0 || line >= textLines.length) {
        throw new Error('Cannot get text for nonexistent line');
    }
    return textLines[line];
}
exports.getTextOnLine = getTextOnLine;
//# sourceMappingURL=TextDocumentUtils.js.map