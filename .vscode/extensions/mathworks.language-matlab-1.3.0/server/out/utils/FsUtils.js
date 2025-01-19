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
exports.findExecutableOnPath = exports.resolveSymlink = exports.deleteFile = exports.writeJSONDataToFile = exports.createDirectoryIfNotExist = void 0;
const fs = __importStar(require("fs/promises"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const path = __importStar(require("path"));
const Logger_1 = __importDefault(require("../logging/Logger"));
const execPromise = (0, util_1.promisify)(child_process_1.exec);
/**
 * Creates a directory if it does not exist.
 * @param directoryPath - The path of the directory to create.
 * @returns {Promise<void>}
 */
function createDirectoryIfNotExist(directoryPath) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield fs.mkdir(directoryPath, { recursive: true });
            Logger_1.default.log(`Directory created or already exists: ${directoryPath}`);
        }
        catch (error) {
            Logger_1.default.error(`Error creating directory: ${error.message}`);
        }
    });
}
exports.createDirectoryIfNotExist = createDirectoryIfNotExist;
/**
 * Writes JSON data to a file.
 * @param filePath - The path of the file to write to.
 * @param data - The data to write to the file.
 * @returns {Promise<void>}
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
function writeJSONDataToFile(filePath, data) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const dataString = JSON.stringify(data, null, 4);
            yield fs.writeFile(filePath, dataString, 'utf8');
            Logger_1.default.log(`File written successfully to ${filePath}`);
        }
        catch (error) {
            Logger_1.default.error(`Error writing file: ${error.message}`);
        }
    });
}
exports.writeJSONDataToFile = writeJSONDataToFile;
/**
 * Deletes a file.
 * @param filePath - The path of the file to delete.
 * @returns {Promise<void>}
 */
function deleteFile(filePath) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield fs.unlink(filePath);
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                Logger_1.default.log(`File at path ${filePath} does not exist`);
            }
            else {
                Logger_1.default.error(`Error deleting file: ${String(error)}`);
            }
        }
    });
}
exports.deleteFile = deleteFile;
/**
 * Resolves a symbolic link to its target path.
 * @param executablePath - The path of the symbolic link.
 * @returns {Promise<string>} The resolved target path.
 */
function resolveSymlink(executablePath) {
    return __awaiter(this, void 0, void 0, function* () {
        if (executablePath === null || executablePath === undefined || executablePath === '') {
            return '';
        }
        try {
            const linkTarget = yield fs.readlink(executablePath);
            const absolutePath = yield fs.realpath(linkTarget);
            return absolutePath;
        }
        catch (error) {
            return path.resolve(executablePath);
        }
    });
}
exports.resolveSymlink = resolveSymlink;
/**
 * Asynchronously finds the path of an executable on the system's PATH.
 *
 * @param executable - The name of the executable to find.
 * @returns {Promise<string|null>} A promise that resolves to the path of the executable if found, or null if not found.
 */
function findExecutableOnPath(executable) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { stdout } = yield execPromise(`which ${executable}`);
            return stdout.trim();
        }
        catch (err) {
            return null;
        }
    });
}
exports.findExecutableOnPath = findExecutableOnPath;
//# sourceMappingURL=FsUtils.js.map