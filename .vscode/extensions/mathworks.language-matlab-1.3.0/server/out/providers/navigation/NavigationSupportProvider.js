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
const vscode_languageserver_1 = require("vscode-languageserver");
const FileInfoIndex_1 = __importDefault(require("../../indexing/FileInfoIndex"));
const LifecycleNotificationHelper_1 = __importDefault(require("../../lifecycle/LifecycleNotificationHelper"));
const TelemetryUtils_1 = require("../../logging/TelemetryUtils");
const ExpressionUtils_1 = require("../../utils/ExpressionUtils");
const SymbolSearchService_1 = __importStar(require("../../indexing/SymbolSearchService"));
const NotificationService_1 = __importStar(require("../../notifications/NotificationService"));
class NavigationSupportProvider {
    constructor(matlabLifecycleManager, indexer, documentIndexer, pathResolver) {
        this.matlabLifecycleManager = matlabLifecycleManager;
        this.indexer = indexer;
        this.documentIndexer = documentIndexer;
        this.pathResolver = pathResolver;
        /**
         * Caches document symbols for URIs to deal with the case when indexing
         * temporarily fails while the user is in the middle of an edit. We might
         * consider moving logic like this into the indexer logic later as clearing
         * out index data in the middle of an edit will have other ill effects.
         */
        this._documentSymbolCache = new Map();
    }
    /**
     * Handles requests for definitions or references.
     *
     * @param params Parameters for the definition or references request
     * @param documentManager The text document manager
     * @param requestType The type of request (definition or references)
     * @returns An array of locations
     */
    handleDefOrRefRequest(params, documentManager, requestType) {
        return __awaiter(this, void 0, void 0, function* () {
            const matlabConnection = yield this.matlabLifecycleManager.getMatlabConnection(true);
            if (matlabConnection == null) {
                LifecycleNotificationHelper_1.default.notifyMatlabRequirement();
                (0, SymbolSearchService_1.reportTelemetry)(requestType, TelemetryUtils_1.ActionErrorConditions.MatlabUnavailable);
                return [];
            }
            const uri = params.textDocument.uri;
            const textDocument = documentManager.get(uri);
            if (textDocument == null) {
                (0, SymbolSearchService_1.reportTelemetry)(requestType, 'No document');
                return [];
            }
            // Find ID for which to find the definition or references
            const expression = (0, ExpressionUtils_1.getExpressionAtPosition)(textDocument, params.position);
            if (expression == null) {
                // No target found
                (0, SymbolSearchService_1.reportTelemetry)(requestType, 'No navigation target');
                return [];
            }
            if (requestType === SymbolSearchService_1.RequestType.Definition) {
                return yield SymbolSearchService_1.default.findDefinition(uri, params.position, expression, matlabConnection, this.pathResolver, this.indexer);
            }
            else {
                return SymbolSearchService_1.default.findReferences(uri, params.position, expression, documentManager, requestType);
            }
        });
    }
    /**
     *
     * @param params Parameters for the document symbol request
     * @param documentManager The text document manager
     * @param requestType The type of request
     * @returns Array of symbols found in the document
     */
    handleDocumentSymbol(params, documentManager, requestType) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            // Get or wait for the MATLAB connection to handle files opened before MATLAB is ready.
            // We do not want to trigger MATLAB to launch due to the frequency of this callback.
            // However, simply returning [] in this case could cause a delay between MATLAB started
            // and the symbols being identified.
            const matlabConnection = yield new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
                if (this.matlabLifecycleManager.isMatlabConnected()) {
                    resolve(yield this.matlabLifecycleManager.getMatlabConnection());
                }
                else {
                    // MATLAB is not already connected, so wait until it has connected to
                    // resolve the connection.
                    this.matlabLifecycleManager.eventEmitter.once('connected', () => __awaiter(this, void 0, void 0, function* () {
                        resolve(yield this.matlabLifecycleManager.getMatlabConnection());
                    }));
                }
            }));
            if (matlabConnection == null) {
                (0, SymbolSearchService_1.reportTelemetry)(requestType, TelemetryUtils_1.ActionErrorConditions.MatlabUnavailable);
                return [];
            }
            const uri = params.textDocument.uri;
            const textDocument = documentManager.get(uri);
            if (textDocument == null) {
                (0, SymbolSearchService_1.reportTelemetry)(requestType, 'No document');
                return [];
            }
            // Ensure document index is up to date
            yield this.documentIndexer.ensureDocumentIndexIsUpdated(textDocument);
            const codeData = FileInfoIndex_1.default.codeDataCache.get(uri);
            if (codeData == null) {
                (0, SymbolSearchService_1.reportTelemetry)(requestType, 'No code data');
                return [];
            }
            // Result symbols in documented
            const result = [];
            // Avoid duplicates coming from different data sources
            const visitedRanges = new Set();
            /**
             * Push symbol info to result set
             */
            function pushSymbol(name, kind, symbolRange) {
                if (!visitedRanges.has(symbolRange)) {
                    result.push(vscode_languageserver_1.SymbolInformation.create(name, kind, symbolRange, uri));
                    visitedRanges.add(symbolRange);
                }
            }
            if (codeData.isMainClassDefDocument && codeData.classInfo != null) {
                const classInfo = codeData.classInfo;
                if (codeData.classInfo.range != null) {
                    pushSymbol(classInfo.name, vscode_languageserver_1.SymbolKind.Class, codeData.classInfo.range);
                }
                classInfo.methods.forEach((info, name) => pushSymbol(name, vscode_languageserver_1.SymbolKind.Method, info.range));
                classInfo.enumerations.forEach((info, name) => pushSymbol(name, vscode_languageserver_1.SymbolKind.EnumMember, info.range));
                classInfo.properties.forEach((info, name) => pushSymbol(name, vscode_languageserver_1.SymbolKind.Property, info.range));
            }
            codeData.functions.forEach((info, name) => pushSymbol(name, info.isClassMethod ? vscode_languageserver_1.SymbolKind.Method : vscode_languageserver_1.SymbolKind.Function, info.range));
            codeData.sections.forEach((range, title) => {
                range.forEach(range => {
                    pushSymbol(title, vscode_languageserver_1.SymbolKind.Module, range);
                });
            });
            /**
             * Handle a case when the indexer fails due to the user being in the middle of an edit.
             * Here the documentSymbol cache has some symbols but the codeData cache has none. So we
             * assume that the user will soon fix their code and just fall back to what we knew for now.
             */
            if (result.length === 0 && codeData.errorMessage !== undefined) {
                const cached = (_a = this._documentSymbolCache.get(uri)) !== null && _a !== void 0 ? _a : result;
                if (cached.length > 0) {
                    return cached;
                }
            }
            this._documentSymbolCache.set(uri, result);
            this._sendSectionRangesForHighlighting(result, uri);
            return result;
        });
    }
    _sendSectionRangesForHighlighting(result, uri) {
        const sections = result.filter(result => result.kind === vscode_languageserver_1.SymbolKind.Module);
        const sectionRanges = [];
        sections.forEach((section) => {
            sectionRanges.push(section.location.range);
        });
        NotificationService_1.default.sendNotification(NotificationService_1.Notification.MatlabSections, { uri, sectionRanges });
    }
}
exports.default = NavigationSupportProvider;
//# sourceMappingURL=NavigationSupportProvider.js.map