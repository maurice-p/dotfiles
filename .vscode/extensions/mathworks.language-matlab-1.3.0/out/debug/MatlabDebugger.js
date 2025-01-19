"use strict";
// Copyright 2024 The MathWorks, Inc.
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
const vscode = require("vscode");
const MVM_1 = require("../commandwindow/MVM");
const MatlabDebugAdaptor_1 = require("./MatlabDebugAdaptor");
const Notifications_1 = require("../Notifications");
class MatlabDebugger {
    constructor(mvm, notifier, telemetryLogger) {
        this._isDebugAdaptorStarted = false;
        this._baseDebugSession = null;
        this._activeSessions = new Set();
        this._hasSentNotification = false;
        this._mvm = mvm;
        this._notifier = notifier;
        this._telemetryLogger = telemetryLogger;
        this._baseDebugAdaptor = new MatlabDebugAdaptor_1.default(mvm, notifier, this._getBaseDebugSession.bind(this), true);
        this._nestedDebugAdaptor = new MatlabDebugAdaptor_1.default(mvm, notifier, this._getBaseDebugSession.bind(this), false);
        this._initialize();
        vscode.workspace.onDidChangeConfiguration((event) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            if (event.affectsConfiguration('MATLAB.startDebuggerAutomatically')) {
                const shouldAutoStart = (_b = yield ((_a = vscode.workspace.getConfiguration('MATLAB')) === null || _a === void 0 ? void 0 : _a.get('startDebuggerAutomatically'))) !== null && _b !== void 0 ? _b : true;
                if (shouldAutoStart && this._mvm.getMatlabState() !== MVM_1.MatlabState.DISCONNECTED) {
                    void this._getBaseDebugSession(false);
                }
                else {
                    if (!this._mvm.isDebugging()) {
                        this._baseDebugAdaptor.handleDisconnect();
                        if (this._baseDebugSession != null) {
                            void vscode.debug.stopDebugging(this._baseDebugSession);
                            this._baseDebugSession = null;
                            this._isDebugAdaptorStarted = false;
                        }
                    }
                }
            }
        }));
    }
    _getBaseDebugSession(dontAutoStart) {
        return __awaiter(this, void 0, void 0, function* () {
            if (dontAutoStart) {
                return this._baseDebugSession;
            }
            if (this._mvm.getMatlabState() === MVM_1.MatlabState.DISCONNECTED) {
                throw new Error('No base debugging session exists');
            }
            if (this._baseDebugSession != null) {
                return this._baseDebugSession;
            }
            yield this._startBaseSession();
            if (this._baseDebugSession === null) {
                throw new Error('No base debugging session exists');
            }
            return this._baseDebugSession;
        });
    }
    _startBaseSession() {
        return __awaiter(this, void 0, void 0, function* () {
            yield vscode.debug.startDebugging(undefined, {
                name: 'base matlab',
                type: 'matlab',
                request: 'launch'
            }, {
                debugUI: { simple: true }
            });
        });
    }
    _initialize() {
        vscode.debug.registerDebugConfigurationProvider('matlab', {
            resolveDebugConfiguration(folder, config, token) {
                config.name = 'matlab';
                config.type = 'matlab';
                config.request = 'launch';
                return config;
            }
        });
        const baseDebugAdaptor = this._baseDebugAdaptor;
        const nestedDebugAdaptor = this._nestedDebugAdaptor;
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const matlabDebugger = this;
        vscode.debug.registerDebugAdapterDescriptorFactory('matlab', {
            createDebugAdapterDescriptor(_session) {
                if (matlabDebugger._baseDebugSession == null) {
                    return new vscode.DebugAdapterInlineImplementation(baseDebugAdaptor);
                }
                else {
                    return new vscode.DebugAdapterInlineImplementation(nestedDebugAdaptor);
                }
            }
        });
        vscode.debug.onDidStartDebugSession((session) => __awaiter(this, void 0, void 0, function* () {
            if (session.type !== 'matlab') {
                return;
            }
            this._activeSessions.add(session);
            session.name = 'MATLAB';
            const isInvalidToStartSession = (yield vscode.workspace.getConfiguration('MATLAB').get('matlabConnectionTiming')) === 'never';
            if (isInvalidToStartSession && this._mvm.getMatlabState() === MVM_1.MatlabState.DISCONNECTED) {
                void vscode.debug.stopDebugging(session);
                return;
            }
            this._notifier.sendNotification(Notifications_1.default.MatlabRequestInstance);
            if (this._baseDebugSession == null) {
                this._baseDebugSession = session;
            }
            else {
                if (!this._mvm.isDebugging()) {
                    void vscode.debug.stopDebugging(session);
                }
            }
        }));
        vscode.debug.onDidTerminateDebugSession((session) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            this._activeSessions.delete(session);
            if (session === this._baseDebugSession) {
                this._baseDebugSession = null;
            }
            else {
                this._isDebugAdaptorStarted = false;
            }
            if (this._mvm.getMatlabState() !== MVM_1.MatlabState.DISCONNECTED) {
                const shouldAutoStart = (_b = yield ((_a = vscode.workspace.getConfiguration('MATLAB')) === null || _a === void 0 ? void 0 : _a.get('startDebuggerAutomatically'))) !== null && _b !== void 0 ? _b : true;
                if (shouldAutoStart) {
                    void this._getBaseDebugSession(false);
                }
            }
        }));
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        this._mvm.on(MVM_1.MVM.Events.stateChanged, this._handleMvmStateChange.bind(this));
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        this._mvm.on(MVM_1.MVM.Events.debuggingStateChanged, this._handleMatlabDebuggingStateChange.bind(this));
    }
    _handleMvmStateChange(oldState, newState) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            if (newState === MVM_1.MatlabState.READY && oldState === MVM_1.MatlabState.DISCONNECTED) {
                void vscode.commands.executeCommand('setContext', 'matlab.isDebugging', false);
                const shouldAutoStart = (_b = yield ((_a = vscode.workspace.getConfiguration('MATLAB')) === null || _a === void 0 ? void 0 : _a.get('startDebuggerAutomatically'))) !== null && _b !== void 0 ? _b : true;
                if (shouldAutoStart) {
                    void this._getBaseDebugSession(false);
                }
            }
            else if (newState === MVM_1.MatlabState.DISCONNECTED) {
                void vscode.commands.executeCommand('setContext', 'matlab.isDebugging', false);
                this._baseDebugAdaptor.handleDisconnect();
                this._activeSessions.forEach((session) => {
                    void vscode.debug.stopDebugging(session);
                });
                this._isDebugAdaptorStarted = false;
            }
        });
    }
    _handleMatlabDebuggingStateChange(isDebugging) {
        return __awaiter(this, void 0, void 0, function* () {
            void vscode.commands.executeCommand('setContext', 'matlab.isDebugging', isDebugging);
            if (!isDebugging) {
                return;
            }
            const shouldReact = yield this._shouldReactToDebugEvent();
            const isStillDebugging = this._mvm.isDebugging();
            if (shouldReact && isStillDebugging) {
                void this._maybeStartDebugger();
            }
        });
    }
    _maybeStartDebugger() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (this._isDebugAdaptorStarted) {
                return;
            }
            if (!this._hasSentNotification) {
                this._hasSentNotification = true;
                this._telemetryLogger.logEvent({
                    eventKey: 'ML_VS_CODE_ACTIONS',
                    data: {
                        action_type: 'debuggerStarted',
                        result: ''
                    }
                });
            }
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const baseSession = (_a = this._baseDebugSession) !== null && _a !== void 0 ? _a : undefined;
            const wasDebuggerStartSuccessful = yield vscode.debug.startDebugging(undefined, {
                name: 'matlab',
                type: 'matlab',
                request: 'launch'
            }, {
                parentSession: baseSession,
                compact: true,
                suppressDebugStatusbar: false,
                suppressDebugToolbar: false,
                suppressDebugView: false
            });
            this._isDebugAdaptorStarted = wasDebuggerStartSuccessful;
        });
    }
    _shouldReactToDebugEvent() {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const shouldAutoStart = (_b = yield ((_a = vscode.workspace.getConfiguration('MATLAB')) === null || _a === void 0 ? void 0 : _a.get('startDebuggerAutomatically'))) !== null && _b !== void 0 ? _b : true;
            if (!shouldAutoStart) {
                const baseSession = yield this._getBaseDebugSession(true);
                if (baseSession === null) {
                    return false;
                }
            }
            return true;
        });
    }
}
exports.default = MatlabDebugger;
//# sourceMappingURL=MatlabDebugger.js.map