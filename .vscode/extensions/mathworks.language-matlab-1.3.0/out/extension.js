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
exports.deactivate = exports.sendConnectionActionNotification = exports.activate = exports.connectionStatusNotification = exports.CONNECTION_STATUS_LABELS = void 0;
const path = require("path");
const vscode = require("vscode");
const node_1 = require("vscode-languageclient/node");
const NotificationConstants_1 = require("./NotificationConstants");
const TelemetryLogger_1 = require("./telemetry/TelemetryLogger");
const MVM_1 = require("./commandwindow/MVM");
const Utilities_1 = require("./commandwindow/Utilities");
const TerminalService_1 = require("./commandwindow/TerminalService");
const Notifications_1 = require("./Notifications");
const ExecutionCommandProvider_1 = require("./commandwindow/ExecutionCommandProvider");
const LicensingUtils = require("./utils/LicensingUtils");
const DeprecationPopupService_1 = require("./DeprecationPopupService");
const SectionStylingService_1 = require("./styling/SectionStylingService");
const MatlabDebugger_1 = require("./debug/MatlabDebugger");
let client;
const OPEN_SETTINGS_ACTION = 'workbench.action.openSettings';
const MATLAB_INSTALL_PATH_SETTING = 'matlab.installPath';
exports.CONNECTION_STATUS_LABELS = {
    CONNECTED: 'MATLAB: Connected',
    NOT_CONNECTED: 'MATLAB: Not Connected',
    CONNECTING: 'MATLAB: Establishing Connection'
};
const CONNECTION_STATUS_COMMAND = 'matlab.changeMatlabConnection';
// Command to enable or disable Sign In options for MATLAB
const MATLAB_ENABLE_SIGN_IN_COMMAND = 'matlab.enableSignIn';
let telemetryLogger;
let deprecationPopupService;
let sectionStylingService;
let mvm;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let matlabDebugger;
let terminalService;
let executionCommandProvider;
function activate(context) {
    return __awaiter(this, void 0, void 0, function* () {
        // Initialize telemetry logger
        telemetryLogger = new TelemetryLogger_1.default(context.extension.packageJSON.version);
        telemetryLogger.logEvent({
            eventKey: 'ML_VS_CODE_ENVIRONMENT',
            data: {
                machine_hash: vscode.env.machineId,
                locale: vscode.env.language,
                os_platform: process.platform,
                vs_code_version: vscode.version
            }
        });
        // Set up status bar indicator
        exports.connectionStatusNotification = vscode.window.createStatusBarItem();
        exports.connectionStatusNotification.text = exports.CONNECTION_STATUS_LABELS.NOT_CONNECTED;
        exports.connectionStatusNotification.command = CONNECTION_STATUS_COMMAND;
        exports.connectionStatusNotification.show();
        context.subscriptions.push(exports.connectionStatusNotification);
        context.subscriptions.push(vscode.commands.registerCommand(CONNECTION_STATUS_COMMAND, () => handleChangeMatlabConnection()));
        // Event handler when VSCode configuration is changed by the user and executes corresponding functions for specific settings.
        context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(() => {
            var _a;
            const configuration = vscode.workspace.getConfiguration('MATLAB');
            // Updates the licensing status bar item and listeners based on the 'signIn' setting.
            if ((_a = configuration.get(LicensingUtils.LICENSING_SETTING_NAME)) !== null && _a !== void 0 ? _a : false) {
                LicensingUtils.setupLicensingListeners(client);
            }
            else {
                LicensingUtils.removeLicensingListeners();
            }
        }));
        // Set up langauge server
        const serverModule = context.asAbsolutePath(path.join('server', 'out', 'index.js'));
        const args = getServerArgs(context);
        const serverOptions = {
            run: {
                module: serverModule,
                transport: node_1.TransportKind.ipc,
                args
            },
            debug: {
                module: serverModule,
                transport: node_1.TransportKind.ipc,
                options: {
                    // --inspect=6009: runs the server in Node's Inspector mode so
                    // Visual Studio® Code can attach to the server for debugging
                    execArgv: ['--nolazy', '--inspect=6009']
                },
                args
            }
        };
        // Options to control the language client
        const clientOptions = {
            // Register the server for plain text documents
            documentSelector: ['matlab']
        };
        // Create and start the language client
        client = new node_1.LanguageClient('matlabls', 'MATLAB Language Server', serverOptions, clientOptions);
        // Set up notification listeners
        client.onNotification(Notifications_1.default.MatlabConnectionServerUpdate, (data) => handleConnectionStatusChange(data));
        client.onNotification(Notifications_1.default.MatlabLaunchFailed, () => handleMatlabLaunchFailed());
        client.onNotification(Notifications_1.default.MatlabFeatureUnavailable, () => handleFeatureUnavailable());
        client.onNotification(Notifications_1.default.MatlabFeatureUnavailableNoMatlab, () => handleFeatureUnavailableWithNoMatlab());
        client.onNotification(Notifications_1.default.LogTelemetryData, (data) => handleTelemetryReceived(data));
        const multiclientNotifier = new Utilities_1.MultiClientNotifier(client);
        mvm = new MVM_1.MVM(multiclientNotifier);
        terminalService = new TerminalService_1.default(multiclientNotifier, mvm);
        executionCommandProvider = new ExecutionCommandProvider_1.default(mvm, terminalService, telemetryLogger);
        matlabDebugger = new MatlabDebugger_1.default(mvm, multiclientNotifier, telemetryLogger);
        context.subscriptions.push(vscode.commands.registerCommand('matlab.runFile', () => __awaiter(this, void 0, void 0, function* () { return yield executionCommandProvider.handleRunFile(); })));
        context.subscriptions.push(vscode.commands.registerCommand('matlab.runSelection', () => __awaiter(this, void 0, void 0, function* () { return yield executionCommandProvider.handleRunSelection(); })));
        context.subscriptions.push(vscode.commands.registerCommand('matlab.interrupt', () => executionCommandProvider.handleInterrupt()));
        context.subscriptions.push(vscode.commands.registerCommand('matlab.openCommandWindow', () => __awaiter(this, void 0, void 0, function* () { return yield terminalService.openTerminalOrBringToFront(); })));
        context.subscriptions.push(vscode.commands.registerCommand('matlab.addFolderToPath', (uri) => __awaiter(this, void 0, void 0, function* () { return yield executionCommandProvider.handleAddFolderToPath(uri); })));
        context.subscriptions.push(vscode.commands.registerCommand('matlab.addFolderAndSubfoldersToPath', (uri) => __awaiter(this, void 0, void 0, function* () { return yield executionCommandProvider.handleAddFolderAndSubfoldersToPath(uri); })));
        context.subscriptions.push(vscode.commands.registerCommand('matlab.changeDirectory', (uri) => __awaiter(this, void 0, void 0, function* () { return yield executionCommandProvider.handleChangeDirectory(uri); })));
        context.subscriptions.push(vscode.commands.registerCommand('matlab.openFile', (uri) => __awaiter(this, void 0, void 0, function* () { return yield executionCommandProvider.handleOpenFile(uri); })));
        // Register a custom command which allows the user enable / disable Sign In options.
        // Using this custom command would be an alternative approach to going to enabling the setting.
        context.subscriptions.push(vscode.commands.registerCommand(MATLAB_ENABLE_SIGN_IN_COMMAND, () => __awaiter(this, void 0, void 0, function* () { return yield handleEnableSignIn(); })));
        // Setup listeners only if licensing workflows are enabled.
        // Any further changes to the configuration settings will be handled by configChangeListener.
        if (LicensingUtils.isSignInSettingEnabled()) {
            LicensingUtils.setupLicensingListeners(client);
        }
        deprecationPopupService = new DeprecationPopupService_1.default(context);
        deprecationPopupService.initialize(client);
        sectionStylingService = new SectionStylingService_1.default(context);
        sectionStylingService.initialize(client);
        yield client.start();
    });
}
exports.activate = activate;
/**
 * Handles enabling MATLAB licensing workflows.
 *
 * Checks if the `signIn` setting is enabled. If it is not enabled,
 * updates the setting to enable it and displays a message indicating the workflows
 * have been enabled. If it is already enabled, displays a message indicating that.
 *
 * @param context - The context in which the extension is running.
 * @returns A promise that resolves when the operation is complete.
 */
function handleEnableSignIn() {
    return __awaiter(this, void 0, void 0, function* () {
        const configuration = vscode.workspace.getConfiguration('MATLAB');
        const enable = 'Enable';
        const disable = 'Disable';
        const choices = LicensingUtils.isSignInSettingEnabled() ? [disable] : [enable];
        const choice = yield vscode.window.showQuickPick(choices, {
            placeHolder: 'Manage Sign In Options'
        });
        if (choice == null) {
            return;
        }
        if (choice === 'Enable') {
            yield configuration.update(LicensingUtils.LICENSING_SETTING_NAME, true, vscode.ConfigurationTarget.Global);
            void vscode.window.showInformationMessage('Sign In Options enabled.');
        }
        else if (choice === 'Disable') {
            yield configuration.update(LicensingUtils.LICENSING_SETTING_NAME, false, vscode.ConfigurationTarget.Global);
            void vscode.window.showInformationMessage('Sign In Options disabled.');
        }
    });
}
/**
 * Handles user input about whether to connect or disconnect from MATLAB®
 */
function handleChangeMatlabConnection() {
    const connect = 'Connect to MATLAB';
    const disconnect = 'Disconnect from MATLAB';
    const options = [connect, disconnect];
    const isSignInEnabled = LicensingUtils.isSignInSettingEnabled();
    const signOut = 'Sign Out of MATLAB';
    const isLicensed = LicensingUtils.getMinimalLicensingInfo() !== '';
    const isMatlabConnecting = exports.connectionStatusNotification.text === exports.CONNECTION_STATUS_LABELS.CONNECTING;
    // Only show signout option when signin setting is enabled, MATLAB is connected and is licensed
    if (isSignInEnabled && isLicensed && isMatlabConnected()) {
        options.push(signOut);
    }
    void vscode.window.showQuickPick(options, {
        placeHolder: 'Change MATLAB Connection'
    }).then(choice => {
        if (choice == null) {
            return;
        }
        if (choice === connect) {
            // Opens the browser tab with licensing URL.
            // This will only occur when the tab is accidentally closed by the user and wants to
            // connect to MATLAB
            if (isSignInEnabled && !isLicensed && isMatlabConnecting) {
                void client.sendNotification(Notifications_1.default.LicensingServerUrl);
            }
            sendConnectionActionNotification('connect');
        }
        else if (choice === disconnect) {
            sendConnectionActionNotification('disconnect');
            terminalService.closeTerminal();
        }
        else if (choice === signOut) {
            void client.sendNotification(Notifications_1.default.LicensingDelete);
            sendConnectionActionNotification('disconnect');
        }
    });
}
/**
 * Checks if a connection to MATLAB is currently established.
 *
 * This function determines the connection status by checking if the connection status
 * notification text includes a specific label indicating a successful connection.
 *
 * @returns `true` if MATLAB is connected, otherwise `false`.
 */
function isMatlabConnected() {
    return exports.connectionStatusNotification.text.includes(exports.CONNECTION_STATUS_LABELS.CONNECTED);
}
/**
 * Handles the notifiaction that the connection to MATLAB has changed (either has connected,
 * disconnected, or is in the process of connecting)
 *
 * @param data The notification data
 */
function handleConnectionStatusChange(data) {
    if (data.connectionStatus === 'connected') {
        exports.connectionStatusNotification.text = exports.CONNECTION_STATUS_LABELS.CONNECTED;
        const licensingInfo = LicensingUtils.getMinimalLicensingInfo();
        if (LicensingUtils.isSignInSettingEnabled() && licensingInfo !== '') {
            exports.connectionStatusNotification.text += licensingInfo;
        }
    }
    else if (data.connectionStatus === 'disconnected') {
        terminalService.closeTerminal();
        if (isMatlabConnected()) {
            const message = NotificationConstants_1.default.MATLAB_CLOSED.message;
            const options = NotificationConstants_1.default.MATLAB_CLOSED.options;
            vscode.window.showWarningMessage(message, ...options).then(choice => {
                if (choice != null) {
                    // Selected to restart MATLAB
                    telemetryLogger.logEvent({
                        eventKey: 'ML_VS_CODE_ACTIONS',
                        data: {
                            action_type: 'restartMATLAB',
                            result: ''
                        }
                    });
                    sendConnectionActionNotification('connect');
                }
            }, reject => console.error(reject));
        }
        exports.connectionStatusNotification.text = exports.CONNECTION_STATUS_LABELS.NOT_CONNECTED;
    }
    else if (data.connectionStatus === 'connecting') {
        exports.connectionStatusNotification.text = exports.CONNECTION_STATUS_LABELS.CONNECTING;
    }
}
/**
 * Handles the notification that MATLAB failed to launch successfully. This most likely indicates that
 * either MATLAB is not installed or the installPath setting is not configured correctly.
 */
function handleMatlabLaunchFailed() {
    var _a;
    const message = NotificationConstants_1.default.MATLAB_LAUNCH_FAILED.message;
    const options = NotificationConstants_1.default.MATLAB_LAUNCH_FAILED.options;
    const url = 'https://www.mathworks.com/products/get-matlab.html';
    terminalService.closeTerminal();
    const configuration = vscode.workspace.getConfiguration('MATLAB');
    const shouldShowPopup = (_a = configuration.get('showFeatureNotAvailableError')) !== null && _a !== void 0 ? _a : true;
    if (shouldShowPopup) {
        vscode.window.showErrorMessage(message, ...options).then(choice => {
            switch (choice) {
                case options[0]: // Get MATLAB
                    void vscode.env.openExternal(vscode.Uri.parse(url));
                    break;
                case options[1]: // Open settings
                    void vscode.commands.executeCommand(OPEN_SETTINGS_ACTION, MATLAB_INSTALL_PATH_SETTING);
                    break;
                case options[2]: // Do not show again
                    // Selected to not show again
                    void configuration.update('showFeatureNotAvailableError', false, true);
                    break;
            }
        }, reject => console.error(reject));
    }
}
/**
 * Handles the notification that a triggered feature is unavailable without MATLAB running
 */
function handleFeatureUnavailable() {
    var _a;
    const message = NotificationConstants_1.default.FEATURE_UNAVAILABLE.message;
    const options = NotificationConstants_1.default.FEATURE_UNAVAILABLE.options;
    terminalService.closeTerminal();
    const configuration = vscode.workspace.getConfiguration('MATLAB');
    const shouldShowPopup = (_a = configuration.get('showFeatureNotAvailableError')) !== null && _a !== void 0 ? _a : true;
    if (shouldShowPopup) {
        vscode.window.showErrorMessage(message, ...options).then(choice => {
            switch (choice) {
                case options[0]: // Get MATLAB
                    // Selected to start MATLAB
                    sendConnectionActionNotification('connect');
                    break;
                case options[1]: // Do not show again
                    // Selected to not show again
                    void configuration.update('showFeatureNotAvailableError', false, true);
                    break;
            }
        }, reject => console.error(reject));
    }
}
/**
 * Handles the notification that a triggered feature is unavailable without MATLAB running,
 * and MATLAB is also unavailable on the system.
 */
function handleFeatureUnavailableWithNoMatlab() {
    var _a;
    const message = NotificationConstants_1.default.FEATURE_UNAVAILABLE_NO_MATLAB.message;
    const options = NotificationConstants_1.default.FEATURE_UNAVAILABLE_NO_MATLAB.options;
    const url = 'https://www.mathworks.com/products/get-matlab.html';
    terminalService.closeTerminal();
    const configuration = vscode.workspace.getConfiguration('MATLAB');
    const shouldShowPopup = (_a = configuration.get('showFeatureNotAvailableError')) !== null && _a !== void 0 ? _a : true;
    if (shouldShowPopup) {
        vscode.window.showErrorMessage(message, ...options).then(choice => {
            switch (choice) {
                case options[0]: // Get MATLAB
                    void vscode.env.openExternal(vscode.Uri.parse(url));
                    break;
                case options[1]: // Open settings
                    void vscode.commands.executeCommand(OPEN_SETTINGS_ACTION, MATLAB_INSTALL_PATH_SETTING);
                    break;
                case options[2]: // Do not show again
                    // Selected to not show again
                    void configuration.update('showFeatureNotAvailableError', false, true);
            }
        }, reject => console.error(reject));
    }
}
function handleTelemetryReceived(event) {
    event.eventKey = `ML_VS_CODE_${event.eventKey}`;
    telemetryLogger.logEvent(event);
}
/**
 * Gets the arguments with which to launch the language server
 *
 * @param context The extension context
 * @returns An array of arguments
 */
function getServerArgs(context) {
    var _a, _b, _c;
    const configuration = vscode.workspace.getConfiguration('MATLAB');
    const args = [
        `--matlabInstallPath=${(_a = configuration.get('installPath')) !== null && _a !== void 0 ? _a : ''}`,
        `--matlabConnectionTiming=${(_b = configuration.get('launchMatlab')) !== null && _b !== void 0 ? _b : 'onStart'}`,
        '--snippetIgnoreList=\'For Loop;If Statement;If-Else Statement;While Loop;Try-Catch Statement;Switch Statement;Function Definition;Class Definition;Parallel For Loop;SPMD block\''
    ];
    if ((_c = configuration.get('indexWorkspace')) !== null && _c !== void 0 ? _c : false) {
        args.push('--indexWorkspace');
    }
    return args;
}
/**
 * Sends notification to language server to instruct it to either connect to or disconnect from MATLAB.
 * @param connectionAction The action - either 'connect' or 'disconnect'
 */
function sendConnectionActionNotification(connectionAction) {
    void client.sendNotification(Notifications_1.default.MatlabConnectionClientUpdate, {
        connectionAction
    });
}
exports.sendConnectionActionNotification = sendConnectionActionNotification;
// this method is called when your extension is deactivated
function deactivate() {
    return __awaiter(this, void 0, void 0, function* () {
        yield client.stop();
        void client.dispose();
    });
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map