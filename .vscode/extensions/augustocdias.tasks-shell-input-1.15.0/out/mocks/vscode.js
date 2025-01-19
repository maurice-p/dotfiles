"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setMockData = exports.workspace = exports.window = exports.Spy = void 0;
const vscode = require("vscode");
// This is a mock of vscode, which uses namespaces.
/* eslint-disable @typescript-eslint/no-namespace */
// Usage as a spy:
// 1. Replace `import * as vscode from "vscode"` with
// `import * as vscode from "../mocks/vscode"` in the productive code
// 2. Call `vscode.Spy.write()` somewhere
// 3. Run the extension with debugging
// 4. Copy the printed mock data
// Whether to behave like a spy (listen to the return values from real vscode module)
// or a mock (return back saved data).
let mode = "spy";
var Spy;
(function (Spy) {
    let spyCalls = {};
    function write() {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        console.log(JSON.stringify({
            staticData: {
                "workspace.workspaceFolders": vscode.workspace.workspaceFolders || [],
                "window.activeTextEditor.document.fileName": (_b = (_a = vscode.window.activeTextEditor) === null || _a === void 0 ? void 0 : _a.document) === null || _b === void 0 ? void 0 : _b.fileName,
                "window.activeTextEditor.document.uri.fsPath": (_e = (_d = (_c = vscode.window.activeTextEditor) === null || _c === void 0 ? void 0 : _c.document) === null || _d === void 0 ? void 0 : _d.uri) === null || _e === void 0 ? void 0 : _e.fsPath,
                "window.activeTextEditor.selection.active.line": (_h = (_g = (_f = vscode.window.activeTextEditor) === null || _f === void 0 ? void 0 : _f.selection) === null || _g === void 0 ? void 0 : _g.active) === null || _h === void 0 ? void 0 : _h.line,
            },
            calls: spyCalls,
        }));
    }
    Spy.write = write;
    function load(calls) {
        spyCalls = calls;
    }
    Spy.load = load;
    function saveCall(funcName, args, result) {
        const argsString = JSON.stringify(args);
        if (!(funcName in spyCalls)) {
            spyCalls[funcName] = {};
        }
        if (!(argsString in spyCalls[funcName])) {
            spyCalls[funcName][argsString] = {};
        }
        spyCalls[funcName][argsString] = result;
    }
    Spy.saveCall = saveCall;
    function getCall(funcName, args) {
        var _a;
        return (_a = spyCalls === null || spyCalls === void 0 ? void 0 : spyCalls[funcName]) === null || _a === void 0 ? void 0 : _a[JSON.stringify(args)];
    }
    Spy.getCall = getCall;
})(Spy || (exports.Spy = Spy = {}));
// This mock does not need to be saved
const showWarningMessageCalls = [];
var window;
(function (window) {
    let activeTextEditor;
    (function (activeTextEditor) {
        let document;
        (function (document) {
            // Here and below: these ARE redefined by setMockData
            // eslint-disable-next-line prefer-const
            document.fileName = undefined;
            let uri;
            (function (uri) {
                // eslint-disable-next-line prefer-const
                uri.fsPath = undefined;
            })(uri = document.uri || (document.uri = {}));
        })(document = activeTextEditor.document || (activeTextEditor.document = {}));
        let selection;
        (function (selection) {
            let active;
            (function (active) {
                // eslint-disable-next-line prefer-const
                active.line = undefined;
            })(active = selection.active || (selection.active = {}));
        })(selection = activeTextEditor.selection || (activeTextEditor.selection = {}));
    })(activeTextEditor = window.activeTextEditor || (window.activeTextEditor = {}));
    function showWarningMessage(message) {
        showWarningMessageCalls.push(message);
    }
    window.showWarningMessage = showWarningMessage;
    function getShowWarningMessageCalls() {
        return showWarningMessageCalls;
    }
    window.getShowWarningMessageCalls = getShowWarningMessageCalls;
    function resetShowWarningMessageCalls() {
        showWarningMessageCalls.length = 0;
    }
    window.resetShowWarningMessageCalls = resetShowWarningMessageCalls;
})(window || (exports.window = window = {}));
var workspace;
(function (workspace) {
    workspace.workspaceFolders = [];
    function getConfiguration(section, resource) {
        const funcName = "workspace.getConfiguration().inspect()";
        const path = resource === null || resource === void 0 ? void 0 : resource.path;
        if (mode == "mock") {
            return {
                inspect(key) {
                    return Spy.getCall(funcName, [section, path, key]);
                }
            };
        }
        else {
            const result = vscode.workspace.getConfiguration(section, resource);
            const originalInspect = result.inspect;
            return Object.assign(Object.assign({}, result), { inspect: function (key) {
                    const inspectResult = originalInspect(key);
                    Spy.saveCall(funcName, [section, path, key], inspectResult);
                    return inspectResult;
                } });
        }
    }
    workspace.getConfiguration = getConfiguration;
})(workspace || (exports.workspace = workspace = {}));
// Set the workspace folder data without creating a new array. The
// namespaced variable needs to keep its reference to the array.
function updateArray(dest, src) {
    dest.length = 0;
    dest.push(...src);
}
function setMockData(data) {
    mode = "mock";
    Spy.load(data.calls);
    const staticData = data.staticData;
    updateArray(workspace.workspaceFolders, staticData["workspace.workspaceFolders"]);
    window.activeTextEditor.document.fileName = staticData["window.activeTextEditor.document.fileName"];
    window.activeTextEditor.document.uri.fsPath = staticData["window.activeTextEditor.document.uri.fsPath"];
    window.activeTextEditor.selection.active.line = staticData["window.activeTextEditor.selection.active.line"];
}
exports.setMockData = setMockData;
//# sourceMappingURL=vscode.js.map