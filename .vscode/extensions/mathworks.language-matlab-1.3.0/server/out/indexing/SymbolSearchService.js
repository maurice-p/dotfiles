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
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportTelemetry = exports.RequestType = void 0;
const vscode_languageserver_1 = require("vscode-languageserver");
const FileInfoIndex_1 = __importStar(require("./FileInfoIndex"));
const TelemetryUtils_1 = require("../logging/TelemetryUtils");
const TextDocumentUtils_1 = require("../utils/TextDocumentUtils");
const fs = __importStar(require("fs/promises"));
const vscode_uri_1 = require("vscode-uri");
var RequestType;
(function (RequestType) {
    RequestType[RequestType["Definition"] = 0] = "Definition";
    RequestType[RequestType["References"] = 1] = "References";
    RequestType[RequestType["DocumentSymbol"] = 2] = "DocumentSymbol";
    RequestType[RequestType["RenameSymbol"] = 3] = "RenameSymbol";
})(RequestType = exports.RequestType || (exports.RequestType = {}));
function reportTelemetry(type, errorCondition = '') {
    let action;
    switch (type) {
        case RequestType.Definition:
            action = TelemetryUtils_1.Actions.GoToDefinition;
            break;
        case RequestType.References:
            action = TelemetryUtils_1.Actions.GoToReference;
            break;
        case RequestType.DocumentSymbol:
            action = TelemetryUtils_1.Actions.DocumentSymbol;
            break;
        case RequestType.RenameSymbol:
            action = TelemetryUtils_1.Actions.RenameSymbol;
            break;
    }
    (0, TelemetryUtils_1.reportTelemetryAction)(action, errorCondition);
}
exports.reportTelemetry = reportTelemetry;
class SymbolSearchService {
    constructor() {
        this.DOTTED_IDENTIFIER_REGEX = /[\w.]+/;
    }
    static getInstance() {
        if (SymbolSearchService.instance == null) {
            SymbolSearchService.instance = new SymbolSearchService();
        }
        return SymbolSearchService.instance;
    }
    /**
     * Finds references of an expression.
     *
     * @param uri The URI of the document containing the expression
     * @param position The position of the expression
     * @param expression The expression for which we are looking for references
     * @param documentManager The text document manager
     * @param requestType The type of request (definition, references, or rename)
     * @returns The references' locations
     */
    findReferences(uri, position, expression, documentManager, requestType) {
        // Get code data for current file
        const codeData = FileInfoIndex_1.default.codeDataCache.get(uri);
        if (codeData == null) {
            // File not indexed - unable to look for references
            reportTelemetry(requestType, 'File not indexed');
            return [];
        }
        const textDocument = documentManager.get(uri);
        if (textDocument == null) {
            reportTelemetry(requestType, 'No document');
            return [];
        }
        const line = (0, TextDocumentUtils_1.getTextOnLine)(textDocument, position.line);
        const commentStart = line.indexOf('%');
        if (commentStart > -1 && commentStart < position.character) {
            // Current expression is in a comment - no references should be returned
            return [];
        }
        const referencesInCodeData = this.findReferencesInCodeData(uri, position, expression, codeData);
        reportTelemetry(requestType);
        if (referencesInCodeData != null) {
            return referencesInCodeData;
        }
        return [];
    }
    /**
     * Searches for references, starting within the given code data. If the expression does not correspond to a local variable,
     *  the search is broadened to other indexed files in the user's workspace.
     *
     * @param uri The URI corresponding to the provided code data
     * @param position The position of the expression
     * @param expression The expression for which we are looking for references
     * @param codeData The code data which is being searched
     * @returns The references' locations, or null if no reference was found
     */
    findReferencesInCodeData(uri, position, expression, codeData) {
        var _a, _b, _c;
        // If first part of expression is targeted - look for a local variable
        if (expression.selectedComponent === 0) {
            const containingFunction = codeData.findContainingFunction(position);
            if (containingFunction != null) {
                const varRefs = this.getVariableDefsOrRefs(containingFunction, expression.unqualifiedTarget, uri, RequestType.References);
                if (varRefs != null) {
                    return varRefs;
                }
            }
        }
        // Check for functions in file
        const functionDeclaration = this.getFunctionDeclaration(codeData, expression.fullExpression);
        if (functionDeclaration != null && functionDeclaration.visibility === FileInfoIndex_1.FunctionVisibility.Private) {
            // Found a local function. Look through this file's references
            return (_b = (_a = codeData.references.get(functionDeclaration.name)) === null || _a === void 0 ? void 0 : _a.map(range => vscode_languageserver_1.Location.create(uri, range))) !== null && _b !== void 0 ? _b : [];
        }
        // Check other files
        const refs = [];
        for (const [, fileCodeData] of FileInfoIndex_1.default.codeDataCache) {
            if (((_c = fileCodeData.functions.get(expression.fullExpression)) === null || _c === void 0 ? void 0 : _c.visibility) === FileInfoIndex_1.FunctionVisibility.Private) {
                // Skip files with other local functions
                continue;
            }
            const varRefs = fileCodeData.references.get(expression.fullExpression);
            if (varRefs != null) {
                varRefs.forEach(range => refs.push(vscode_languageserver_1.Location.create(fileCodeData.uri, range)));
            }
        }
        return refs;
    }
    /**
     * Gets the definition/references of a variable within a function.
     *
     * @param containingFunction Info about a function
     * @param variableName The variable name for which we are looking for definitions or references
     * @param uri The URI of the file
     * @param requestType The type of request (definition or references)
     * @returns The locations of the definition(s) or references of the given variable name within the given function info, or null if none can be found
     */
    getVariableDefsOrRefs(containingFunction, variableName, uri, requestType) {
        const variableInfo = containingFunction.variableInfo.get(variableName);
        if (variableInfo == null) {
            return null;
        }
        const varInfoRanges = requestType === RequestType.Definition ? variableInfo.definitions : variableInfo.references;
        return varInfoRanges.map(range => {
            return vscode_languageserver_1.Location.create(uri, range);
        });
    }
    /**
     * Searches for info about a function within the given code data.
     *
     * @param codeData The code data being searched
     * @param functionName The name of the function being searched for
     * @returns The info about the desired function, or null if it cannot be found
     */
    getFunctionDeclaration(codeData, functionName) {
        var _a, _b;
        let functionDecl = codeData.functions.get(functionName);
        if (codeData.isClassDef && (functionDecl == null || functionDecl.isPrototype)) {
            // For classes, look in the methods list to better handle @folders
            functionDecl = (_b = (_a = codeData.classInfo) === null || _a === void 0 ? void 0 : _a.methods.get(functionName)) !== null && _b !== void 0 ? _b : functionDecl;
        }
        return functionDecl !== null && functionDecl !== void 0 ? functionDecl : null;
    }
    /**
     * Searches for info about a property within the given code data.
     *
     * @param codeData The code data being searched
     * @param propertyName The name of the property being searched for
     * @returns The info about the desired property, or null if it cannot be found
     */
    getPropertyDeclaration(codeData, propertyName) {
        var _a;
        if (codeData.classInfo == null) {
            return null;
        }
        return (_a = codeData.classInfo.properties.get(propertyName)) !== null && _a !== void 0 ? _a : null;
    }
    /**
     * Finds the definition(s) of an expression.
     *
     * @param uri The URI of the document containing the expression
     * @param position The position of the expression
     * @param expression The expression for which we are looking for the definition
     * @param matlabConnection The connection to MATLAB®
     * @param pathResolver The path resolver
     * @param indexer The workspace indexer
     * @returns The definition location(s)
     */
    findDefinition(uri, position, expression, matlabConnection, pathResolver, indexer) {
        return __awaiter(this, void 0, void 0, function* () {
            // Get code data for current file
            const codeData = FileInfoIndex_1.default.codeDataCache.get(uri);
            if (codeData == null) {
                // File not indexed - unable to look for definition
                reportTelemetry(RequestType.Definition, 'File not indexed');
                return [];
            }
            // First check within the current file's code data
            const definitionInCodeData = this.findDefinitionInCodeData(uri, position, expression, codeData);
            if (definitionInCodeData != null) {
                reportTelemetry(RequestType.Definition);
                return definitionInCodeData;
            }
            // Check the MATLAB path
            const definitionOnPath = yield this.findDefinitionOnPath(uri, position, expression, matlabConnection, pathResolver, indexer);
            if (definitionOnPath != null) {
                reportTelemetry(RequestType.Definition);
                return definitionOnPath;
            }
            // If not on path, may be in user's workspace
            reportTelemetry(RequestType.Definition);
            return this.findDefinitionInWorkspace(uri, expression);
        });
    }
    /**
     * Searches the given code data for the definition(s) of the given expression
     *
     * @param uri The URI corresponding to the provided code data
     * @param position The position of the expression
     * @param expression The expression for which we are looking for the definition
     * @param codeData The code data which is being searched
     * @returns The definition location(s), or null if no definition was found
     */
    findDefinitionInCodeData(uri, position, expression, codeData) {
        // If first part of expression targeted - look for a local variable
        if (expression.selectedComponent === 0) {
            const containingFunction = codeData.findContainingFunction(position);
            if (containingFunction != null) {
                const varDefs = this.getVariableDefsOrRefs(containingFunction, expression.unqualifiedTarget, uri, RequestType.Definition);
                if (varDefs != null) {
                    return varDefs;
                }
            }
        }
        // Check for functions in file
        let functionDeclaration = this.getFunctionDeclaration(codeData, expression.fullExpression);
        if (functionDeclaration != null) {
            return [this.getLocationForFunctionDeclaration(functionDeclaration)];
        }
        // Check for definitions within classes
        if (codeData.isClassDef && codeData.classInfo != null) {
            // Look for methods/properties within class definitions (e.g. obj.foo)
            functionDeclaration = this.getFunctionDeclaration(codeData, expression.last);
            if (functionDeclaration != null) {
                return [this.getLocationForFunctionDeclaration(functionDeclaration)];
            }
            // Look for possible properties
            if (expression.selectedComponent === 1) {
                const propertyDeclaration = this.getPropertyDeclaration(codeData, expression.last);
                if (propertyDeclaration != null) {
                    const propertyRange = vscode_languageserver_1.Range.create(propertyDeclaration.range.start, propertyDeclaration.range.end);
                    const uri = codeData.classInfo.uri;
                    if (uri != null) {
                        return [vscode_languageserver_1.Location.create(uri, propertyRange)];
                    }
                }
            }
        }
        return null;
    }
    /**
     * Gets the location of the given function's declaration. If the function does not have
     * a definite declaration, provides a location at the beginning of the file. For example,
     * this may be the case for built-in functions like 'plot'.
     *
     * @param functionInfo Info about the function
     * @returns The location of the function declaration
     */
    getLocationForFunctionDeclaration(functionInfo) {
        var _a;
        const range = (_a = functionInfo.declaration) !== null && _a !== void 0 ? _a : vscode_languageserver_1.Range.create(0, 0, 0, 0);
        return vscode_languageserver_1.Location.create(functionInfo.uri, range);
    }
    /**
     * Searches the MATLAB path for the definition of the given expression
     *
     * @param uri The URI of the file containing the expression
     * @param position The position of the expression
     * @param expression The expression for which we are looking for the definition
     * @param matlabConnection The connection to MATLAB
     * @param pathResolver The path resolver
     * @param indexer The workspace indexer
     * @returns The definition location(s), or null if no definition was found
     */
    findDefinitionOnPath(uri, position, expression, matlabConnection, pathResolver, indexer) {
        return __awaiter(this, void 0, void 0, function* () {
            const resolvedPath = yield pathResolver.resolvePaths([expression.targetExpression], uri, matlabConnection);
            const resolvedUri = resolvedPath[0].uri;
            if (resolvedUri === '') {
                // Not found
                return null;
            }
            // Ensure URI is not a directory. This can occur with some packages.
            const fileStats = yield fs.stat(vscode_uri_1.URI.parse(resolvedUri).fsPath);
            if (fileStats.isDirectory()) {
                return null;
            }
            if (!FileInfoIndex_1.default.codeDataCache.has(resolvedUri)) {
                // Index target file, if necessary
                yield indexer.indexFile(resolvedUri);
            }
            const codeData = FileInfoIndex_1.default.codeDataCache.get(resolvedUri);
            // Find definition location within determined file
            if (codeData != null) {
                const definition = this.findDefinitionInCodeData(resolvedUri, position, expression, codeData);
                if (definition != null) {
                    return definition;
                }
            }
            // If a definition location cannot be identified, default to the beginning of the file.
            // This could be the case for builtin functions which don't actually have a definition in a .m file (e.g. plot).
            return [vscode_languageserver_1.Location.create(resolvedUri, vscode_languageserver_1.Range.create(0, 0, 0, 0))];
        });
    }
    /**
     * Searches the (indexed) workspace for the definition of the given expression. These files may not be on the MATLAB path.
     *
     * @param uri The URI of the file containing the expression
     * @param expression The expression for which we are looking for the definition
     * @returns The definition location(s). Returns an empty array if no definitions found.
     */
    findDefinitionInWorkspace(uri, expression) {
        var _a, _b;
        const expressionToMatch = expression.fullExpression;
        for (const [fileUri, fileCodeData] of FileInfoIndex_1.default.codeDataCache) {
            if (uri === fileUri)
                continue; // Already looked in the current file
            let match = fileCodeData.packageName === '' ? '' : fileCodeData.packageName + '.';
            if (fileCodeData.classInfo != null) {
                const classUri = fileCodeData.classInfo.uri;
                if (classUri == null)
                    continue;
                // Check class name
                match += fileCodeData.classInfo.name;
                if (expressionToMatch === match) {
                    const range = (_a = fileCodeData.classInfo.declaration) !== null && _a !== void 0 ? _a : vscode_languageserver_1.Range.create(0, 0, 0, 0);
                    return [vscode_languageserver_1.Location.create(classUri, range)];
                }
                // Check properties
                const matchedProperty = this.findMatchingClassMember(expressionToMatch, match, classUri, fileCodeData.classInfo.properties);
                if (matchedProperty != null) {
                    return matchedProperty;
                }
                // Check enums
                const matchedEnum = this.findMatchingClassMember(expressionToMatch, match, classUri, fileCodeData.classInfo.enumerations);
                if (matchedEnum != null) {
                    return matchedEnum;
                }
            }
            // Check functions
            for (const [funcName, funcData] of fileCodeData.functions) {
                const funcMatch = (match === '') ? funcName : match + '.' + funcName;
                // Need to ensure that a function with a matching name should also be visible from the current file.
                if (expressionToMatch === funcMatch && this.isFunctionVisibleFromUri(uri, funcData)) {
                    const range = (_b = funcData.declaration) !== null && _b !== void 0 ? _b : vscode_languageserver_1.Range.create(0, 0, 0, 0);
                    return [vscode_languageserver_1.Location.create(funcData.uri, range)];
                }
            }
        }
        return [];
    }
    /**
     * Finds the class member (property or enumeration) in the given map which matches to given expression.
     *
     * @param expressionToMatch The expression being compared against
     * @param matchPrefix The prefix which should be attached to the class members before comparison
     * @param classUri The URI for the current class
     * @param classMemberMap The map of class members
     * @returns An array containing the location of the matched class member, or null if one was not found
     */
    findMatchingClassMember(expressionToMatch, matchPrefix, classUri, classMemberMap) {
        for (const [memberName, memberData] of classMemberMap) {
            const match = matchPrefix + '.' + memberName;
            if (expressionToMatch === match) {
                return [vscode_languageserver_1.Location.create(classUri, memberData.range)];
            }
        }
        return null;
    }
    /**
     * Determines whether the given function should be visible from the given file URI.
     * The function is visible if it is contained within the same file, or is public.
     *
     * @param uri The file's URI
     * @param funcData The function data
     * @returns true if the function should be visible from the given URI; false otherwise
     */
    isFunctionVisibleFromUri(uri, funcData) {
        return uri === funcData.uri || funcData.visibility === FileInfoIndex_1.FunctionVisibility.Public;
    }
}
exports.default = SymbolSearchService.getInstance();
//# sourceMappingURL=SymbolSearchService.js.map