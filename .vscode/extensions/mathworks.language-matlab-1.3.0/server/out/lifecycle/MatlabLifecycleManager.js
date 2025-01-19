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
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const ConfigurationManager_1 = __importStar(require("./ConfigurationManager"));
const MatlabSession_1 = require("./MatlabSession");
class MatlabLifecycleManager {
    constructor() {
        this.eventEmitter = new events_1.EventEmitter();
        this.matlabSession = null;
        this.connectionPromise = null;
    }
    /**
     * Gets the current connection to MATLAB.
     *
     * @param startMatlab If no existing MATLAB connection exists, this determines whether
     * a new connection should be established. If true, this will attempt to establish a
     * new connection. If false, it will not and will return null.
     *
     * @returns The MATLAB connection object, or null if no connection exists.
     */
    getMatlabConnection(startMatlab = false) {
        return __awaiter(this, void 0, void 0, function* () {
            // If MATLAB is already connected, return the current connection
            if (this.matlabSession != null) {
                return this.matlabSession.getConnection();
            }
            // If MATLAB is actively connecting, wait for the connection to be established
            if (this.connectionPromise != null) {
                return new Promise(resolve => {
                    this.connectionPromise.then(matlabSession => {
                        resolve(matlabSession.getConnection());
                    }).catch(() => {
                        resolve(null);
                    });
                });
            }
            // No connection currently established or establishing. Attempt to connect to MATLAB if desired.
            const matlabConnectionTiming = (yield ConfigurationManager_1.default.getConfiguration()).matlabConnectionTiming;
            const shouldStartMatlab = startMatlab && matlabConnectionTiming !== ConfigurationManager_1.ConnectionTiming.Never;
            if (shouldStartMatlab) {
                try {
                    const matlabSession = yield this.connectToMatlab();
                    return matlabSession.getConnection();
                }
                catch (err) {
                    return null;
                }
            }
            else {
                return null;
            }
        });
    }
    /**
     * Attempt to connect to MATLAB. This will not create a second connection to MATLAB
     * if a session already exists.
     *
     * @returns The active MATLAB session
     */
    connectToMatlab() {
        return __awaiter(this, void 0, void 0, function* () {
            // If MATLAB is already connected, do not try to connect again
            if (this.matlabSession != null) {
                return this.matlabSession;
            }
            // If MATLAB is actively connecting, wait and return that session
            if (this.connectionPromise != null) {
                // MATLAB is actively connecting
                return new Promise((resolve, reject) => {
                    this.connectionPromise.then(matlabSession => {
                        resolve(matlabSession);
                    }).catch(reason => {
                        reject(reason);
                    });
                });
            }
            // Start a new session
            if (shouldConnectToRemoteMatlab()) {
                return this.connectToRemoteMatlab();
            }
            else {
                return this.connectToLocalMatlab();
            }
        });
    }
    /**
     * Terminate the current MATLAB session.
     *
     * Emits a 'disconnected' event.
     */
    disconnectFromMatlab() {
        if (this.matlabSession == null) {
            return;
        }
        this.matlabSession.shutdown();
        this.matlabSession = null;
        this.eventEmitter.emit('disconnected');
    }
    /**
     * Determine if MATLAB is connected.
     *
     * @returns True if there is an active MATLAB session, false otherwise
     */
    isMatlabConnected() {
        return this.matlabSession != null || this.connectionPromise != null;
    }
    /**
     * Gets the release of the currently connected MATLAB.
     *
     * @returns The MATLAB release (e.g. "R2023b") of the active session, or null if unknown
     */
    getMatlabRelease() {
        return this.matlabSession == null ? null : this.matlabSession.getMatlabRelease();
    }
    /**
     * Starts a new session with a locally installed MATLAB instance.
     *
     * @returns The new MATLAB session
     */
    connectToLocalMatlab() {
        return __awaiter(this, void 0, void 0, function* () {
            this.connectionPromise = (0, MatlabSession_1.launchNewMatlab)(this);
            return new Promise((resolve, reject) => {
                var _a;
                (_a = this.connectionPromise) === null || _a === void 0 ? void 0 : _a.then(matlabSession => {
                    this.matlabSession = matlabSession;
                    this.matlabSession.eventEmitter.on('shutdown', () => {
                        this.matlabSession = null;
                        this.eventEmitter.emit('disconnected');
                    });
                    this.eventEmitter.emit('connected');
                    resolve(matlabSession);
                }).catch(reason => {
                    reject(reason);
                }).finally(() => {
                    this.connectionPromise = null;
                });
            });
        });
    }
    /**
     * Starts a new session with a MATLAB instance over a URL.
     *
     * @returns The new MATLAB session
     */
    connectToRemoteMatlab() {
        return __awaiter(this, void 0, void 0, function* () {
            const url = ConfigurationManager_1.default.getArgument(ConfigurationManager_1.Argument.MatlabUrl);
            this.connectionPromise = (0, MatlabSession_1.connectToMatlab)(url);
            return new Promise((resolve, reject) => {
                var _a;
                (_a = this.connectionPromise) === null || _a === void 0 ? void 0 : _a.then(matlabSession => {
                    this.matlabSession = matlabSession;
                    this.matlabSession.eventEmitter.on('shutdown', () => {
                        this.matlabSession = null;
                        this.eventEmitter.emit('disconnected');
                    });
                    this.eventEmitter.emit('connected');
                    resolve(matlabSession);
                }).catch(reason => {
                    reject(reason);
                }).finally(() => {
                    this.connectionPromise = null;
                });
            });
        });
    }
}
exports.default = MatlabLifecycleManager;
/**
 * Whether or not the language server should attempt to connect to an existing
 * MATLAB instance.
 *
 * @returns True if the language server should attempt to connect to an
 * already-running instance of MATLAB. False otherwise.
 */
function shouldConnectToRemoteMatlab() {
    // Assume we should connect to existing MATLAB if the matlabUrl startup flag has been provided
    return Boolean(ConfigurationManager_1.default.getArgument(ConfigurationManager_1.Argument.MatlabUrl));
}
//# sourceMappingURL=MatlabLifecycleManager.js.map