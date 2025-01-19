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
exports.CommandHandler = void 0;
const vscode = require("vscode");
const VariableResolver_1 = require("./VariableResolver");
const exceptions_1 = require("../util/exceptions");
const options_1 = require("./options");
function promisify(fn) {
    return (...args) => new Promise((resolve, reject) => {
        fn(...args, (err, stdout, stderr) => {
            if (err) {
                reject(err);
            }
            else {
                resolve({ stdout, stderr });
            }
        });
    });
}
class CommandHandler {
    constructor(args, userInputContext, context, subprocess) {
        this.EOL = /\r\n|\r|\n/;
        this.args = CommandHandler.resolveArgs(args);
        if (!Object.prototype.hasOwnProperty.call(this.args, "command")) {
            throw new exceptions_1.ShellCommandException('Please specify the "command" property.');
        }
        const command = CommandHandler.resolveCommand(this.args.command);
        if (typeof command !== "string") {
            throw new exceptions_1.ShellCommandException('The "command" property should be a string or an array of ' +
                `string but got "${typeof command}".`);
        }
        if (!(this.args.commandArgs === undefined || Array.isArray(this.args.commandArgs))) {
            throw new exceptions_1.ShellCommandException('The "commandArgs" property should be an array of strings ' +
                `(if defined) but got "${typeof this.args.commandArgs}".`);
        }
        this.command = command;
        this.commandArgs = this.args.commandArgs;
        this.input = this.resolveTaskToInput(this.args.taskId);
        this.userInputContext = userInputContext;
        this.context = context;
        this.subprocess = subprocess;
    }
    static resolveArgs(args) {
        var _a;
        return Object.assign({ useFirstResult: (0, options_1.parseBoolean)(args.useFirstResult, false), useSingleResult: (0, options_1.parseBoolean)(args.useSingleResult, false), rememberPrevious: (0, options_1.parseBoolean)(args.rememberPrevious, false), allowCustomValues: (0, options_1.parseBoolean)(args.allowCustomValues, false), warnOnStderr: (0, options_1.parseBoolean)(args.warnOnStderr, true), multiselect: (0, options_1.parseBoolean)(args.multiselect, false), multiselectSeparator: (_a = args.multiselectSeparator) !== null && _a !== void 0 ? _a : " ", stdio: ["stdout", "stderr", "both"].includes(args.stdio) ? args.stdio : "stdout" }, args);
    }
    resolveArgs() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            const resolver = new VariableResolver_1.VariableResolver(this.input, this.userInputContext, this.context, this.getDefault().join(this.args.multiselectSeparator));
            const command = yield resolver.resolve(this.command);
            if (command === undefined) {
                throw new exceptions_1.ShellCommandException("Your command is badly formatted and variables could not be resolved");
            }
            else {
                this.command = command;
            }
            if (this.commandArgs !== undefined) {
                for (const i in this.commandArgs) {
                    const item = yield resolver.resolve(this.commandArgs[i]);
                    if (item === undefined) {
                        throw new exceptions_1.ShellCommandException(`"commandArgs" element at index ${i} is invalid.`);
                    }
                    else {
                        this.commandArgs[i] = item;
                    }
                }
            }
            if (this.args.rememberPrevious && this.args.taskId === undefined) {
                throw new exceptions_1.ShellCommandException("You need to specify a taskId when using rememberPrevious=true");
            }
            if (this.args.env !== undefined) {
                for (const key in (_a = this.args.env) !== null && _a !== void 0 ? _a : []) {
                    if (Object.prototype.hasOwnProperty.call(this.args.env, key)) {
                        this.args.env[key] = (yield resolver.resolve(this.args.env[key])) || "";
                    }
                }
            }
            this.args.cwd = this.args.cwd
                ? yield resolver.resolve((_b = this.args.cwd) !== null && _b !== void 0 ? _b : '')
                : (_c = vscode.workspace.workspaceFolders) === null || _c === void 0 ? void 0 : _c[this.input.workspaceIndex].uri.fsPath;
        });
    }
    // Get the result, either by showing a dropdown or taking the first / only
    // option
    getResult() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.resolveArgs();
            const result = yield this.runCommand();
            const nonEmptyInput = this.parseResult(result);
            const useFirstResult = this.args.useFirstResult ||
                (this.args.useSingleResult && nonEmptyInput.length === 1);
            if (useFirstResult) {
                const result = nonEmptyInput[0].value;
                return [result];
            }
            else {
                const selectedItems = yield this.quickPick(nonEmptyInput);
                return selectedItems;
            }
        });
    }
    handle() {
        return __awaiter(this, void 0, void 0, function* () {
            const selectedItems = yield this.getResult();
            if (selectedItems === undefined) {
                return;
            }
            if (this.args.rememberPrevious && this.args.taskId) {
                this.setDefault(this.args.taskId, selectedItems);
            }
            const result = selectedItems.join(this.args.multiselectSeparator);
            this.userInputContext.recordInputByInputId(this.input.id, result);
            this.userInputContext.recordInputByTaskId(this.args.taskId, result);
            return result;
        });
    }
    runCommand() {
        return __awaiter(this, void 0, void 0, function* () {
            const options = {
                encoding: "utf8",
                cwd: this.args.cwd,
                env: this.args.env,
                maxBuffer: this.args.maxBuffer,
                //    shell: vscode.env.shell
            };
            if (this.commandArgs !== undefined) {
                const execFile = promisify(this.subprocess.execFile);
                return yield execFile(this.command, this.commandArgs, options);
            }
            else {
                const exec = promisify(this.subprocess.exec);
                return exec(this.command, options);
            }
        });
    }
    parseResult(commandOutput) {
        const stdout = commandOutput.stdout.trim();
        const stderr = commandOutput.stderr.trim();
        let items = [];
        if (("stdout" == this.args.stdio) || ("both" == this.args.stdio)) {
            items.push(...stdout.split(this.EOL));
        }
        if (("stderr" == this.args.stdio) || ("both" == this.args.stdio)) {
            items.push(...stderr.split(this.EOL));
        }
        items = items.filter(item => item !== "");
        if ((items.length == 0) && (undefined === this.args.defaultOptions)) {
            let msg = `The command for input '${this.input.id}' returned empty result.`;
            if (stderr) {
                msg += ` stderr: '${stderr}'`;
            }
            throw new exceptions_1.ShellCommandException(msg);
        }
        if ((this.args.warnOnStderr) && ("stdout" == this.args.stdio) && stderr) {
            vscode.window.showWarningMessage(`The command for input '${this.input.id}' might have errors.
                 stderr: '${stderr}'.
                 Hint: You can disable this with '"warnOnStderr": false'.`);
        }
        return items
            .map((value) => {
            var _a;
            const values = value.trim().split(this.args.fieldSeparator, 4);
            return {
                value: values[0],
                label: (_a = values[1]) !== null && _a !== void 0 ? _a : value,
                description: values[2],
                detail: values[3],
            };
        })
            .filter((item) => item.label && item.label.trim().length > 0);
    }
    getDefault() {
        if (this.args.rememberPrevious && this.args.taskId) {
            const result = this.context.workspaceState
                .get(this.args.taskId, []);
            // Backwards compatibilty for before multiselect when default was
            // saved as string not array.
            return (typeof result === "string") ? [result] : result;
        }
        return [];
    }
    setDefault(id, values) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.context.workspaceState.update(id, values);
        });
    }
    /**
     * Transform the slected items in the quickpick list
     */
    static transformSelection(picker) {
        return picker === null || picker === void 0 ? void 0 : picker.selectedItems.map((item) => item.value);
    }
    quickPick(input) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            if (input.length === 0) {
                input = (_b = (_a = this.args.defaultOptions) === null || _a === void 0 ? void 0 : _a.map((option) => ({
                    value: option,
                    label: option,
                }))) !== null && _b !== void 0 ? _b : [];
            }
            const defaultValues = this.getDefault();
            let disposable;
            return new Promise((resolve) => {
                const picker = vscode.window.createQuickPick();
                picker.canSelectMany = this.args.multiselect;
                picker.matchOnDescription = true;
                picker.matchOnDetail = true;
                if (this.args.description !== undefined) {
                    picker.placeholder = this.args.description;
                }
                // Compute all constant (non custom) picker items.
                const constantItems = input.map((item) => ({
                    label: item.label,
                    description: (!this.args.multiselect &&
                        defaultValues.includes(item.value))
                        ? `${item.description} (Default)`
                        : item.description,
                    detail: item.detail,
                    value: item.value,
                }));
                const disposableLikes = [
                    picker,
                    picker.onDidAccept(() => {
                        const result = CommandHandler.transformSelection(picker);
                        if (undefined !== result) {
                            resolve(result);
                        }
                    }),
                    picker.onDidHide(() => {
                        var _a;
                        const didCancelQuickPickSession = ((_a = picker === null || picker === void 0 ? void 0 : picker.selectedItems) === null || _a === void 0 ? void 0 : _a.length) === 0;
                        const result = CommandHandler.transformSelection(picker);
                        if (didCancelQuickPickSession) {
                            resolve(undefined);
                        }
                        else if (this.input.id && (undefined !== result)) {
                            resolve(result);
                        }
                        else {
                            console.log(`onDidHide for ${this.args.taskId} got to else branch.`);
                        }
                    }),
                ];
                if (this.args.allowCustomValues) {
                    // Cache item labels to save some work on keypress.
                    const itemLabels = input.map((item) => item.label);
                    disposableLikes.push(picker.onDidChangeValue(() => {
                        // Vscode API has no mechanism to detect visible items.
                        // The best we can do is check if it's not exactly equal to an existing item.
                        if (picker.value !== "" && !itemLabels.includes(picker.value)) {
                            // There's no more efficient way to do this.
                            // Vscode doesn't update unless we give it a new object.
                            picker.items = [...constantItems, {
                                    label: picker.value,
                                    value: picker.value,
                                    description: "(Custom)",
                                }];
                        }
                        else {
                            picker.items = constantItems;
                        }
                    }));
                }
                disposable = vscode.Disposable.from(...disposableLikes);
                picker.items = constantItems;
                const activeItems = [...picker.items.filter((item) => defaultValues.includes(item.value))];
                // Assigning unconditionally can break selectedItems in callbacks
                // See #112
                if (activeItems.length) {
                    if (this.args.multiselect) {
                        picker.selectedItems = activeItems;
                    }
                    else {
                        picker.activeItems = activeItems;
                    }
                }
                picker.show();
            }).finally(() => {
                if (disposable) {
                    disposable.dispose();
                }
            });
        });
    }
    // The command can be given as a string or array of strings.
    static resolveCommand(command) {
        return Array.isArray(command) ? command.join(' ') : command;
    }
    // Compare two `commandArgs` parameters.
    // Returns true if they're both undefined or both the same array.
    static compareCommandArgs(a, b) {
        if (Array.isArray(a)) {
            return Array.isArray(b) &&
                a.length == b.length &&
                a.every((element, index) => element === b[index]);
        }
        return a === undefined && b === undefined;
    }
    resolveTaskToInput(taskId) {
        var _a, _b, _c;
        // Find all objects where command is shellCommand.execute nested anywhere in the input object.
        // It could be that the actual input being run is nested inside an input from another extension.
        // See https://github.com/augustocdias/vscode-shell-command/issues/79
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        function* deepSearch(obj) {
            if ((obj === null || obj === void 0 ? void 0 : obj.command) === "shellCommand.execute") {
                yield obj;
            }
            for (const value of Object.values(obj)) {
                if (typeof value === 'object') {
                    yield* deepSearch(value);
                }
            }
        }
        function* getSectionInputs(section, folder) {
            var _a, _b, _c, _d, _e;
            const keys = folder
                ? ["workspaceFolderValue"]
                : ["workspaceValue", "globalValue"];
            for (const key of keys) {
                const conf = vscode.workspace.getConfiguration(section, folder === null || folder === void 0 ? void 0 : folder.uri);
                const env = (_c = (_b = (_a = conf.inspect("options")) === null || _a === void 0 ? void 0 : _a[key]) === null || _b === void 0 ? void 0 : _b.env) !== null && _c !== void 0 ? _c : {};
                for (const input of ((_d = conf.inspect("inputs")) === null || _d === void 0 ? void 0 : _d[key]) || []) {
                    // Go through all the nested shellCommand.execute inputs.
                    for (const shellInput of deepSearch(input)) {
                        // Yield the input and assign the workspaceIndex.
                        yield Object.assign(Object.assign({}, shellInput), { workspaceIndex: (_e = folder === null || folder === void 0 ? void 0 : folder.index) !== null && _e !== void 0 ? _e : 0, env });
                    }
                }
            }
        }
        function* getAllInputs() {
            var _a;
            for (const folder of (_a = vscode.workspace.workspaceFolders) !== null && _a !== void 0 ? _a : []) {
                yield* getSectionInputs("launch", folder);
                yield* getSectionInputs("tasks", folder);
            }
            yield* getSectionInputs("launch");
            yield* getSectionInputs("tasks");
        }
        // Go through the generator and return the first match
        for (const input of getAllInputs()) {
            const command = CommandHandler.resolveCommand((_a = input === null || input === void 0 ? void 0 : input.args) === null || _a === void 0 ? void 0 : _a.command);
            if (command === this.command && ((_b = input === null || input === void 0 ? void 0 : input.args) === null || _b === void 0 ? void 0 : _b.taskId) === taskId &&
                CommandHandler.compareCommandArgs(this.commandArgs, (_c = input === null || input === void 0 ? void 0 : input.args) === null || _c === void 0 ? void 0 : _c.commandArgs)) {
                return input;
            }
        }
        throw new exceptions_1.ShellCommandException(`Could not find input with command '${this.command}' and taskId '${taskId}'.`);
    }
}
exports.CommandHandler = CommandHandler;
//# sourceMappingURL=CommandHandler.js.map