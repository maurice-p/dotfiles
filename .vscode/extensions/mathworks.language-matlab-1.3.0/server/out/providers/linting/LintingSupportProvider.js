"use strict";
// Copyright 2022 - 2024 The MathWorks, Inc.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const vscode_languageserver_1 = require("vscode-languageserver");
const vscode_uri_1 = require("vscode-uri");
const ConfigurationManager_1 = __importDefault(require("../../lifecycle/ConfigurationManager"));
const Logger_1 = __importDefault(require("../../logging/Logger"));
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const which = require("which");
const ExecuteCommandProvider_1 = require("../lspCommands/ExecuteCommandProvider");
const ClientConnection_1 = __importDefault(require("../../ClientConnection"));
const LINT_DELAY = 500; // Delay (in ms) after keystroke before attempting to lint the document
// Lint result parsing constants
const LINT_MESSAGE_REGEX = /L (\d+) \(C (\d+)-?(\d*)\): ([\dA-Za-z]+): ML(\d): (.*)/;
const FIX_FLAG_REGEX = /\(CAN FIX\)/;
const FIX_MESSAGE_REGEX = /----FIX MESSAGE<\w+>\s+<([^>]*)>/;
const FIX_CHANGE_REGEX = /----CHANGE MESSAGE L (\d+) \(C (\d+)\);\s+L (\d+) \(C (\d+)\):\s+<([^>]*)>/;
/**
 * Handles requests for linting-related features.
 * Currently, this handles displaying diagnostics, providing quick-fixes,
 * and suppressing diagnostics.
 *
 * Note: When MATLAB® is not connected, diagnostics are only updated when
 * the file is saved and suppressing warnings is not available.
 */
class LintingSupportProvider {
    constructor(matlabLifecycleManager) {
        this.matlabLifecycleManager = matlabLifecycleManager;
        this.LINTING_REQUEST_CHANNEL = '/matlabls/linting/request';
        this.LINTING_RESPONSE_CHANNEL = '/matlabls/linting/response';
        this.SUPPRESS_DIAGNOSTIC_REQUEST_CHANNEL = '/matlabls/linting/suppressdiagnostic/request';
        this.SUPPRESS_DIAGNOSTIC_RESPONSE_CHANNEL = '/matlabls/linting/suppressdiagnostic/response';
        this.SEVERITY_MAP = {
            0: vscode_languageserver_1.DiagnosticSeverity.Information,
            1: vscode_languageserver_1.DiagnosticSeverity.Warning,
            2: vscode_languageserver_1.DiagnosticSeverity.Error,
            3: vscode_languageserver_1.DiagnosticSeverity.Error,
            4: vscode_languageserver_1.DiagnosticSeverity.Error
        };
        this._pendingFilesToLint = new Map();
        this._availableCodeActions = new Map();
    }
    /**
     * Queues a document to be linted. This handles debouncing so
     * that linting is not performed on every keystroke.
     *
     * @param textDocument The document to be linted
     * @param connection The language server connection
     */
    queueLintingForDocument(textDocument) {
        const uri = textDocument.uri;
        this.clearTimerForDocumentUri(uri);
        this._pendingFilesToLint.set(uri, setTimeout(() => {
            void this.lintDocument(textDocument);
        }, LINT_DELAY) // Specify timeout for debouncing, to avoid re-linting every keystroke while a user types
        );
    }
    /**
     * Lints the document and displays diagnostics.
     *
     * @param textDocument The document being linted
     * @param connection The language server connection
     */
    lintDocument(textDocument) {
        return __awaiter(this, void 0, void 0, function* () {
            const uri = textDocument.uri;
            this.clearTimerForDocumentUri(uri);
            this.clearCodeActionsForDocumentUri(uri);
            const matlabConnection = yield this.matlabLifecycleManager.getMatlabConnection();
            const isMatlabAvailable = matlabConnection != null;
            const isMFile = this.isMFile(uri);
            const fileName = isMFile ? vscode_uri_1.URI.parse(uri).fsPath : "untitled.m";
            let lintData = [];
            const code = textDocument.getText();
            const analysisLimit = (yield ConfigurationManager_1.default.getConfiguration()).maxFileSizeForAnalysis;
            if (analysisLimit > 0 && code.length > analysisLimit) {
                this.clearDiagnosticsForDocument(textDocument); // Clear document to handle setting changing value
                return;
            }
            if (isMatlabAvailable) {
                // Use MATLAB-based linting for better results and fixes
                lintData = yield this.getLintResultsFromMatlab(code, fileName, matlabConnection);
            }
            else if (isMFile) {
                // Try to use mlint executable for basic linting
                lintData = yield this.getLintResultsFromExecutable(fileName);
            }
            const lintResults = this.processLintResults(uri, lintData);
            const diagnostics = lintResults.diagnostics;
            // Store code actions
            this._availableCodeActions.set(uri, lintResults.codeActions);
            // Report diagnostics
            void ClientConnection_1.default.getConnection().sendDiagnostics({
                uri,
                diagnostics
            });
        });
    }
    clearDiagnosticsForDocument(textDocument) {
        void ClientConnection_1.default.getConnection().sendDiagnostics({
            uri: textDocument.uri,
            diagnostics: []
        });
    }
    /**
     * Handles a request for code actions.
     *
     * @param params Parameters from the onCodeAction request
     */
    handleCodeActionRequest(params) {
        var _a;
        const uri = params.textDocument.uri;
        const actions = (_a = this._availableCodeActions.get(uri)) !== null && _a !== void 0 ? _a : [];
        let codeActions = [...actions];
        // Filter to find unique diagnostics
        codeActions = codeActions.filter(action => {
            var _a;
            const diagnostic = (_a = action.diagnostics) === null || _a === void 0 ? void 0 : _a[0];
            if (diagnostic == null) {
                return false;
            }
            return params.context.diagnostics.some(diag => this.isSameDiagnostic(diagnostic, diag));
        });
        if (!this.matlabLifecycleManager.isMatlabConnected()) {
            // Cannot suppress warnings without MATLAB
            return codeActions;
        }
        // Add suppression commands
        const diagnostics = params.context.diagnostics;
        const commands = [];
        diagnostics.forEach(diagnostic => {
            // Don't allow suppressing errors
            if (diagnostic.severity === vscode_languageserver_1.DiagnosticSeverity.Error) {
                return;
            }
            const diagnosticCode = diagnostic.code;
            // Add suppress-on-line option
            commands.push(vscode_languageserver_1.Command.create(`Suppress message ${diagnosticCode} on this line`, ExecuteCommandProvider_1.MatlabLSCommands.MLINT_SUPPRESS_ON_LINE, {
                id: diagnosticCode,
                range: diagnostic.range,
                uri
            }));
            // Add suppress-in-file option
            commands.push(vscode_languageserver_1.Command.create(`Suppress message ${diagnosticCode} in this file`, ExecuteCommandProvider_1.MatlabLSCommands.MLINT_SUPPRESS_IN_FILE, {
                id: diagnosticCode,
                range: diagnostic.range,
                uri
            }));
        });
        commands.forEach(command => {
            // Add suppression actions as Commands to be processed later.
            codeActions.push(vscode_languageserver_1.CodeAction.create(command.title, command, vscode_languageserver_1.CodeActionKind.QuickFix));
        });
        return codeActions;
    }
    /**
     * Attempt to suppress a diagnostic.
     *
     * @param textDocument The document
     * @param range The range of the diagnostic being suppress
     * @param id The diagnostic's ID
     * @param shouldSuppressThroughoutFile Whether or not to suppress the diagnostic throughout the entire file
     */
    suppressDiagnostic(textDocument, range, id, shouldSuppressThroughoutFile) {
        return __awaiter(this, void 0, void 0, function* () {
            const matlabConnection = yield this.matlabLifecycleManager.getMatlabConnection();
            if (matlabConnection == null) {
                return;
            }
            const channelId = matlabConnection.getChannelId();
            const channel = `${this.SUPPRESS_DIAGNOSTIC_RESPONSE_CHANNEL}/${channelId}`;
            const responseSub = matlabConnection.subscribe(channel, message => {
                matlabConnection.unsubscribe(responseSub);
                const suppressionEdits = message.suppressionEdits;
                const edit = {
                    changes: {
                        [textDocument.uri]: suppressionEdits
                    },
                    documentChanges: [
                        vscode_languageserver_1.TextDocumentEdit.create(vscode_languageserver_1.VersionedTextDocumentIdentifier.create(textDocument.uri, textDocument.version), suppressionEdits)
                    ]
                };
                void ClientConnection_1.default.getConnection().workspace.applyEdit(edit);
            });
            matlabConnection.publish(this.SUPPRESS_DIAGNOSTIC_REQUEST_CHANNEL, {
                code: textDocument.getText(),
                diagnosticId: id,
                line: range.start.line + 1,
                suppressInFile: shouldSuppressThroughoutFile,
                channelId
            });
        });
    }
    /**
     * Clears any active linting timers for the provided document URI.
     *
     * @param uri The document URI
     */
    clearTimerForDocumentUri(uri) {
        const timerId = this._pendingFilesToLint.get(uri);
        if (timerId != null) {
            clearTimeout(timerId);
            this._pendingFilesToLint.delete(uri);
        }
    }
    /**
     * Clears any cached code actions for the provided document URI.
     *
     * @param uri The document URI
     */
    clearCodeActionsForDocumentUri(uri) {
        this._availableCodeActions.set(uri, []);
    }
    /**
     * Gets raw linting data from MATLAB.
     *
     * @param code The code to be linted
     * @param fileName The file's name
     * @param matlabConnection The connection to MATLAB
     * @returns Raw lint data for the code
     */
    getLintResultsFromMatlab(code, fileName, matlabConnection) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield new Promise(resolve => {
                const channelId = matlabConnection.getChannelId();
                const channel = `${this.LINTING_RESPONSE_CHANNEL}/${channelId}`;
                const responseSub = matlabConnection.subscribe(channel, message => {
                    matlabConnection.unsubscribe(responseSub);
                    resolve(message.lintData);
                });
                matlabConnection.publish(this.LINTING_REQUEST_CHANNEL, {
                    code,
                    fileName,
                    channelId
                });
            });
        });
    }
    /**
     * Gets raw linting data using the mlint executable.
     *
     * @param fileName The file's name
     * @returns Raw lint data for the file
     */
    getLintResultsFromExecutable(fileName) {
        return __awaiter(this, void 0, void 0, function* () {
            const mlintExecutable = yield this.getMlintExecutable();
            if (mlintExecutable == null) {
                // Unable to locate executable
                return [];
            }
            const mlintArgs = [
                fileName,
                '-id',
                '-severity',
                '-fix'
            ];
            return yield new Promise(resolve => {
                try {
                    (0, child_process_1.execFile)(mlintExecutable, mlintArgs, (error, stdout, stderr) => {
                        var _a;
                        if (error != null) {
                            Logger_1.default.error(`Error from mlint executable: ${error.message}\n${(_a = error.stack) !== null && _a !== void 0 ? _a : ''}`);
                            resolve([]);
                        }
                        resolve(stderr.split('\n')); // For some reason, mlint appears to output on stderr instead of stdout
                    });
                }
                catch (e) {
                    Logger_1.default.error(`Error executing mlint executable at ${mlintExecutable}`);
                }
            });
        });
    }
    /**
     * Attempts to determine the path to the mlint executable.
     *
     * @returns The path to the mlint executable, or null if it cannot be determined
     */
    getMlintExecutable() {
        return __awaiter(this, void 0, void 0, function* () {
            const platformDirs = this.getBinDirectoriesForPlatform();
            if (platformDirs == null) {
                // Unable to determine platform
                return null;
            }
            const matlabInstallPath = (yield ConfigurationManager_1.default.getConfiguration()).installPath.trim();
            let binPath = '';
            if (matlabInstallPath !== '') {
                // Find the executable from the root installation directory
                binPath = path.normalize(path.join(matlabInstallPath, 'bin'));
            }
            else {
                // Try to find the executable based on the location of the `matlab` executable
                try {
                    let resolvedPath = yield which('matlab');
                    if (resolvedPath !== '') {
                        resolvedPath = yield fs.realpath(resolvedPath);
                        binPath = path.dirname(resolvedPath);
                    }
                }
                catch (_a) {
                    // `matlab` not found on path - no action
                }
            }
            if (binPath === '') {
                return null;
            }
            for (const platformDir of platformDirs) {
                const mlintExecutablePath = path.normalize(path.join(binPath, platformDir, process.platform === 'win32' ? 'mlint.exe' : 'mlint'));
                try {
                    yield fs.access(mlintExecutablePath);
                    return mlintExecutablePath; // return the first existing path
                }
                catch (_b) {
                    // continue to the next iteration
                }
            }
            Logger_1.default.error(`Error finding mlint executable in ${binPath}`);
            return null;
        });
    }
    /**
     * Gets the name of platform-specific binary directory.
     *
     * @returns The binary directory name, or null if the platform is not recognized
     */
    getBinDirectoriesForPlatform() {
        switch (process.platform) {
            case 'win32':
                return ['win64'];
            case 'darwin':
                return ['maci64', 'maca64'];
            case 'linux':
                return ['glnxa64'];
            default:
                return null;
        }
    }
    /**
     * Parses diagnostics and code actions from the raw lint data.
     *
     * @param uri THe linted document's URI
     * @param lintData The lint data for the document
     * @returns Parsed diagnostics and code actions
     */
    processLintResults(uri, lintData) {
        const diagnostics = [];
        const codeActions = [];
        let dataIndex = 0;
        while (dataIndex < lintData.length) {
            const message = lintData[dataIndex++];
            if (message === '') {
                continue;
            }
            // Parse lint message
            // Diagnostics will be reported with a line like the following:
            //     L {lineNumber} (C {columnNumber}): {diagnosticId}: ML{severity}: {diagnosticMessage} (CAN FIX)
            // If the diagnostic cannot be fixed, the '(CAN FIX)' will not be present
            const parsedLine = message.match(LINT_MESSAGE_REGEX);
            if (parsedLine == null) {
                continue;
            }
            const line = Math.max(parseInt(parsedLine[1]) - 1, 0);
            const startColumn = Math.max(parseInt(parsedLine[2]) - 1, 0);
            const endColumn = (parsedLine[3] !== '') ? parseInt(parsedLine[3]) : startColumn + 1; // +1 for open interval
            const id = parsedLine[4];
            const severity = this.SEVERITY_MAP[parsedLine[5]];
            let lintMessage = parsedLine[6];
            // Check if there are available fixes for this diagnostic
            const fixMatch = lintMessage.match(FIX_FLAG_REGEX);
            if (fixMatch != null) {
                lintMessage = lintMessage.replace(FIX_FLAG_REGEX, '').trim();
            }
            const diagnostic = vscode_languageserver_1.Diagnostic.create(vscode_languageserver_1.Range.create(line, startColumn, line, endColumn), lintMessage, severity, id, 'MATLAB');
            diagnostics.push(diagnostic);
            // Parse fix data for this diagnostic, if it exists
            if (fixMatch == null) {
                continue;
            }
            const fixInfo = lintData[dataIndex++];
            // Parse fix message
            // Diagnostic fixes will be reported with lines like the following:
            //     ----FIX MESSAGE<{diagnosticFixId}> <{message}>
            //     ----CHANGE MESSAGE L {lineNumber} (C {columnNumber});  L {lineNumber} (C {columnNumber}):  <{text}>
            const fixMsgMatch = fixInfo.match(FIX_MESSAGE_REGEX);
            if (fixMsgMatch == null) {
                continue;
            }
            const fixMsg = fixMsgMatch[1];
            // Gather fixes
            const changes = {
                [uri]: []
            };
            const wsEdit = {
                changes
            };
            while (dataIndex < lintData.length) {
                const actionMsg = lintData[dataIndex];
                const actionMsgMatch = actionMsg.match(FIX_CHANGE_REGEX);
                if (actionMsgMatch == null) {
                    break;
                }
                // Consume, since we matched
                dataIndex++;
                const startLine = parseInt(actionMsgMatch[1]) - 1;
                const startColumn = parseInt(actionMsgMatch[2]) - 1;
                const endLine = parseInt(actionMsgMatch[3]) - 1;
                const endColumn = parseInt(actionMsgMatch[4]);
                const replaceText = actionMsgMatch[5];
                // Translate data into edits
                let edit;
                if (startLine === endLine && startColumn === endColumn) {
                    // 1. Insert
                    edit = vscode_languageserver_1.TextEdit.insert(vscode_languageserver_1.Position.create(startLine, startColumn + 1), replaceText);
                }
                else if (replaceText.length === 0) {
                    // 2. Delete
                    edit = vscode_languageserver_1.TextEdit.del(vscode_languageserver_1.Range.create(startLine, startColumn, endLine, endColumn));
                }
                else {
                    // 3. Replace
                    edit = vscode_languageserver_1.TextEdit.replace(vscode_languageserver_1.Range.create(startLine, startColumn, endLine, endColumn), replaceText);
                }
                changes[uri].push(edit);
            }
            // If a fix has been processed, create a code action
            if (changes[uri].length > 0) {
                const action = vscode_languageserver_1.CodeAction.create(fixMsg, wsEdit, vscode_languageserver_1.CodeActionKind.QuickFix);
                action.diagnostics = [diagnostics[diagnostics.length - 1]];
                codeActions.push(action);
            }
        }
        return {
            diagnostics,
            codeActions
        };
    }
    /**
     * Determines whether two diagnostics are equivalent.
     *
     * @param a The first diagnostic
     * @param b The second diagnostic
     * @returns True if the diagnostics are the same. False otherwise.
     */
    isSameDiagnostic(a, b) {
        return a.code === b.code &&
            a.message === b.message &&
            a.range.start.character === b.range.start.character &&
            a.range.start.line === b.range.start.line &&
            a.range.end.character === b.range.end.character &&
            a.range.end.line === b.range.end.line &&
            a.severity === b.severity &&
            a.source === b.source;
    }
    /**
     * Checks if the given URI corresponds to a MATLAB M-file.
     *
     * @param uri - The URI of the file to check.
     * @returns True if the file is a MATLAB M-file (.m), false otherwise.
     */
    isMFile(uri) {
        return vscode_uri_1.URI.parse(uri).fsPath.endsWith(".m");
    }
}
exports.default = LintingSupportProvider;
//# sourceMappingURL=LintingSupportProvider.js.map