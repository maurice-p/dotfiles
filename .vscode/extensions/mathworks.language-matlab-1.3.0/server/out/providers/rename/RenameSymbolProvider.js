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
const vscode_languageserver_1 = require("vscode-languageserver");
const LifecycleNotificationHelper_1 = __importDefault(require("../../lifecycle/LifecycleNotificationHelper"));
const TextDocumentUtils_1 = require("../../utils/TextDocumentUtils");
const FileInfoIndex_1 = __importDefault(require("../../indexing/FileInfoIndex"));
const TelemetryUtils_1 = require("../../logging/TelemetryUtils");
const ExpressionUtils_1 = require("../../utils/ExpressionUtils");
const SymbolSearchService_1 = __importStar(require("../../indexing/SymbolSearchService"));
class RenameSymbolProvider {
    constructor(matlabLifecycleManager, documentIndexer) {
        this.matlabLifecycleManager = matlabLifecycleManager;
        this.documentIndexer = documentIndexer;
    }
    /**
     * Determines if a symbol that can be renamed exists at the specified position.
     *
     * @param params Parameters for the prepare rename request
     * @param documentManager The text document manager
     * @returns A range and placeholder text
     */
    prepareRename(params, documentManager) {
        return __awaiter(this, void 0, void 0, function* () {
            const matlabConnection = yield this.matlabLifecycleManager.getMatlabConnection(true);
            if (matlabConnection == null) {
                LifecycleNotificationHelper_1.default.notifyMatlabRequirement();
                (0, SymbolSearchService_1.reportTelemetry)(SymbolSearchService_1.RequestType.RenameSymbol, TelemetryUtils_1.ActionErrorConditions.MatlabUnavailable);
                return null;
            }
            const uri = params.textDocument.uri;
            const textDocument = documentManager.get(uri);
            if (textDocument == null) {
                (0, SymbolSearchService_1.reportTelemetry)(SymbolSearchService_1.RequestType.RenameSymbol, 'No document');
                return null;
            }
            const text = textDocument.getText();
            const offset = textDocument.offsetAt(params.position);
            // Find the start of the expression
            let startOffset = offset;
            while (startOffset > 0 && /\w/.test(text.charAt(startOffset - 1))) {
                startOffset--;
            }
            // Find the end of the expression
            let endOffset = offset;
            while (endOffset < text.length && /\w/.test(text.charAt(endOffset))) {
                endOffset++;
            }
            // Check if an expression exists at the given position
            if (startOffset === endOffset) {
                return null;
            }
            const startPosition = textDocument.positionAt(startOffset);
            const endPosition = textDocument.positionAt(endOffset);
            const range = vscode_languageserver_1.Range.create(startPosition, endPosition);
            // Find ID for which to find the definition or references
            const expression = (0, ExpressionUtils_1.getExpressionAtPosition)(textDocument, params.position);
            if (expression == null) {
                (0, SymbolSearchService_1.reportTelemetry)(SymbolSearchService_1.RequestType.RenameSymbol, 'No rename target');
                return null;
            }
            // Check if expression contains only whitespace
            if (expression.fullExpression.trim().length === 0) {
                return null;
            }
            // Check if references exist
            if (SymbolSearchService_1.default.findReferences(uri, params.position, expression, documentManager, SymbolSearchService_1.RequestType.RenameSymbol).length === 0) {
                return null;
            }
            return { range, placeholder: expression.unqualifiedTarget };
        });
    }
    /**
     * Handles requests for renaming.
     *
     * @param params Parameters for the rename request
     * @param documentManager The text document manager
     * @returns A WorkspaceEdit object
     */
    handleRenameRequest(params, documentManager) {
        return __awaiter(this, void 0, void 0, function* () {
            const matlabConnection = yield this.matlabLifecycleManager.getMatlabConnection(true);
            if (matlabConnection == null) {
                LifecycleNotificationHelper_1.default.notifyMatlabRequirement();
                (0, SymbolSearchService_1.reportTelemetry)(SymbolSearchService_1.RequestType.RenameSymbol, TelemetryUtils_1.ActionErrorConditions.MatlabUnavailable);
                return null;
            }
            const uri = params.textDocument.uri;
            const textDocument = documentManager.get(uri);
            if (textDocument == null) {
                (0, SymbolSearchService_1.reportTelemetry)(SymbolSearchService_1.RequestType.RenameSymbol, 'No document');
                return null;
            }
            // Find ID for which to find the definition or references
            const expression = (0, ExpressionUtils_1.getExpressionAtPosition)(textDocument, params.position);
            if (expression == null) {
                (0, SymbolSearchService_1.reportTelemetry)(SymbolSearchService_1.RequestType.RenameSymbol, 'No rename target');
                return null;
            }
            // Ensure document index is up to date
            yield this.documentIndexer.ensureDocumentIndexIsUpdated(textDocument);
            const codeData = FileInfoIndex_1.default.codeDataCache.get(uri);
            if (codeData == null) {
                (0, SymbolSearchService_1.reportTelemetry)(SymbolSearchService_1.RequestType.RenameSymbol, 'No code data');
                return null;
            }
            const refs = SymbolSearchService_1.default.findReferences(uri, params.position, expression, documentManager, SymbolSearchService_1.RequestType.RenameSymbol);
            const workspaceEdit = {
                changes: {
                    [uri]: []
                }
            };
            refs.forEach(location => {
                const range = {
                    start: {
                        line: location.range.start.line,
                        character: location.range.start.character
                    },
                    end: {
                        line: location.range.end.line,
                        character: location.range.end.character
                    }
                };
                if (expression.components.length > 1 && expression.selectedComponent !== 0) {
                    const newName = expression.components.slice();
                    newName[expression.selectedComponent] = params.newName;
                    const newEdit = {
                        range,
                        newText: newName.join('.')
                    };
                    if (location.uri === uri && (workspaceEdit.changes != null)) {
                        workspaceEdit.changes[uri].push(newEdit);
                    }
                }
                else {
                    const newEdit = {
                        range,
                        newText: params.newName
                    };
                    if (location.uri === uri && (workspaceEdit.changes != null)) {
                        workspaceEdit.changes[uri].push(newEdit);
                    }
                }
            });
            // Check if there is a class definition and rename as necessary
            if (codeData.isClassDef && (codeData.classInfo != null) && (codeData.classInfo.declaration != null)) {
                const lineNumber = codeData.classInfo.declaration.start.line;
                const declaration = (0, TextDocumentUtils_1.getTextOnLine)(textDocument, lineNumber);
                if (declaration.split(/\s+/).includes(expression.unqualifiedTarget)) {
                    const range = {
                        start: {
                            line: lineNumber,
                            character: 9 // Offset by 9 to get past classdef_
                        },
                        end: {
                            line: lineNumber,
                            character: 9 + expression.unqualifiedTarget.length
                        }
                    };
                    const newEdit = {
                        range,
                        newText: params.newName
                    };
                    if (workspaceEdit.changes != null) {
                        workspaceEdit.changes[uri].push(newEdit);
                    }
                }
            }
            // Checks if properties need to be renamed
            const propertyInfo = SymbolSearchService_1.default.getPropertyDeclaration(codeData, expression.unqualifiedTarget);
            if (propertyInfo != null && expression.components.length > 1) {
                const newEdit = {
                    range: propertyInfo.range,
                    newText: params.newName
                };
                if (workspaceEdit.changes != null) {
                    workspaceEdit.changes[uri].push(newEdit);
                }
            }
            return workspaceEdit;
        });
    }
}
exports.default = RenameSymbolProvider;
//# sourceMappingURL=RenameSymbolProvider.js.map