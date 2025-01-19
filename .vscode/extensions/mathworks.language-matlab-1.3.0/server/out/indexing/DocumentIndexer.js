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
const FileInfoIndex_1 = __importDefault(require("./FileInfoIndex"));
const INDEXING_DELAY = 500; // Delay (in ms) after keystroke before attempting to re-index the document
/**
 * Handles indexing a currently open document to gather data about classes,
 * functions, and variables.
 */
class DocumentIndexer {
    constructor(indexer) {
        this.indexer = indexer;
        this.pendingFilesToIndex = new Map();
    }
    /**
     * Queues a document to be indexed. This handles debouncing so that
     * indexing is not performed on every keystroke.
     *
     * @param textDocument The document to be indexed
     */
    queueIndexingForDocument(textDocument) {
        const uri = textDocument.uri;
        this.clearTimerForDocumentUri(uri);
        this.pendingFilesToIndex.set(uri, setTimeout(() => {
            this.indexDocument(textDocument);
        }, INDEXING_DELAY) // Specify timeout for debouncing, to avoid re-indexing every keystroke while a user types
        );
    }
    /**
     * Indexes the document and caches the data.
     *
     * @param textDocument The document being indexed
     */
    indexDocument(textDocument) {
        void this.indexer.indexDocument(textDocument);
    }
    /**
     * Clears any active indexing timers for the provided document URI.
     *
     * @param uri The document URI
     */
    clearTimerForDocumentUri(uri) {
        const timerId = this.pendingFilesToIndex.get(uri);
        if (timerId != null) {
            clearTimeout(timerId);
            this.pendingFilesToIndex.delete(uri);
        }
    }
    /**
     * Ensure that @param textDocument is fully indexed and up to date by flushing any pending indexing tasks
     * and then forcing an index. This is intended to service requests like documentSymbols where returning
     * stale info could be confusing.
     *
     * @param textDocument The document to index
     */
    ensureDocumentIndexIsUpdated(textDocument) {
        return __awaiter(this, void 0, void 0, function* () {
            const uri = textDocument.uri;
            if (this.pendingFilesToIndex.has(uri)) {
                this.clearTimerForDocumentUri(uri);
                yield this.indexer.indexDocument(textDocument);
            }
            if (!FileInfoIndex_1.default.codeDataCache.has(uri)) {
                yield this.indexer.indexDocument(textDocument);
            }
        });
    }
}
exports.default = DocumentIndexer;
//# sourceMappingURL=DocumentIndexer.js.map