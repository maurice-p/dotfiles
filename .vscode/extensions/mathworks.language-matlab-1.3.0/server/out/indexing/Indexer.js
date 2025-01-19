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
const vscode_uri_1 = require("vscode-uri");
const FileInfoIndex_1 = __importDefault(require("./FileInfoIndex"));
const fs = __importStar(require("fs/promises"));
const ConfigurationManager_1 = __importDefault(require("../lifecycle/ConfigurationManager"));
class Indexer {
    constructor(matlabLifecycleManager, pathResolver) {
        this.matlabLifecycleManager = matlabLifecycleManager;
        this.pathResolver = pathResolver;
        this.INDEX_DOCUMENT_REQUEST_CHANNEL = '/matlabls/indexDocument/request';
        this.INDEX_DOCUMENT_RESPONSE_CHANNEL = '/matlabls/indexDocument/response';
        this.INDEX_FOLDERS_REQUEST_CHANNEL = '/matlabls/indexFolders/request';
        this.INDEX_FOLDERS_RESPONSE_CHANNEL = '/matlabls/indexFolders/response';
    }
    /**
     * Indexes the given TextDocument and caches the data.
     *
     * @param textDocument The document being indexed
     */
    indexDocument(textDocument) {
        return __awaiter(this, void 0, void 0, function* () {
            const matlabConnection = yield this.matlabLifecycleManager.getMatlabConnection();
            if (matlabConnection == null) {
                return;
            }
            const rawCodeData = yield this.getCodeData(textDocument.getText(), textDocument.uri, matlabConnection);
            const parsedCodeData = FileInfoIndex_1.default.parseAndStoreCodeData(textDocument.uri, rawCodeData);
            void this.indexAdditionalClassData(parsedCodeData, matlabConnection, textDocument.uri);
        });
    }
    /**
     * Indexes all M files within the given list of folders.
     *
     * @param folders A list of folder URIs to be indexed
     */
    indexFolders(folders) {
        return __awaiter(this, void 0, void 0, function* () {
            const matlabConnection = yield this.matlabLifecycleManager.getMatlabConnection();
            if (matlabConnection == null) {
                return;
            }
            const channelId = matlabConnection.getChannelId();
            const channel = `${this.INDEX_FOLDERS_RESPONSE_CHANNEL}/${channelId}`;
            const responseSub = matlabConnection.subscribe(channel, message => {
                const fileResults = message;
                if (fileResults.isDone) {
                    // No more files being indexed - safe to unsubscribe
                    matlabConnection.unsubscribe(responseSub);
                }
                // Convert file path to URI, which is used as an index when storing the code data
                const fileUri = vscode_uri_1.URI.file(fileResults.filePath).toString();
                FileInfoIndex_1.default.parseAndStoreCodeData(fileUri, fileResults.codeData);
            });
            const analysisLimit = (yield ConfigurationManager_1.default.getConfiguration()).maxFileSizeForAnalysis;
            matlabConnection.publish(this.INDEX_FOLDERS_REQUEST_CHANNEL, {
                folders,
                channelId,
                analysisLimit
            });
        });
    }
    /**
     * Indexes the file for the given URI and caches the data.
     *
     * @param uri The URI for the file being indexed
     */
    indexFile(uri) {
        return __awaiter(this, void 0, void 0, function* () {
            const matlabConnection = yield this.matlabLifecycleManager.getMatlabConnection();
            if (matlabConnection == null) {
                return;
            }
            const fileContentBuffer = yield fs.readFile(vscode_uri_1.URI.parse(uri).fsPath);
            const code = fileContentBuffer.toString();
            const rawCodeData = yield this.getCodeData(code, uri, matlabConnection);
            FileInfoIndex_1.default.parseAndStoreCodeData(uri, rawCodeData);
        });
    }
    /**
     * Retrieves data about classes, functions, and variables from the given document.
     *
     * @param code The code being parsed
     * @param uri The URI associated with the code
     * @param matlabConnection The connection to MATLAB®
     *
     * @returns The raw data extracted from the document
     */
    getCodeData(code, uri, matlabConnection) {
        return __awaiter(this, void 0, void 0, function* () {
            const filePath = vscode_uri_1.URI.parse(uri).fsPath;
            return yield new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
                const channelId = matlabConnection.getChannelId();
                const channel = `${this.INDEX_DOCUMENT_RESPONSE_CHANNEL}/${channelId}`;
                const responseSub = matlabConnection.subscribe(channel, message => {
                    matlabConnection.unsubscribe(responseSub);
                    resolve(message);
                });
                const analysisLimit = (yield ConfigurationManager_1.default.getConfiguration()).maxFileSizeForAnalysis;
                matlabConnection.publish(this.INDEX_DOCUMENT_REQUEST_CHANNEL, {
                    code,
                    filePath,
                    channelId,
                    analysisLimit
                });
            }));
        });
    }
    /**
     * Indexes any supplemental files if the parsed code data represents a class.
     * This will index any other files in a @ directory, as well as any direct base classes.
     *
     * @param parsedCodeData The parsed code data
     * @param matlabConnection The connection to MATLAB
     * @param uri The document's URI
     */
    indexAdditionalClassData(parsedCodeData, matlabConnection, uri) {
        return __awaiter(this, void 0, void 0, function* () {
            if (parsedCodeData.classInfo == null) {
                return;
            }
            // Queue indexing for other files in @ class directory
            const classDefFolder = parsedCodeData.classInfo.classDefFolder;
            if (classDefFolder !== '') {
                this.indexFolders([classDefFolder]);
            }
            // Find and queue indexing for parent classes
            const baseClasses = parsedCodeData.classInfo.baseClasses;
            const resolvedBaseClasses = yield this.pathResolver.resolvePaths(baseClasses, uri, matlabConnection);
            resolvedBaseClasses.forEach(resolvedBaseClass => {
                const uri = resolvedBaseClass.uri;
                if (uri !== '') {
                    void this.indexFile(uri);
                }
            });
        });
    }
}
exports.default = Indexer;
//# sourceMappingURL=Indexer.js.map