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
const child_process = require("child_process");
const path = require("path");
const vitest_1 = require("vitest");
const CommandHandler_1 = require("./CommandHandler");
const UserInputContext_1 = require("./UserInputContext");
const options_1 = require("./options");
const mockVscode = require("../mocks/vscode");
const mockExtensionContext = {
    workspace: {
        workspaceFolders: {},
    }
};
vitest_1.vi.mock("child_process", (importOriginal) => __awaiter(void 0, void 0, void 0, function* () {
    return (Object.assign({}, yield importOriginal()));
}));
const execSpy = vitest_1.vi.spyOn(child_process, 'exec');
const execFileSpy = vitest_1.vi.spyOn(child_process, 'execFile');
(0, vitest_1.beforeEach)(() => {
    execSpy.mockClear();
    execFileSpy.mockClear();
    mockVscode.window.resetShowWarningMessageCalls();
});
(0, vitest_1.describe)("Simple cases", () => __awaiter(void 0, void 0, void 0, function* () {
    const testDataPath = path.join(__dirname, "../test/testData/simple");
    const filePath = `${testDataPath}/.vscode/tasks.json`;
    const tasksJson = yield Promise.resolve(`${path.join(testDataPath, ".vscode/tasks.json")}`).then(s => require(s));
    const mockData = (yield Promise.resolve(`${path.join(testDataPath, "mockData.ts")}`).then(s => require(s))).default;
    (0, vitest_1.test)("README example", () => __awaiter(void 0, void 0, void 0, function* () {
        mockVscode.setMockData(mockData);
        const input = tasksJson.inputs[0].args;
        const handler = new CommandHandler_1.CommandHandler(Object.assign(Object.assign({}, input), { useFirstResult: true }), new UserInputContext_1.UserInputContext(), mockExtensionContext, child_process);
        yield handler.handle();
        (0, vitest_1.expect)(execFileSpy).toHaveBeenCalledTimes(0);
        (0, vitest_1.expect)(execSpy).toHaveBeenCalledTimes(1);
        (0, vitest_1.expect)(execSpy).toHaveBeenCalledWith(`cat ${filePath}`, {
            cwd: testDataPath,
            encoding: "utf8",
            env: {
                FILE: `${filePath}`,
                PROJECT: "vscode-shell-command",
                WORKSPACE: testDataPath,
            },
            maxBuffer: undefined,
        }, vitest_1.expect.anything());
    }));
    (0, vitest_1.test)("Command as array of strings", () => __awaiter(void 0, void 0, void 0, function* () {
        mockVscode.setMockData(mockData);
        const args = {
            command: ["cat", "${file}"],
            useFirstResult: true,
            taskId: "inputTest",
        };
        const handler = new CommandHandler_1.CommandHandler(args, new UserInputContext_1.UserInputContext(), mockExtensionContext, child_process);
        yield handler.handle();
        (0, vitest_1.expect)(execFileSpy).toHaveBeenCalledTimes(0);
        (0, vitest_1.expect)(execSpy).toHaveBeenCalledTimes(1);
        (0, vitest_1.expect)(execSpy).toHaveBeenCalledWith(`cat ${filePath}`, {
            cwd: testDataPath,
            encoding: "utf8",
            env: undefined,
            maxBuffer: undefined,
        }, vitest_1.expect.anything());
    }));
}));
(0, vitest_1.describe)("Multiple workspaces", () => __awaiter(void 0, void 0, void 0, function* () {
    const testDataPath = path.join(__dirname, "../test/testData/workspaceFolder");
    const tasksJsonA = yield Promise.resolve(`${path.join(testDataPath, "a/.vscode/tasks.json")}`).then(s => require(s));
    const tasksJsonB = yield Promise.resolve(`${path.join(testDataPath, "b/.vscode/tasks.json")}`).then(s => require(s));
    // Index inputs by taskId
    const inputs = Object.fromEntries([...tasksJsonA.inputs, ...tasksJsonB.inputs]
        .map((input) => [input.args.taskId, input]));
    for (const [taskId, expectedResult] of [
        ["a_workspaceFolder", `${testDataPath}/a`],
        ["a_indexedWorkspaceFolder0", `${testDataPath}/a`],
        ["a_indexedWorkspaceFolder1", `${testDataPath}/b`],
        ["a_namedWorkspaceFolderA", `${testDataPath}/a`],
        ["a_namedWorkspaceFolderB", `${testDataPath}/b`],
        ["b_workspaceFolder", `${testDataPath}/b`],
        ["b_indexedWorkspaceFolder0", `${testDataPath}/a`],
        ["b_indexedWorkspaceFolder1", `${testDataPath}/b`],
        ["b_namedWorkspaceFolderA", `${testDataPath}/a`],
        ["b_namedWorkspaceFolderB", `${testDataPath}/b`],
    ]) {
        (0, vitest_1.test)(`workspaceFolder ${taskId}`, () => __awaiter(void 0, void 0, void 0, function* () {
            mockVscode.setMockData((yield Promise.resolve(`${path.join(testDataPath, "mockData.ts")}`).then(s => require(s))).default);
            const input = inputs[taskId].args;
            const handler = new CommandHandler_1.CommandHandler(input, new UserInputContext_1.UserInputContext(), mockExtensionContext, child_process);
            yield handler.handle();
            (0, vitest_1.expect)(execFileSpy).toHaveBeenCalledTimes(0);
            (0, vitest_1.expect)(execSpy).toHaveBeenCalledTimes(1);
            (0, vitest_1.expect)(execSpy).toHaveBeenCalledWith(`echo ${expectedResult}`, {
                cwd: taskId.startsWith("a") ? `${testDataPath}/a` : `${testDataPath}/b`,
                encoding: "utf8",
                env: undefined,
                maxBuffer: undefined,
            }, vitest_1.expect.anything());
        }));
    }
}));
// Related to issue #79
(0, vitest_1.test)("Command variable interop", () => __awaiter(void 0, void 0, void 0, function* () {
    const testDataPath = path.join(__dirname, "../test/testData/commandvariable");
    const tasksJson = yield Promise.resolve(`${path.join(testDataPath, ".vscode/tasks.json")}`).then(s => require(s));
    const mockData = (yield Promise.resolve(`${path.join(testDataPath, "mockData.ts")}`).then(s => require(s))).default;
    mockVscode.setMockData(mockData);
    const input = tasksJson.inputs[0].args.command.bazelTargets.args;
    const handler = new CommandHandler_1.CommandHandler(input, new UserInputContext_1.UserInputContext(), mockExtensionContext, child_process);
    yield handler.handle();
    (0, vitest_1.expect)(execFileSpy).toHaveBeenCalledTimes(0);
    (0, vitest_1.expect)(execSpy).toHaveBeenCalledTimes(1);
    (0, vitest_1.expect)(execSpy).toHaveBeenCalledWith("echo 'ItWorked'", {
        cwd: testDataPath,
        encoding: "utf8",
        env: undefined,
        maxBuffer: undefined,
    }, vitest_1.expect.anything());
}));
(0, vitest_1.test)("commandArgs", () => __awaiter(void 0, void 0, void 0, function* () {
    const testDataPath = path.join(__dirname, "../test/testData/commandArgs");
    const filePath = `${testDataPath}/.vscode/tasks.json`;
    const tasksJson = yield Promise.resolve(`${path.join(testDataPath, ".vscode/tasks.json")}`).then(s => require(s));
    const mockData = (yield Promise.resolve(`${path.join(testDataPath, "mockData.ts")}`).then(s => require(s))).default;
    mockVscode.setMockData(mockData);
    const input = tasksJson.inputs[0].args;
    const handler = new CommandHandler_1.CommandHandler(input, new UserInputContext_1.UserInputContext(), mockExtensionContext, child_process);
    yield handler.handle();
    (0, vitest_1.expect)(execSpy).toHaveBeenCalledTimes(0);
    (0, vitest_1.expect)(execFileSpy).toHaveBeenCalledTimes(1);
    (0, vitest_1.expect)(execFileSpy).toHaveBeenCalledWith(`${testDataPath}/command with spaces.sh`, [filePath], {
        cwd: testDataPath,
        encoding: "utf8",
        env: undefined,
        maxBuffer: undefined,
    }, vitest_1.expect.anything());
}));
(0, vitest_1.test)("stdio", () => __awaiter(void 0, void 0, void 0, function* () {
    const testDataPath = path.join(__dirname, "../test/testData/stdio");
    const tasksJson = yield Promise.resolve(`${path.join(testDataPath, ".vscode/tasks.json")}`).then(s => require(s));
    const mockData = (yield Promise.resolve(`${path.join(testDataPath, "mockData.ts")}`).then(s => require(s))).default;
    mockVscode.setMockData(mockData);
    const input = tasksJson.inputs[0].args;
    const expectationStdout = vitest_1.expect.objectContaining({ value: "this is on stdout" });
    const expectationStderr = vitest_1.expect.objectContaining({ value: "this is on stderr" });
    for (const { setting, expectation } of [
        { setting: "stdout", expectation: [expectationStdout] },
        { setting: "stderr", expectation: [expectationStderr] },
        { setting: "both", expectation: [expectationStdout, expectationStderr] },
    ]) {
        execSpy.mockClear();
        execFileSpy.mockClear();
        const handler = new CommandHandler_1.CommandHandler(Object.assign(Object.assign({}, input), { stdio: setting }), new UserInputContext_1.UserInputContext(), mockExtensionContext, child_process);
        // @ts-expect-error Mock the quickPick method. It's not trivial to mock
        // the underlying vscode functions.
        handler.quickPick = vitest_1.vi.fn();
        yield handler.handle();
        (0, vitest_1.expect)(execSpy).toHaveBeenCalledTimes(1);
        (0, vitest_1.expect)(execFileSpy).toHaveBeenCalledTimes(0);
        // @ts-expect-error Check that the method was called
        (0, vitest_1.expect)(handler.quickPick).toHaveBeenCalledTimes(1);
        // @ts-expect-error Check that the method was called with the correct
        // arguments
        (0, vitest_1.expect)(handler.quickPick).toHaveBeenCalledWith(expectation);
    }
}));
(0, vitest_1.describe)("Workspace state", () => {
    (0, vitest_1.test)("It should return an array even if the saved value is a string", () => __awaiter(void 0, void 0, void 0, function* () {
        const testDataPath = path.join(__dirname, "../test/testData/simple");
        const tasksJson = yield Promise.resolve(`${path.join(testDataPath, ".vscode/tasks.json")}`).then(s => require(s));
        const mockData = (yield Promise.resolve(`${path.join(testDataPath, "mockData.ts")}`).then(s => require(s))).default;
        mockVscode.setMockData(mockData);
        const input = tasksJson.inputs[0].args;
        class CommandHandlerTestHelper extends CommandHandler_1.CommandHandler {
            getDefault() {
                return super.getDefault();
            }
        }
        for (const workspaceStateGet of [
            () => "test",
            () => ["test"],
        ]) {
            const handler = new CommandHandlerTestHelper(Object.assign(Object.assign({}, input), { rememberPrevious: true }), new UserInputContext_1.UserInputContext(), Object.assign(Object.assign({}, mockExtensionContext), { workspaceState: {
                    get: workspaceStateGet,
                } }), child_process);
            (0, vitest_1.expect)(handler.getDefault()).toStrictEqual(["test"]);
        }
    }));
});
(0, vitest_1.describe)("Errors", () => __awaiter(void 0, void 0, void 0, function* () {
    (0, vitest_1.test)("It should trigger an error for an empty result", () => __awaiter(void 0, void 0, void 0, function* () {
        const testDataPath = path.join(__dirname, "../test/testData/errors");
        const tasksJson = yield Promise.resolve(`${path.join(testDataPath, ".vscode/tasks.json")}`).then(s => require(s));
        const mockData = (yield Promise.resolve(`${path.join(testDataPath, "mockData.ts")}`).then(s => require(s))).default;
        mockVscode.setMockData(mockData);
        const input = tasksJson.inputs[0].args;
        const handler = new CommandHandler_1.CommandHandler(input, new UserInputContext_1.UserInputContext(), mockExtensionContext, child_process);
        (0, vitest_1.expect)(() => handler.handle()).rejects.toThrowError("The command for input 'inputTest' returned empty result.");
    }));
    (0, vitest_1.test)("It should NOT trigger an error with defaultOptions", () => __awaiter(void 0, void 0, void 0, function* () {
        const testDataPath = path.join(__dirname, "../test/testData/errors");
        const tasksJson = yield Promise.resolve(`${path.join(testDataPath, ".vscode/tasks.json")}`).then(s => require(s));
        const mockData = (yield Promise.resolve(`${path.join(testDataPath, "mockData.ts")}`).then(s => require(s))).default;
        mockVscode.setMockData(mockData);
        const input = tasksJson.inputs[1].args;
        const handler = new CommandHandler_1.CommandHandler(input, new UserInputContext_1.UserInputContext(), mockExtensionContext, child_process);
        (0, vitest_1.expect)(() => handler.handle()).rejects.not.toThrowError("The command for input 'inputTest' returned empty result.");
    }));
}));
(0, vitest_1.describe)("Argument parsing", () => {
    (0, vitest_1.test)("Test defaults and that all boolean properties use parseBoolean", () => {
        (0, vitest_1.expect)(CommandHandler_1.CommandHandler.resolveArgs({ extraTestThing: 42 }))
            .toStrictEqual({
            allowCustomValues: false,
            rememberPrevious: false,
            useFirstResult: false,
            useSingleResult: false,
            multiselect: false,
            warnOnStderr: true,
            multiselectSeparator: " ",
            stdio: "stdout",
            extraTestThing: 42,
        });
    });
    (0, vitest_1.test)("parseBoolean", () => {
        (0, vitest_1.expect)((0, options_1.parseBoolean)(undefined, true)).toBe(true);
        (0, vitest_1.expect)((0, options_1.parseBoolean)(undefined, false)).toBe(false);
        (0, vitest_1.expect)((0, options_1.parseBoolean)(false, true)).toBe(false);
        (0, vitest_1.expect)((0, options_1.parseBoolean)(true, false)).toBe(true);
        (0, vitest_1.expect)((0, options_1.parseBoolean)("false", true)).toBe(false);
        (0, vitest_1.expect)((0, options_1.parseBoolean)("fALse", true)).toBe(false);
        (0, vitest_1.expect)((0, options_1.parseBoolean)("true", false)).toBe(true);
        (0, vitest_1.expect)((0, options_1.parseBoolean)("tRUe", false)).toBe(true);
        (0, vitest_1.expect)(mockVscode.window.getShowWarningMessageCalls().length).toBe(0);
        (0, vitest_1.expect)((0, options_1.parseBoolean)(42, true)).toBe(true);
        (0, vitest_1.expect)((0, options_1.parseBoolean)(42, false)).toBe(false);
        (0, vitest_1.expect)(mockVscode.window.getShowWarningMessageCalls().length).toBe(2);
    });
});
//# sourceMappingURL=CommandHandler.test.js.map