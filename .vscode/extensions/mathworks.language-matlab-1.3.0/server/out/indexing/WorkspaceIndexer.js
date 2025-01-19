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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ConfigurationManager_1 = __importDefault(require("../lifecycle/ConfigurationManager"));
const ClientConnection_1 = __importDefault(require("../ClientConnection"));
/**
 * Handles indexing files in the user's workspace to gather data about classes,
 * functions, and variables.
 */
class WorkspaceIndexer {
    constructor(indexer) {
        this.indexer = indexer;
        this.isWorkspaceIndexingSupported = false;
    }
    /**
     * Sets up workspace change listeners, if supported.
     *
     * @param capabilities The client capabilities, which contains information about
     * whether the client supports workspaces.
     */
    setupCallbacks(capabilities) {
        var _a, _b;
        this.isWorkspaceIndexingSupported = (_b = (_a = capabilities.workspace) === null || _a === void 0 ? void 0 : _a.workspaceFolders) !== null && _b !== void 0 ? _b : false;
        if (!this.isWorkspaceIndexingSupported) {
            // Workspace indexing not supported
            return;
        }
        ClientConnection_1.default.getConnection().workspace.onDidChangeWorkspaceFolders((params) => {
            void this.handleWorkspaceFoldersAdded(params.added);
        });
    }
    /**
     * Attempts to index the files in the user's workspace.
     */
    indexWorkspace() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!(yield this.shouldIndexWorkspace())) {
                return;
            }
            const folders = yield ClientConnection_1.default.getConnection().workspace.getWorkspaceFolders();
            if (folders == null) {
                return;
            }
            void this.indexer.indexFolders(folders.map(folder => folder.uri));
        });
    }
    /**
     * Handles when new folders are added to the user's workspace by indexing them.
     *
     * @param folders The list of folders added to the workspace
     */
    handleWorkspaceFoldersAdded(folders) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!(yield this.shouldIndexWorkspace())) {
                return;
            }
            void this.indexer.indexFolders(folders.map(folder => folder.uri));
        });
    }
    /**
     * Determines whether or not the workspace should be indexed.
     * The workspace should be indexed if the client supports workspaces, and if the
     * workspace indexing setting is true.
     *
     * @returns True if workspace indexing should occurr, false otherwise.
     */
    shouldIndexWorkspace() {
        return __awaiter(this, void 0, void 0, function* () {
            const shouldIndexWorkspace = (yield ConfigurationManager_1.default.getConfiguration()).indexWorkspace;
            return this.isWorkspaceIndexingSupported && shouldIndexWorkspace;
        });
    }
}
exports.default = WorkspaceIndexer;
//# sourceMappingURL=WorkspaceIndexer.js.map