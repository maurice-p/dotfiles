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
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const SERVER_LOG = 'languageServerLog.txt';
const MATLAB_LOG = 'matlabLog.txt';
class Logger {
    constructor() {
        // Create Log Directory
        const pid = process.pid;
        this.logDir = path.join(os.tmpdir(), `matlabls_${pid}`);
        if (fs.existsSync(this.logDir)) {
            let i = 1;
            while (fs.existsSync(`${this.logDir}_${i}`)) {
                i++;
            }
            this.logDir = `${this.logDir}_${i}`;
        }
        fs.mkdirSync(this.logDir);
        // Get name of log file
        this.languageServerLogFile = path.join(this.logDir, SERVER_LOG);
        this.matlabLogFile = path.join(this.logDir, MATLAB_LOG);
    }
    initialize(console) {
        this.console = console;
        this.log(`Log Directory: ${this.logDir}`);
    }
    static getInstance() {
        if (Logger.instance == null) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }
    /**
     * Logs an informational message to both the console and the log file.
     *
     * @param message The message
     */
    log(message) {
        var _a;
        const msg = `(${getCurrentTimeString()}) matlabls: ${message}`;
        (_a = this.console) === null || _a === void 0 ? void 0 : _a.log(msg);
        this._writeToLogFile(msg, this.languageServerLogFile);
    }
    /**
     * Logs a warning message to both the console and the log file.
     *
     * @param message The warning message
     */
    warn(message) {
        var _a;
        const msg = `(${getCurrentTimeString()}) matlabls - WARNING: ${message}`;
        (_a = this.console) === null || _a === void 0 ? void 0 : _a.warn(msg);
        this._writeToLogFile(msg, this.languageServerLogFile);
    }
    /**
     * Logs an error message to both the console and the log file.
     *
     * @param message The error message
     */
    error(message) {
        var _a;
        const msg = `(${getCurrentTimeString()}) matlabls - ERROR: ${message}`;
        (_a = this.console) === null || _a === void 0 ? void 0 : _a.error(msg);
        this._writeToLogFile(msg, this.languageServerLogFile);
    }
    /**
     * Log MATLAB application output to a log file on disk, separate from
     * the language server logs.
     *
     * @param message The message
     */
    writeMatlabLog(message) {
        this._writeToLogFile(message, this.matlabLogFile);
    }
    _writeToLogFile(message, filePath) {
        // Log to file
        fs.writeFile(filePath, `${message}\n`, { flag: 'a+' }, err => {
            var _a;
            if (err !== null) {
                (_a = this.console) === null || _a === void 0 ? void 0 : _a.error('Failed to write to log file');
            }
        });
    }
}
function getCurrentTimeString() {
    const d = new Date();
    const strFormatter = (x) => x.toString().padStart(2, '0');
    return `${strFormatter(d.getHours())}:${strFormatter(d.getMinutes())}:${strFormatter(d.getSeconds())}`;
}
exports.default = Logger.getInstance();
//# sourceMappingURL=Logger.js.map