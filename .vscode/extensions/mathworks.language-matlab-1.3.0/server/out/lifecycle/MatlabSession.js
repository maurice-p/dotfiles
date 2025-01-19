"use strict";
// Copyright 2024 The MathWorks, Inc.
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
exports.connectToMatlab = exports.launchNewMatlab = exports.ConnectionState = void 0;
const Logger_1 = __importDefault(require("../logging/Logger"));
const TelemetryUtils_1 = require("../logging/TelemetryUtils");
const NotificationService_1 = __importStar(require("../notifications/NotificationService"));
const ConfigurationManager_1 = __importStar(require("./ConfigurationManager"));
const LifecycleNotificationHelper_1 = __importDefault(require("./LifecycleNotificationHelper"));
const MatlabCommunicationManager_1 = __importStar(require("./MatlabCommunicationManager"));
const chokidar = __importStar(require("chokidar"));
const fsPromises = __importStar(require("fs/promises"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const events_1 = require("events");
const DeprecationUtils_1 = require("../utils/DeprecationUtils");
const ProxyUtils_1 = require("../utils/ProxyUtils");
const licensing_1 = __importDefault(require("../licensing"));
const server_1 = require("../licensing/server");
const config_1 = require("../licensing/config");
var ConnectionState;
(function (ConnectionState) {
    ConnectionState["CONNECTING"] = "connecting";
    ConnectionState["CONNECTED"] = "connected";
    ConnectionState["DISCONNECTED"] = "disconnected";
})(ConnectionState = exports.ConnectionState || (exports.ConnectionState = {}));
/**
 * Launches and connects to a new MATLAB instance.
 *
 * @returns The MATLAB session
 */
function launchNewMatlab(matlabLifecycleManager) {
    return __awaiter(this, void 0, void 0, function* () {
        LifecycleNotificationHelper_1.default.didMatlabLaunchFail = false;
        LifecycleNotificationHelper_1.default.notifyConnectionStatusChange(ConnectionState.CONNECTING);
        let environmentVariables = {};
        // Trigger licensing workflows if required
        const configuration = yield ConfigurationManager_1.default.getConfiguration();
        if (configuration.signIn) {
            const licensing = new licensing_1.default();
            if (!licensing.isLicensed()) {
                const url = yield (0, server_1.startLicensingServer)(config_1.staticFolderPath, matlabLifecycleManager);
                // If there's no cached licensing, start licensing server and send the url to the client
                NotificationService_1.default.sendNotification(NotificationService_1.Notification.LicensingServerUrl, url);
                NotificationService_1.default.sendNotification(NotificationService_1.Notification.LicensingData, licensing.getMinimalLicensingInfo());
                return new Promise((resolve) => {
                    // Setup a onetime event listener for starting matlab session with licensing environment variables.
                    // The 'StartLicensedMatlab' event will be fired by the licensing server after licensing is successful.
                    // eslint-disable-next-line @typescript-eslint/no-misused-promises
                    matlabLifecycleManager.eventEmitter.once('StartLicensedMatlab', () => __awaiter(this, void 0, void 0, function* () {
                        // Gather the environment variables specific to licensing and pass it on for MATLAB launch.
                        environmentVariables = yield licensing.setupEnvironmentVariables();
                        resolve(yield startMatlabSession(environmentVariables));
                    }));
                });
            }
            else {
                // Found cached licensing, so just marshal environment variables and pass it on for MATLAB launch.
                NotificationService_1.default.sendNotification(NotificationService_1.Notification.LicensingData, licensing.getMinimalLicensingInfo());
                environmentVariables = yield licensing.setupEnvironmentVariables();
                return yield startMatlabSession(environmentVariables);
            }
        }
        else {
            // Licensing workflows are not enabled, so start MATLAB as before.
            return yield startMatlabSession(environmentVariables);
        }
    });
}
exports.launchNewMatlab = launchNewMatlab;
/**
 * Starts a MATLAB session with the given environment variables.
 *
 * @param environmentVariables - The environment variables to be used when launching MATLAB.
 * @returns A promise that resolves to a MatlabSession object when MATLAB is successfully started and connected.
 * @throws Will reject the promise if there is an error in launching MATLAB or establishing the connection.
 */
function startMatlabSession(environmentVariables) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            // Setup file watch for MATLAB starting
            const outFile = path.join(Logger_1.default.logDir, 'matlabls_conn.json');
            const matlabSession = new LocalMatlabSession();
            const watcher = chokidar.watch(outFile, {
                persistent: true,
                useFsEvents: false
            });
            // This callback will be triggered when MATLAB has launched and writes the watched file.
            watcher.on('add', () => __awaiter(this, void 0, void 0, function* () {
                Logger_1.default.log(`Started MATLAB (session ${matlabSession.sessionId})`);
                // First change detected - close watcher
                watcher.close();
                // Read startup info from file
                const connectionInfo = yield readStartupInfo(outFile);
                const { pid, release, port, certFile, sessionKey } = connectionInfo;
                // Check if the launched MATLAB is supported. We do not abort the connection, as this may
                // be the user's desire and some functionality may work (althought it is not guaranteed).
                (0, DeprecationUtils_1.checkIfMatlabDeprecated)(release);
                matlabSession.startConnection(port, certFile, pid, release).then(() => {
                    LifecycleNotificationHelper_1.default.notifyConnectionStatusChange(ConnectionState.CONNECTED);
                    Logger_1.default.log(`MATLAB session ${matlabSession.sessionId} connected to ${release}`);
                    (0, TelemetryUtils_1.reportTelemetryAction)(TelemetryUtils_1.Actions.StartMatlab, release);
                    (0, TelemetryUtils_1.reportTelemetryAction)(TelemetryUtils_1.Actions.MatlabSessionKey, sessionKey);
                    resolve(matlabSession);
                }).catch(reason => {
                    Logger_1.default.error(`MATLAB session ${matlabSession.sessionId} failed to connect`);
                    matlabSession.shutdown();
                    (0, TelemetryUtils_1.reportTelemetryAction)(TelemetryUtils_1.Actions.StartMatlab, 'Failed to connect to MATLAB');
                    reject(reason);
                });
                // outFile is no longer needed - delete
                void fsPromises.rm(outFile, { force: true });
            }));
            // Launch MATLAB process
            Logger_1.default.log('Launching MATLAB...');
            const { command, args } = yield getMatlabLaunchCommand(outFile);
            const envVars = Object.assign(Object.assign({}, environmentVariables), (0, ProxyUtils_1.getProxyEnvironmentVariables)() // Proxy specific environment variables.
            );
            const matlabProcessInfo = MatlabCommunicationManager_1.default.launchNewMatlab(command, args, Logger_1.default.logDir, envVars);
            if (matlabProcessInfo == null) {
                // Error occurred while spawning MATLAB process
                matlabSession.shutdown('Error spawning MATLAB process');
                watcher.close();
                Logger_1.default.error(`Error launching MATLAB with command: ${command}`);
                LifecycleNotificationHelper_1.default.didMatlabLaunchFail = true;
                NotificationService_1.default.sendNotification(NotificationService_1.Notification.MatlabLaunchFailed);
                reject('Failed to launch local MATLAB');
                return;
            }
            // Initialize the new session
            const { matlabConnection, matlabProcess } = matlabProcessInfo;
            matlabSession.initialize(matlabConnection, matlabProcess);
            // Handles additional errors with launching the MATLAB process
            matlabProcess === null || matlabProcess === void 0 ? void 0 : matlabProcess.on('error', error => {
                reject('Error from MATLAB child process');
                // Error occurred in child process
                matlabSession.shutdown('Error launching MATLAB');
                watcher.close();
                Logger_1.default.error(`Error launching MATLAB: (${error.name}) ${error.message}`);
                if (error.stack != null) {
                    Logger_1.default.error(`Error stack:\n${error.stack}`);
                }
                LifecycleNotificationHelper_1.default.didMatlabLaunchFail = true;
                NotificationService_1.default.sendNotification(NotificationService_1.Notification.MatlabLaunchFailed);
            });
            // Handles the MATLAB process being terminated unexpectedly/externally.
            // This could include the user killing the process.
            matlabProcess.on('close', () => {
                // Close connection
                reject('MATLAB process terminated unexpectedly');
                Logger_1.default.log(`MATLAB process (session ${matlabSession.sessionId}) terminated`);
                matlabSession.shutdown();
            });
        }));
    });
}
/**
 * Connects to a MATLAB instance over the given URL.
 *
 * @param url The URL at which to find MATLAB
 *
 * @returns The MATLAB session
 */
function connectToMatlab(url) {
    return __awaiter(this, void 0, void 0, function* () {
        LifecycleNotificationHelper_1.default.notifyConnectionStatusChange(ConnectionState.CONNECTING);
        const matlabSession = new RemoteMatlabSession();
        const matlabConnection = yield MatlabCommunicationManager_1.default.connectToExistingMatlab(url);
        matlabSession.initialize(matlabConnection);
        yield matlabSession.startConnection();
        return matlabSession;
    });
}
exports.connectToMatlab = connectToMatlab;
let sessionIdCt = 1;
class AbstractMatlabSession {
    constructor() {
        this.sessionId = sessionIdCt++;
        this.eventEmitter = new events_1.EventEmitter();
        this.isValid = true;
    }
    getConnection() {
        var _a;
        return (_a = this.matlabConnection) !== null && _a !== void 0 ? _a : null;
    }
    getMatlabRelease() {
        var _a;
        return (_a = this.matlabRelease) !== null && _a !== void 0 ? _a : null;
    }
    notifyConnectionStatusChange(status) {
        if (this.isValid) {
            // Only sent notifications about status changes for valid
            // sessions, to avoid potential poor interactions between
            // a session shutting down and a new session starting.
            LifecycleNotificationHelper_1.default.notifyConnectionStatusChange(status);
        }
    }
}
/**
 * Represents a session with a locally installed MATLAB.
 */
class LocalMatlabSession extends AbstractMatlabSession {
    initialize(matlabConnection, matlabProcess) {
        this.matlabConnection = matlabConnection;
        this.matlabProcess = matlabProcess;
        this.setupListeners();
    }
    /**
     * Instantiates the connection with MATLAB.
     *
     * @param port MATLAB's secure port number
     * @param certFile The file location for MATLAB's self-signed certificate
     * @param matlabPid MATLAB's process ID
     * @param matlabRelease The MATLAB release
     */
    startConnection(port, certFile, matlabPid, matlabRelease) {
        return __awaiter(this, void 0, void 0, function* () {
            this.matlabPid = matlabPid;
            this.matlabRelease = matlabRelease;
            if (this.matlabConnection == null) {
                Logger_1.default.error('Attempting to start connection to MATLAB without first initializing');
                return Promise.reject('LocalMatlabSession not initialized');
            }
            return this.matlabConnection.initialize(port, certFile);
        });
    }
    shutdown(shutdownMessage) {
        var _a, _b;
        if (!this.isValid) {
            // Don't attempt to shut down more than once
            return;
        }
        Logger_1.default.log(`Shutting down MATLAB session ${this.sessionId}`);
        // Report shutdown
        this.notifyConnectionStatusChange(ConnectionState.DISCONNECTED);
        (0, TelemetryUtils_1.reportTelemetryAction)(TelemetryUtils_1.Actions.ShutdownMatlab, shutdownMessage);
        this.eventEmitter.emit('shutdown');
        this.isValid = false;
        // Close the connection and kill MATLAB process
        if (os.platform() === 'win32' && this.matlabPid != null) {
            // Need to kill MATLAB's child process which is launched on Windows
            try {
                process.kill(this.matlabPid, 'SIGTERM');
            }
            catch (_c) {
                Logger_1.default.warn('Unable to kill MATLAB child process - child process already killed');
            }
        }
        (_a = this.matlabConnection) === null || _a === void 0 ? void 0 : _a.close();
        try {
            (_b = this.matlabProcess) === null || _b === void 0 ? void 0 : _b.kill('SIGTERM');
        }
        catch (_d) {
            Logger_1.default.warn('Unable to kill MATLAB process - process already killed');
        }
    }
    setupListeners() {
        var _a, _b, _c;
        // Handle messages from MATLAB's standard err channel. Because MATLAB is launched
        // with the -log flag, all of MATLAB's output is pushed through stderr. Write this
        // to a log file
        (_b = (_a = this.matlabProcess) === null || _a === void 0 ? void 0 : _a.stderr) === null || _b === void 0 ? void 0 : _b.on('data', data => {
            const stderrStr = data.toString().trim();
            Logger_1.default.writeMatlabLog(stderrStr);
        });
        // Set up lifecycle listener
        (_c = this.matlabConnection) === null || _c === void 0 ? void 0 : _c.setLifecycleListener(lifecycleEvent => {
            if (lifecycleEvent === MatlabCommunicationManager_1.LifecycleEventType.DISCONNECTED) {
                Logger_1.default.warn('Error while communicating with MATLAB - disconnecting');
                this.shutdown('Error while communicating with MATLAB');
            }
        });
    }
}
/**
 * Represents a session with a (potentially) remote MATLAB instance over a URL.
 */
class RemoteMatlabSession extends AbstractMatlabSession {
    initialize(matlabConnection) {
        this.matlabConnection = matlabConnection;
        this.setupListeners();
    }
    /**
     * Instantiates the connection with MATLAB.
     */
    startConnection() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (this.matlabConnection == null) {
                Logger_1.default.error('Attempting to start connection to MATLAB without first initializing');
                return Promise.reject('RemoteMatlabSession not initialized');
            }
            return (_a = this.matlabConnection) === null || _a === void 0 ? void 0 : _a.initialize();
        });
    }
    shutdown(shutdownMessage) {
        var _a;
        if (!this.isValid) {
            // Don't attempt to shut down more than once
            return;
        }
        // Report shutdown
        this.notifyConnectionStatusChange(ConnectionState.DISCONNECTED);
        (0, TelemetryUtils_1.reportTelemetryAction)(TelemetryUtils_1.Actions.ShutdownMatlab, shutdownMessage);
        this.eventEmitter.emit('shutdown');
        this.isValid = false;
        // Close the connection
        (_a = this.matlabConnection) === null || _a === void 0 ? void 0 : _a.close();
    }
    setupListeners() {
        var _a;
        (_a = this.matlabConnection) === null || _a === void 0 ? void 0 : _a.setLifecycleListener(lifecycleEvent => {
            if (lifecycleEvent === MatlabCommunicationManager_1.LifecycleEventType.CONNECTED) {
                this.notifyConnectionStatusChange(ConnectionState.CONNECTED);
            }
            else if (lifecycleEvent === MatlabCommunicationManager_1.LifecycleEventType.DISCONNECTED) {
                this.shutdown('Remote MATLAB disconnected');
            }
        });
    }
}
/**
 * Reads the startup info generated by MATLAB when it is launched.
 *
 * @param file The file from which to read
 * @returns The MATLAB startup info
 */
function readStartupInfo(file) {
    return __awaiter(this, void 0, void 0, function* () {
        const data = yield fsPromises.readFile(file);
        return JSON.parse(data.toString());
    });
}
/**
 * Gets the command with which MATLAB should be launched.
 *
 * @param outFile The file in which MATLAB should output connection details
 * @returns The MATLAB launch command and arguments
 */
function getMatlabLaunchCommand(outFile) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const matlabInstallPath = (yield ConfigurationManager_1.default.getConfiguration()).installPath;
        let command = 'matlab';
        if (matlabInstallPath !== '') {
            command = path.normalize(path.join(matlabInstallPath.trim(), 'bin', 'matlab'));
        }
        const args = [
            '-log',
            '-memmgr', 'release',
            '-noAppIcon',
            '-nosplash',
            '-r', getMatlabStartupCommand(outFile),
            '-useStartupFolderPref',
            '-nodesktop' // Hide the MATLAB desktop
        ];
        if (os.platform() === 'win32') {
            args.push('-noDisplayDesktop'); // Workaround for '-nodesktop' on Windows until a better solution is implemented
            args.push('-wait');
        }
        const argsFromSettings = (_a = ConfigurationManager_1.default.getArgument(ConfigurationManager_1.Argument.MatlabLaunchCommandArguments)) !== null && _a !== void 0 ? _a : null;
        if (argsFromSettings != null) {
            args.push(argsFromSettings);
        }
        return {
            command,
            args
        };
    });
}
/**
 * Gets the MATLAB command which the MATLAB application should run at startup.
 *
 * Note: This will sanitize the file paths so that they can be safely used within
 * character vectors in MATLAB. This is done by replacing all single-quote characters
 * with double single-quotes.
 *
 * @param outFile The file in which MATLAB should output connection details
 * @returns The MATLAB startup command
 */
function getMatlabStartupCommand(outFile) {
    // Sanitize file paths for MATLAB:
    // Replace single-quotes in the file path with double single-quotes
    // to preserve the quote when used within a MATLAB character vector.
    const extensionInstallationDir = __dirname.replace(/'/g, "''");
    const outFilePath = outFile.replace(/'/g, "''");
    return `addpath(fullfile('${extensionInstallationDir}', '..', 'matlab')); initmatlabls('${outFilePath}')`;
}
//# sourceMappingURL=MatlabSession.js.map