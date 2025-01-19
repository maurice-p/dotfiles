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
const path = require("path");
const vitest_1 = require("vitest");
const VariableResolver_1 = require("./VariableResolver");
const UserInputContext_1 = require("./UserInputContext");
const mockVscode = require("../mocks/vscode");
(0, vitest_1.test)('variable types', () => __awaiter(void 0, void 0, void 0, function* () {
    const workspaceFolder = path.join(__dirname, "../test/testData/variableResolver");
    const tasksJson = yield Promise.resolve(`${path.join(workspaceFolder, ".vscode/tasks.json")}`).then(s => require(s));
    const filePath = `${workspaceFolder}/.vscode/tasks.json`;
    mockVscode.setMockData((yield Promise.resolve(`${path.join(workspaceFolder, "mockData.ts")}`).then(s => require(s))).default);
    const input = Object.assign(Object.assign({}, tasksJson.inputs[0]), { workspaceIndex: 0 });
    const rememberedValue = "Back in my day";
    const userInputContext = new UserInputContext_1.UserInputContext();
    const context = {};
    const resolver = new VariableResolver_1.VariableResolver(input, userInputContext, context, rememberedValue);
    for (const [key, value] of Object.entries({
        "workspaceFolder": workspaceFolder,
        "workspaceFolderBasename": "vscode-shell-command",
        "fileBasenameNoExtension": "tasks",
        "fileBasename": "tasks.json",
        "file": filePath,
        "lineNumber": "42",
        "extension": ".json",
        "fileDirName": `${workspaceFolder}/.vscode`,
        "rememberedValue": rememberedValue,
        "invalid": "",
    })) {
        (0, vitest_1.expect)(yield resolver.resolve("prefix ${" + key + "} suffix"))
            .toBe(`prefix ${value} suffix`);
    }
}));
//# sourceMappingURL=VariableResolver.test.js.map