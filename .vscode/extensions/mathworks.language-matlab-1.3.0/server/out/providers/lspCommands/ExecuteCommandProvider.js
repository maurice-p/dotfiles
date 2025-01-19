"use strict";
// Copyright 2022 - 2024 The MathWorks, Inc.
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
exports.MatlabLSCommands = void 0;
exports.MatlabLSCommands = {
    MLINT_SUPPRESS_ON_LINE: 'matlabls.lint.suppress.line',
    MLINT_SUPPRESS_IN_FILE: 'matlabls.lint.suppress.file'
};
/**
 * Handles requests to execute commands
 */
class ExecuteCommandProvider {
    constructor(lintingSupportProvider) {
        this.lintingSupportProvider = lintingSupportProvider;
    }
    /**
     * Handles command execution requests.
     *
     * @param params Parameters from the onExecuteCommand request
     * @param documentManager The text document manager
     * @param connection The language server connection
     */
    handleExecuteCommand(params, documentManager) {
        return __awaiter(this, void 0, void 0, function* () {
            switch (params.command) {
                case exports.MatlabLSCommands.MLINT_SUPPRESS_ON_LINE:
                case exports.MatlabLSCommands.MLINT_SUPPRESS_IN_FILE:
                    void this.handleLintingSuppression(params, documentManager);
            }
        });
    }
    /**
     * Handles command to suppress a linting diagnostic.
     *
     * @param params Parameters from the onExecuteCommand request
     * @param documentManager The text document manager
     * @param connection The language server connection
     */
    handleLintingSuppression(params, documentManager) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const args = (_a = params.arguments) === null || _a === void 0 ? void 0 : _a[0];
            const range = args.range;
            const uri = args.uri;
            const doc = documentManager.get(uri);
            if (doc == null) {
                return;
            }
            const shouldSuppressThroughoutFile = params.command === exports.MatlabLSCommands.MLINT_SUPPRESS_IN_FILE;
            void this.lintingSupportProvider.suppressDiagnostic(doc, range, args.id, shouldSuppressThroughoutFile);
        });
    }
}
exports.default = ExecuteCommandProvider;
//# sourceMappingURL=ExecuteCommandProvider.js.map