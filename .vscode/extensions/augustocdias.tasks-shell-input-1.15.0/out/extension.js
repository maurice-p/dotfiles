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
exports.activate = void 0;
const vscode = require("vscode");
const subprocess = require("child_process");
const CommandHandler_1 = require("./lib/CommandHandler");
const UserInputContext_1 = require("./lib/UserInputContext");
const exceptions_1 = require("./util/exceptions");
// This is the type use by the vscode API
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function activate(context) {
    const userInputContext = new UserInputContext_1.UserInputContext();
    const handleExecute = (args) => {
        try {
            const handler = new CommandHandler_1.CommandHandler(args, userInputContext, context, subprocess);
            return handler.handle();
        }
        catch (error) {
            const message = (error instanceof exceptions_1.ShellCommandException)
                ? error.message
                : 'Error executing shell command: ' + error;
            console.error(error);
            vscode.window.showErrorMessage(message);
        }
    };
    context.subscriptions.push(vscode.commands.registerCommand('shellCommand.execute', handleExecute, this));
    // Reimplementation of promptString that can be used from inputs.
    const handlePromptString = () => __awaiter(this, void 0, void 0, function* () {
        vscode.window.showWarningMessage('shellCommand.promptString is deprecated. Please use `${prompt}`.');
        const inputValue = yield vscode.window.showInputBox();
        return inputValue || '';
    });
    context.subscriptions.push(vscode.commands.registerCommand('shellCommand.promptString', handlePromptString, this));
}
exports.activate = activate;
//# sourceMappingURL=extension.js.map