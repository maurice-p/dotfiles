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
exports.startServer = void 0;
const vscode_languageserver_textdocument_1 = require("vscode-languageserver-textdocument");
const node_1 = require("vscode-languageserver/node");
const DocumentIndexer_1 = __importDefault(require("./indexing/DocumentIndexer"));
const WorkspaceIndexer_1 = __importDefault(require("./indexing/WorkspaceIndexer"));
const ConfigurationManager_1 = __importStar(require("./lifecycle/ConfigurationManager"));
const MatlabLifecycleManager_1 = __importDefault(require("./lifecycle/MatlabLifecycleManager"));
const Logger_1 = __importDefault(require("./logging/Logger"));
const TelemetryUtils_1 = require("./logging/TelemetryUtils");
const NotificationService_1 = __importStar(require("./notifications/NotificationService"));
const CompletionSupportProvider_1 = __importDefault(require("./providers/completion/CompletionSupportProvider"));
const FormatSupportProvider_1 = __importDefault(require("./providers/formatting/FormatSupportProvider"));
const LintingSupportProvider_1 = __importDefault(require("./providers/linting/LintingSupportProvider"));
const ExecuteCommandProvider_1 = __importStar(require("./providers/lspCommands/ExecuteCommandProvider"));
const NavigationSupportProvider_1 = __importDefault(require("./providers/navigation/NavigationSupportProvider"));
const LifecycleNotificationHelper_1 = __importDefault(require("./lifecycle/LifecycleNotificationHelper"));
const MVM_1 = __importDefault(require("./mvm/MVM"));
const FoldingSupportProvider_1 = __importDefault(require("./providers/folding/FoldingSupportProvider"));
const ClientConnection_1 = __importDefault(require("./ClientConnection"));
const PathResolver_1 = __importDefault(require("./providers/navigation/PathResolver"));
const Indexer_1 = __importDefault(require("./indexing/Indexer"));
const RenameSymbolProvider_1 = __importDefault(require("./providers/rename/RenameSymbolProvider"));
const SymbolSearchService_1 = require("./indexing/SymbolSearchService");
const ProxyUtils_1 = require("./utils/ProxyUtils");
const server_1 = require("./licensing/server");
const config_1 = require("./licensing/config");
const LicensingUtils_1 = require("./utils/LicensingUtils");
function startServer() {
    return __awaiter(this, void 0, void 0, function* () {
        (0, ProxyUtils_1.cacheAndClearProxyEnvironmentVariables)();
        // Create a connection for the server
        const connection = ClientConnection_1.default.getConnection();
        // Initialize Logger
        Logger_1.default.initialize(connection.console);
        // Instantiate services
        const pathResolver = new PathResolver_1.default();
        const matlabLifecycleManager = new MatlabLifecycleManager_1.default();
        const indexer = new Indexer_1.default(matlabLifecycleManager, pathResolver);
        const workspaceIndexer = new WorkspaceIndexer_1.default(indexer);
        const documentIndexer = new DocumentIndexer_1.default(indexer);
        const formatSupportProvider = new FormatSupportProvider_1.default(matlabLifecycleManager);
        const foldingSupportProvider = new FoldingSupportProvider_1.default(matlabLifecycleManager);
        const lintingSupportProvider = new LintingSupportProvider_1.default(matlabLifecycleManager);
        const executeCommandProvider = new ExecuteCommandProvider_1.default(lintingSupportProvider);
        const completionSupportProvider = new CompletionSupportProvider_1.default(matlabLifecycleManager);
        const navigationSupportProvider = new NavigationSupportProvider_1.default(matlabLifecycleManager, indexer, documentIndexer, pathResolver);
        const renameSymbolProvider = new RenameSymbolProvider_1.default(matlabLifecycleManager, documentIndexer);
        // Create basic text document manager
        const documentManager = new node_1.TextDocuments(vscode_languageserver_textdocument_1.TextDocument);
        let mvm;
        matlabLifecycleManager.eventEmitter.on('connected', () => {
            // Handle things after MATLAB® has launched
            // Initiate workspace indexing
            void workspaceIndexer.indexWorkspace();
            documentManager.all().forEach(textDocument => {
                // Lint the open documents
                void lintingSupportProvider.lintDocument(textDocument);
                // Index the open document
                void documentIndexer.indexDocument(textDocument);
            });
        });
        let capabilities;
        // Handles an initialization request
        connection.onInitialize((params) => {
            capabilities = params.capabilities;
            // Defines the capabilities supported by this language server
            const initResult = {
                capabilities: {
                    codeActionProvider: true,
                    completionProvider: {
                        triggerCharacters: [
                            '.',
                            '(',
                            ' ',
                            ',',
                            '/',
                            '\\' // File path
                        ]
                    },
                    definitionProvider: true,
                    documentFormattingProvider: true,
                    executeCommandProvider: {
                        commands: Object.values(ExecuteCommandProvider_1.MatlabLSCommands)
                    },
                    foldingRangeProvider: true,
                    referencesProvider: true,
                    signatureHelpProvider: {
                        triggerCharacters: ['(', ',']
                    },
                    documentSymbolProvider: true,
                    renameProvider: {
                        prepareProvider: true
                    }
                }
            };
            return initResult;
        });
        // Handles the initialized notification
        /* eslint-disable @typescript-eslint/no-explicit-any */
        connection.onInitialized(() => __awaiter(this, void 0, void 0, function* () {
            ConfigurationManager_1.default.setup(capabilities);
            // Add callbacks when settings change.
            ConfigurationManager_1.default.addSettingCallback('signIn', LicensingUtils_1.handleSignInChanged);
            ConfigurationManager_1.default.addSettingCallback('installPath', LicensingUtils_1.handleInstallPathSettingChanged);
            const configuration = yield ConfigurationManager_1.default.getConfiguration();
            // If "signIn" setting is checked, setup notification listeners for it.
            if (configuration.signIn) {
                yield (0, LicensingUtils_1.setupLicensingNotificationListenersAndUpdateClient)(matlabLifecycleManager);
                // If installPath setting is not empty, update installPath in licensing config required for its workflows.
                if (configuration.installPath !== '') {
                    (0, config_1.setInstallPath)(configuration.installPath);
                }
            }
            workspaceIndexer.setupCallbacks(capabilities);
            mvm = new MVM_1.default(NotificationService_1.default, matlabLifecycleManager);
            void startMatlabIfOnStartLaunch();
        }));
        function startMatlabIfOnStartLaunch() {
            return __awaiter(this, void 0, void 0, function* () {
                // Launch MATLAB if it should be launched early
                const connectionTiming = (yield ConfigurationManager_1.default.getConfiguration()).matlabConnectionTiming;
                if (connectionTiming === ConfigurationManager_1.ConnectionTiming.OnStart) {
                    void matlabLifecycleManager.connectToMatlab().catch(reason => {
                        Logger_1.default.error(`MATLAB onStart connection failed: ${reason}`);
                    });
                }
            });
        }
        // Handles a shutdown request
        connection.onShutdown(() => __awaiter(this, void 0, void 0, function* () {
            // Shut down MATLAB
            matlabLifecycleManager.disconnectFromMatlab();
            // If licensing workflows are enabled, shutdown the licensing server too.
            if ((yield ConfigurationManager_1.default.getConfiguration()).signIn) {
                (0, server_1.stopLicensingServer)();
            }
        }));
        // Set up connection notification listeners
        NotificationService_1.default.registerNotificationListener(NotificationService_1.Notification.MatlabConnectionClientUpdate, (data) => {
            switch (data.connectionAction) {
                case 'connect':
                    void matlabLifecycleManager.connectToMatlab().catch(reason => {
                        Logger_1.default.error(`Connection request failed: ${reason}`);
                    });
                    break;
                case 'disconnect':
                    matlabLifecycleManager.disconnectFromMatlab();
            }
        });
        // Set up MATLAB startup request listener
        NotificationService_1.default.registerNotificationListener(NotificationService_1.Notification.MatlabRequestInstance, () => __awaiter(this, void 0, void 0, function* () {
            const matlabConnection = yield matlabLifecycleManager.getMatlabConnection(true);
            if (matlabConnection === null) {
                LifecycleNotificationHelper_1.default.notifyMatlabRequirement();
            }
        }));
        // Handles files opened
        documentManager.onDidOpen(params => {
            reportFileOpened(params.document);
            void lintingSupportProvider.lintDocument(params.document);
            void documentIndexer.indexDocument(params.document);
        });
        documentManager.onDidClose(params => {
            lintingSupportProvider.clearDiagnosticsForDocument(params.document);
        });
        // Handles files saved
        documentManager.onDidSave(params => {
            void lintingSupportProvider.lintDocument(params.document);
        });
        // Handles changes to the text document
        documentManager.onDidChangeContent(params => {
            if (matlabLifecycleManager.isMatlabConnected()) {
                // Only want to lint on content changes when linting is being backed by MATLAB
                lintingSupportProvider.queueLintingForDocument(params.document);
                documentIndexer.queueIndexingForDocument(params.document);
            }
        });
        // Handle execute command requests
        connection.onExecuteCommand(params => {
            void executeCommandProvider.handleExecuteCommand(params, documentManager);
        });
        /** -------------------- COMPLETION SUPPORT -------------------- **/
        connection.onCompletion((params) => __awaiter(this, void 0, void 0, function* () {
            // Gather a list of possible completions to be displayed by the IDE
            return yield completionSupportProvider.handleCompletionRequest(params, documentManager);
        }));
        connection.onSignatureHelp((params) => __awaiter(this, void 0, void 0, function* () {
            // Gather a list of possible function signatures to be displayed by the IDE
            return yield completionSupportProvider.handleSignatureHelpRequest(params, documentManager);
        }));
        /** -------------------- FOLDING SUPPORT -------------------- **/
        connection.onFoldingRanges((params) => __awaiter(this, void 0, void 0, function* () {
            // Retrieve the folding ranges
            // If there are valid folding ranges, hand them back to the IDE
            // Else, return null, so the IDE falls back to indent-based folding
            return yield foldingSupportProvider.handleFoldingRangeRequest(params, documentManager);
        }));
        /** -------------------- FORMATTING SUPPORT -------------------- **/
        connection.onDocumentFormatting((params) => __awaiter(this, void 0, void 0, function* () {
            // Gather a set of document edits required for formatting, which the IDE will execute
            return yield formatSupportProvider.handleDocumentFormatRequest(params, documentManager);
        }));
        /** --------------------  LINTING SUPPORT   -------------------- **/
        connection.onCodeAction(params => {
            // Retrieve a list of possible code actions to be displayed by the IDE
            return lintingSupportProvider.handleCodeActionRequest(params);
        });
        /** --------------------  NAVIGATION SUPPORT   -------------------- **/
        connection.onDefinition((params) => __awaiter(this, void 0, void 0, function* () {
            return yield navigationSupportProvider.handleDefOrRefRequest(params, documentManager, SymbolSearchService_1.RequestType.Definition);
        }));
        connection.onReferences((params) => __awaiter(this, void 0, void 0, function* () {
            return yield navigationSupportProvider.handleDefOrRefRequest(params, documentManager, SymbolSearchService_1.RequestType.References);
        }));
        connection.onDocumentSymbol((params) => __awaiter(this, void 0, void 0, function* () {
            return yield navigationSupportProvider.handleDocumentSymbol(params, documentManager, SymbolSearchService_1.RequestType.DocumentSymbol);
        }));
        // Start listening to open/change/close text document events
        documentManager.listen(connection);
        /** --------------------  RENAME SUPPORT   -------------------- **/
        connection.onPrepareRename((params) => __awaiter(this, void 0, void 0, function* () {
            return yield renameSymbolProvider.prepareRename(params, documentManager);
        }));
        connection.onRenameRequest((params) => __awaiter(this, void 0, void 0, function* () {
            return yield renameSymbolProvider.handleRenameRequest(params, documentManager);
        }));
    });
}
exports.startServer = startServer;
/** -------------------- Helper Functions -------------------- **/
function reportFileOpened(document) {
    const roughSize = Math.ceil(document.getText().length / 1024); // in KB
    (0, TelemetryUtils_1.reportTelemetryAction)(TelemetryUtils_1.Actions.OpenFile, roughSize.toString());
}
//# sourceMappingURL=server.js.map