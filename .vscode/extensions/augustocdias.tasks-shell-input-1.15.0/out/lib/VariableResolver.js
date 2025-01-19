"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VariableResolver = void 0;
const vscode = require("vscode");
const path = require("path");
const querystring = require("querystring");
const options_1 = require("./options");
function zip(a, b) {
    return a.map(function (e, i) {
        return [e, b[i]];
    });
}
function resolvePromptOptions(queryString) {
    const parsed = querystring.decode(queryString);
    return {
        prompt: (typeof parsed.prompt === "string") ? parsed.prompt : undefined,
        rememberPrevious: (0, options_1.parseBoolean)(parsed.rememberPrevious, true),
    };
}
class VariableResolver {
    constructor(input, userInputContext, context, rememberedValue) {
        this.expressionRegex = /\$\{(.*?)\}/gm;
        this.workspaceIndexedRegex = /workspaceFolder\[(\d+)\]/gm;
        this.workspaceNamedRegex = /workspaceFolder:([^}]+)/gm;
        this.configVarRegex = /config:(.+)/m;
        this.envVarRegex = /env:(.+)/m;
        this.inputVarRegex = /input:(.+)/m;
        this.taskIdVarRegex = /taskId:(.+)/m;
        this.commandVarRegex = /command:(.+)/m;
        this.promptVarRegex = /prompt(?::(.*)|)/m;
        this.userInputContext = userInputContext;
        this.rememberedValue = rememberedValue;
        this.input = input;
        this.context = context;
    }
    resolve(str) {
        return __awaiter(this, void 0, void 0, function* () {
            // Sort by index (descending)
            // The indices will change once we start substituting the replacements,
            // which are not necessarily the same length
            const matches = [...str.matchAll(this.expressionRegex)]
                .sort((a, b) => b.index - a.index);
            // Process the synchronous string interpolations
            const data = yield Promise.all(matches.map((match) => {
                var _a, _b;
                const value = match[1];
                if (this.workspaceIndexedRegex.test(value)) {
                    return this.bindIndexedFolder(value);
                }
                if (this.workspaceNamedRegex.test(value)) {
                    return this.bindNamedFolder(value);
                }
                if (this.configVarRegex.test(value)) {
                    return this.bindWorkspaceConfigVariable(value);
                }
                if (this.envVarRegex.test(value)) {
                    return this.bindEnvVariable(value);
                }
                const inputVar = this.inputVarRegex.exec(value);
                if (inputVar) {
                    return (_a = this.userInputContext
                        .lookupInputValueByInputId(inputVar[1])) !== null && _a !== void 0 ? _a : '';
                }
                const taskIdVar = this.taskIdVarRegex.exec(value);
                if (taskIdVar) {
                    return (_b = this.userInputContext
                        .lookupInputValueByTaskId(taskIdVar[1])) !== null && _b !== void 0 ? _b : '';
                }
                if (this.commandVarRegex.test(value)) {
                    return this.bindCommandVariable(value);
                }
                const promptVar = this.promptVarRegex.exec(value);
                if (promptVar) {
                    return this.bindPrompt(resolvePromptOptions(promptVar[1]), match);
                }
                return this.bindConfiguration(value);
            }));
            const result = zip(matches, data).reduce((str, [match, replacement]) => {
                return str.slice(0, match.index) + replacement +
                    str.slice(match.index + match[0].length);
            }, str);
            return result;
        });
    }
    bindCommandVariable(value) {
        return __awaiter(this, void 0, void 0, function* () {
            const match = this.commandVarRegex.exec(value);
            if (!match) {
                return '';
            }
            const command = match[1];
            const result = yield vscode.commands.executeCommand(command, { workspaceFolder: this.bindConfiguration("workspaceFolder") });
            return result;
        });
    }
    bindPrompt(promptOptions, match) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const taskId = (_a = this.input.args.taskId) !== null && _a !== void 0 ? _a : this.input.id;
            const promptId = `prompt/${taskId}_${match.index}`;
            const prevValue = this.context.workspaceState.get(promptId, '');
            const initialValue = promptOptions.rememberPrevious ? prevValue : '';
            const result = (_b = (yield vscode.window.showInputBox({
                value: initialValue,
                prompt: promptOptions.prompt,
            }))) !== null && _b !== void 0 ? _b : '';
            this.context.workspaceState.update(promptId, result);
            return result;
        });
    }
    bindIndexedFolder(value) {
        return value.replace(this.workspaceIndexedRegex, (_, index) => {
            var _a, _b, _c;
            const idx = Number.parseInt(index);
            return (_c = (_b = (_a = vscode.workspace.workspaceFolders) === null || _a === void 0 ? void 0 : _a[idx]) === null || _b === void 0 ? void 0 : _b.uri.fsPath) !== null && _c !== void 0 ? _c : '';
        });
    }
    bindNamedFolder(value) {
        return value.replace(this.workspaceNamedRegex, (_, name) => {
            var _a;
            for (const folder of (_a = vscode.workspace.workspaceFolders) !== null && _a !== void 0 ? _a : []) {
                if (folder.name == name) {
                    return folder.uri.fsPath;
                }
            }
            return '';
        });
    }
    bindConfiguration(value) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s;
        switch (value) {
            case 'workspaceFolder':
                return (_b = (_a = vscode.workspace.workspaceFolders) === null || _a === void 0 ? void 0 : _a[this.input.workspaceIndex].uri.fsPath) !== null && _b !== void 0 ? _b : '';
            case 'workspaceFolderBasename':
                return (_d = (_c = vscode.workspace.workspaceFolders) === null || _c === void 0 ? void 0 : _c[this.input.workspaceIndex].name) !== null && _d !== void 0 ? _d : '';
            case 'fileBasenameNoExtension':
                return path.parse((_f = (_e = vscode.window.activeTextEditor) === null || _e === void 0 ? void 0 : _e.document.fileName) !== null && _f !== void 0 ? _f : '').name;
            case 'fileBasename':
                return path.parse((_h = (_g = vscode.window.activeTextEditor) === null || _g === void 0 ? void 0 : _g.document.fileName) !== null && _h !== void 0 ? _h : '').base;
            case 'file':
                return (_k = (_j = vscode.window.activeTextEditor) === null || _j === void 0 ? void 0 : _j.document.fileName) !== null && _k !== void 0 ? _k : '';
            case 'lineNumber':
                return (_m = (_l = vscode.window.activeTextEditor) === null || _l === void 0 ? void 0 : _l.selection.active.line.toString()) !== null && _m !== void 0 ? _m : '';
            case 'extension':
                if (vscode.window.activeTextEditor !== null) {
                    const filePath = path.parse((_p = (_o = vscode.window.activeTextEditor) === null || _o === void 0 ? void 0 : _o.document.fileName) !== null && _p !== void 0 ? _p : '');
                    return filePath.ext;
                }
                return '';
            case 'fileDirName':
                return (vscode.window.activeTextEditor !== null)
                    ? path.dirname((_r = (_q = vscode.window.activeTextEditor) === null || _q === void 0 ? void 0 : _q.document.uri.fsPath) !== null && _r !== void 0 ? _r : '')
                    : '';
            case 'rememberedValue':
                return (_s = this.rememberedValue) !== null && _s !== void 0 ? _s : '';
        }
        return '';
    }
    bindWorkspaceConfigVariable(value) {
        var _a, _b, _c;
        const matchResult = this.configVarRegex.exec(value);
        if (!matchResult) {
            return '';
        }
        // Get value from workspace configuration "settings" dictionary
        const workspaceResult = vscode.workspace.getConfiguration().get(matchResult[1], '');
        if (workspaceResult) {
            return workspaceResult;
        }
        const activeFolderResult = vscode.workspace.getConfiguration("", (_a = vscode.window.activeTextEditor) === null || _a === void 0 ? void 0 : _a.document.uri).get(matchResult[1], '');
        if (activeFolderResult) {
            return activeFolderResult;
        }
        for (const w of (_b = vscode.workspace.workspaceFolders) !== null && _b !== void 0 ? _b : []) {
            const currentFolderResult = vscode.workspace.getConfiguration("", w.uri).get((_c = matchResult[1]) !== null && _c !== void 0 ? _c : '', '');
            if (currentFolderResult) {
                return currentFolderResult;
            }
        }
        return "";
    }
    bindEnvVariable(value) {
        var _a, _b;
        const result = this.envVarRegex.exec(value);
        if (!result) {
            return '';
        }
        const key = result[1];
        const configuredEnv = this.input.env;
        return (_b = (_a = configuredEnv[key]) !== null && _a !== void 0 ? _a : process.env[key]) !== null && _b !== void 0 ? _b : '';
    }
}
exports.VariableResolver = VariableResolver;
//# sourceMappingURL=VariableResolver.js.map