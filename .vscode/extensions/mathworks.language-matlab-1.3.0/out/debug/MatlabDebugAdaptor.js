"use strict";
// Copyright 2024 The MathWorks, Inc.
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const debug = require("@vscode/debugadapter");
const MVM_1 = require("../commandwindow/MVM");
const Notifications_1 = require("../Notifications");
class PackagedRequest {
    constructor(request, debugAdaptorId) {
        this.debugRequest = request;
        this.tag = debugAdaptorId;
    }
}
class MatlabDebugAdaptor extends debug.DebugSession {
    constructor(mvm, notifier, baseSessionGetter, isBase) {
        super();
        this._isMatlabConnected = false;
        this._isStarted = false;
        this._mvm = mvm;
        this._notifier = notifier;
        this._baseSessionGetter = baseSessionGetter;
        this._debugAdaptorId = MatlabDebugAdaptor._nextId;
        MatlabDebugAdaptor._nextId += 1;
        this._isBase = isBase;
        this._notifier.onNotification(Notifications_1.default.DebugAdaptorResponse, this._handleResponseNotification.bind(this));
        this._notifier.onNotification(Notifications_1.default.DebugAdaptorEvent, this._handleEventNotification.bind(this));
        if (this._isBase) {
            this._setupDocumentListeners();
        }
    }
    _isLifecycleEvent(event) {
        return event.event === 'initialized' || event.event === 'exited' || event.event === 'terminate';
    }
    _handleEventNotification(packagedEvent) {
        const event = packagedEvent.debugEvent;
        if (this._isBase) {
            if (this._isLifecycleEvent(event)) {
                this.sendEvent(event);
            }
        }
        else {
            if (this._isStarted) {
                this.sendEvent(event);
            }
        }
        if (event.event === 'terminate') {
            this._isStarted = false;
        }
    }
    _handleResponseNotification(packagedResonse) {
        const response = this._unpackageResponse(packagedResonse);
        if (response !== null) {
            this.sendResponse(response);
        }
    }
    _packageRequest(request) {
        return new PackagedRequest(request, this._debugAdaptorId);
    }
    _unpackageResponse(response) {
        if (response.tag === this._debugAdaptorId) {
            return response.debugResponse;
        }
        else {
            return null;
        }
    }
    _setupDocumentListeners() {
        this._mvm.on(MVM_1.MVM.Events.stateChanged, (oldState, newState) => {
            if (oldState === newState) {
                return;
            }
            if (newState === MVM_1.MatlabState.DISCONNECTED) {
                this._isMatlabConnected = false;
            }
            else {
                if (!this._isMatlabConnected) {
                    vscode.workspace.textDocuments.forEach(this._sendCacheFilePathRequest.bind(this));
                }
                this._isMatlabConnected = true;
            }
        });
        vscode.workspace.onDidOpenTextDocument(this._sendCacheFilePathRequest.bind(this));
    }
    _sendCacheFilePathRequest(document) {
        if (!this._isMatlabConnected) {
            return;
        }
        if (document.fileName.endsWith('.m')) {
            const cacheRequest = {
                seq: -1,
                type: 'request',
                command: 'cacheFilePath',
                arguments: { fileName: document.fileName }
            };
            this.dispatchRequest(cacheRequest);
        }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sendErrorResponse(response, codeOrMessage, format, variables, dest) {
        super.sendErrorResponse(response, codeOrMessage, format, variables, dest);
    }
    dispatchRequest(request) {
        if (request.command === 'initialize') {
            this._isStarted = true;
        }
        this._notifier.sendNotification(Notifications_1.default.DebugAdaptorRequest, this._packageRequest(request));
    }
    handleDisconnect() {
        this.sendEvent(new debug.ExitedEvent(0));
        this.sendEvent(new debug.TerminatedEvent(false));
    }
}
exports.default = MatlabDebugAdaptor;
MatlabDebugAdaptor._nextId = 1;
//# sourceMappingURL=MatlabDebugAdaptor.js.map