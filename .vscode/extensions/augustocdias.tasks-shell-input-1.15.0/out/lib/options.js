"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseBoolean = void 0;
const vscode = require("vscode");
function parseBoolean(value, defaultValue) {
    if (value === undefined) {
        return defaultValue;
    }
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'string') {
        if (value.toLowerCase() === 'true') {
            return true;
        }
        else if (value.toLowerCase() === 'false') {
            return false;
        }
    }
    vscode.window.showWarningMessage(`Cannot parse the boolean value: ${value}, use the default: ${defaultValue}`);
    return defaultValue;
}
exports.parseBoolean = parseBoolean;
//# sourceMappingURL=options.js.map