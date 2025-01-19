"use strict";
// Copyright 2022 - 2024 The MathWorks, Inc.
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatlabCodeData = exports.MatlabFunctionInfo = exports.MatlabClassMemberInfo = exports.MatlabClassInfo = exports.FunctionVisibility = void 0;
const vscode_languageserver_1 = require("vscode-languageserver");
const PositionUtils_1 = require("../utils/PositionUtils");
var FunctionVisibility;
(function (FunctionVisibility) {
    FunctionVisibility[FunctionVisibility["Public"] = 0] = "Public";
    FunctionVisibility[FunctionVisibility["Private"] = 1] = "Private";
})(FunctionVisibility = exports.FunctionVisibility || (exports.FunctionVisibility = {}));
/**
 * Serves as an cache of data extracted from files
 */
class FileInfoIndex {
    constructor() {
        /**
         * Maps document URI to the code data
         */
        this.codeDataCache = new Map();
        /**
         * Maps class name to class info
         */
        this.classInfoCache = new Map();
    }
    static getInstance() {
        if (FileInfoIndex.instance == null) {
            FileInfoIndex.instance = new FileInfoIndex();
        }
        return FileInfoIndex.instance;
    }
    /**
     * Parses the raw data into a more usable form. Caches the resulting data
     * in the code data index.
     *
     * @param uri The uri of the document from which the data was extracted
     * @param rawCodeData The raw data
     * @returns An object containing the parsed data
     */
    parseAndStoreCodeData(uri, rawCodeData) {
        let parsedCodeData;
        if (rawCodeData.classInfo.hasClassInfo) {
            let classInfo = this.classInfoCache.get(rawCodeData.classInfo.name);
            if (classInfo == null) {
                // Class not discovered yet - need to create info object
                classInfo = new MatlabClassInfo(rawCodeData.classInfo, uri);
                this.classInfoCache.set(classInfo.name, classInfo);
            }
            else {
                // Class already known - update data
                classInfo.appendClassData(rawCodeData.classInfo, uri);
            }
            parsedCodeData = new MatlabCodeData(uri, rawCodeData, classInfo);
        }
        else {
            parsedCodeData = new MatlabCodeData(uri, rawCodeData);
        }
        // Store in cache
        this.codeDataCache.set(uri, parsedCodeData);
        return parsedCodeData;
    }
}
/**
 * Class to contain info about a class
 */
class MatlabClassInfo {
    constructor(rawClassInfo, uri) {
        this.uri = uri;
        this.methods = new Map();
        this.properties = new Map();
        this.enumerations = new Map();
        this.name = rawClassInfo.name;
        this.baseClasses = rawClassInfo.baseClasses;
        this.classDefFolder = rawClassInfo.classDefFolder;
        if (rawClassInfo.isClassDef) {
            this.range = convertRange(rawClassInfo.range);
            this.declaration = convertRange(rawClassInfo.declaration);
        }
        this.parsePropertiesAndEnums(rawClassInfo);
    }
    /**
     * Appends the new data to the existing class data.
     *
     * Specifically, when the new data represents the classdef file, information about
     * the URI, base classes, and range/declaration are added to the existing data.
     *
     * @param rawClassInfo The raw class data being appended
     * @param uri The document URI corresponding to the class data
     */
    appendClassData(rawClassInfo, uri) {
        if (rawClassInfo.isClassDef) {
            // Data contains class definition
            this.uri = uri;
            this.baseClasses = rawClassInfo.baseClasses;
            this.range = convertRange(rawClassInfo.range);
            this.declaration = convertRange(rawClassInfo.declaration);
            // Since this is the classdef, we'll update all members. Clear them out here.
            this.enumerations.clear();
            this.properties.clear();
            this.methods.clear();
            this.parsePropertiesAndEnums(rawClassInfo);
        }
        else {
            // Data contains supplementary class info - nothing to do in this situation
        }
    }
    /**
     * Appends info about a method to the class's info.
     *
     * This will not replace info about a method's implementation with info about a method prototype.
     *
     * @param functionInfo The method's information
     */
    addMethod(functionInfo) {
        var _a, _b;
        // Only store the method if a non-prototype version of it is not
        // already stored, as that will contain better information.
        const name = functionInfo.name;
        const shouldStoreMethod = !functionInfo.isPrototype || ((_b = (_a = this.methods.get(name)) === null || _a === void 0 ? void 0 : _a.isPrototype) !== null && _b !== void 0 ? _b : true);
        if (shouldStoreMethod) {
            this.methods.set(name, functionInfo);
        }
    }
    /**
     * Parses information about the class's properties and enums from the raw data.
     *
     * @param rawClassInfo The raw class info
     */
    parsePropertiesAndEnums(rawClassInfo) {
        rawClassInfo.properties.forEach(propertyInfo => {
            const name = propertyInfo.name;
            this.properties.set(name, new MatlabClassMemberInfo(propertyInfo));
        });
        rawClassInfo.enumerations.forEach(enumerationInfo => {
            const name = enumerationInfo.name;
            this.enumerations.set(name, new MatlabClassMemberInfo(enumerationInfo));
        });
    }
}
exports.MatlabClassInfo = MatlabClassInfo;
/**
 * Class to contain info about members of a class (e.g. Properties or Enumerations)
 */
class MatlabClassMemberInfo {
    constructor(rawPropertyInfo) {
        this.name = rawPropertyInfo.name;
        this.range = convertRange(rawPropertyInfo.range);
        this.parentClass = rawPropertyInfo.parentClass;
    }
}
exports.MatlabClassMemberInfo = MatlabClassMemberInfo;
/**
 * Class to contain info about functions
 */
class MatlabFunctionInfo {
    constructor(rawFunctionInfo, uri) {
        this.uri = uri;
        this.name = rawFunctionInfo.name;
        this.range = convertRange(rawFunctionInfo.range);
        this.declaration = rawFunctionInfo.declaration != null ? convertRange(rawFunctionInfo.declaration) : null;
        this.isPrototype = rawFunctionInfo.isPrototype;
        this.parentClass = rawFunctionInfo.parentClass;
        this.isClassMethod = this.parentClass !== '';
        this.visibility = rawFunctionInfo.isPublic ? FunctionVisibility.Public : FunctionVisibility.Private;
        this.variableInfo = new Map();
        this.parseVariableInfo(rawFunctionInfo);
    }
    /**
     * Parses information about variables within the function from the raw data.
     *
     * @param rawFunctionInfo The raw function info
     */
    parseVariableInfo(rawFunctionInfo) {
        const variableInfo = rawFunctionInfo.variableInfo;
        const globals = rawFunctionInfo.globals;
        variableInfo.definitions.forEach(varDefinition => {
            const name = varDefinition[0];
            const range = convertRange(varDefinition[1]);
            const varInfo = this.getOrCreateVariableInfo(name, globals);
            varInfo.addDefinition(range);
        });
        variableInfo.references.forEach(varReference => {
            const name = varReference[0];
            const range = convertRange(varReference[1]);
            const varInfo = this.getOrCreateVariableInfo(name, globals);
            varInfo.addReference(range);
        });
    }
    /**
     * Attempts to retrieve an existing MatlabVariableInfo object for the requested variable.
     * Creates a new instance if one does not already exist.
     *
     * @param name The variable's name
     * @param globals The list of global variables
     * @returns The MatlabVariableInfo object for the variable
     */
    getOrCreateVariableInfo(name, globals) {
        let variableInfo = this.variableInfo.get(name);
        if (variableInfo == null) {
            const isGlobal = globals.includes(name);
            variableInfo = new MatlabVariableInfo(name, isGlobal);
            this.variableInfo.set(name, variableInfo);
        }
        return variableInfo;
    }
}
exports.MatlabFunctionInfo = MatlabFunctionInfo;
/**
 * Class to contain info about variables
 */
class MatlabVariableInfo {
    constructor(name, isGlobal) {
        this.name = name;
        this.isGlobal = isGlobal;
        this.definitions = [];
        this.references = [];
    }
    /**
     * Add a definition for the variable
     *
     * @param range The range of the definition
     */
    addDefinition(range) {
        this.definitions.push(range);
    }
    /**
     * Add a reference for the variable
     *
     * @param range The range of the reference
     */
    addReference(range) {
        this.references.push(range);
    }
}
/**
 * Class to contain info about an entire file
 */
class MatlabCodeData {
    constructor(uri, rawCodeData, classInfo) {
        this.uri = uri;
        this.classInfo = classInfo;
        this.functions = new Map();
        this.references = new Map();
        this.sections = new Map();
        this.packageName = rawCodeData.packageName;
        this.errorMessage = undefined;
        this.parseFunctions(rawCodeData.functionInfo);
        this.parseReferences(rawCodeData.references);
        this.parseSectionInfo(rawCodeData.sections);
        this.parseErrorInfo(rawCodeData.errorInfo);
    }
    parseErrorInfo(errorInfo) {
        if (errorInfo == undefined) {
            this.errorMessage = undefined;
            return;
        }
        this.errorMessage = errorInfo.message;
    }
    /**
     * Whether or not the code data represents a class definition
     */
    get isClassDef() {
        return this.classInfo != null;
    }
    /**
     * Whether or not the code data represents a main classdef file.
     * For @aclass/aclass.m this returns true
     * For @aclass/amethod.m this returns false.
     */
    get isMainClassDefDocument() {
        var _a;
        return this.isClassDef && this.uri === ((_a = this.classInfo) === null || _a === void 0 ? void 0 : _a.uri);
    }
    /**
     * Finds the info for the function containing the given position.
     *
     * @param position A position in the document
     * @returns The info for the function containing the position, or null if no function contains that position.
     */
    findContainingFunction(position) {
        let containingFunction = null;
        for (const functionInfo of this.functions.values()) {
            const start = functionInfo.range.start;
            const end = functionInfo.range.end;
            // Check if position is within range
            if ((0, PositionUtils_1.isPositionLessThanOrEqualTo)(start, position) && (0, PositionUtils_1.isPositionGreaterThan)(end, position)) {
                if (containingFunction == null) {
                    containingFunction = functionInfo;
                }
                else {
                    // Prefer a narrower function if we already have a match (e.g. nested functions)
                    if ((0, PositionUtils_1.isPositionGreaterThan)(start, containingFunction.range.start)) {
                        containingFunction = functionInfo;
                    }
                }
            }
        }
        return containingFunction;
    }
    /**
     * Parses information about the file's functions.
     *
     * @param functionInfos The raw information about the functions in the file
     */
    parseFunctions(functionInfos) {
        functionInfos.forEach(functionInfo => {
            var _a;
            const fcnInfo = new MatlabFunctionInfo(functionInfo, this.uri);
            this.functions.set(fcnInfo.name, fcnInfo);
            if (fcnInfo.isClassMethod) {
                // Store the function info with the class as well
                (_a = this.classInfo) === null || _a === void 0 ? void 0 : _a.addMethod(fcnInfo);
            }
        });
    }
    /**
     * Parses information about the file's variable and function references.
     *
     * @param references The raw information about the references in the file
     */
    parseReferences(references) {
        references.forEach(reference => {
            var _a;
            const funcName = reference[0];
            const range = convertRange(reference[1]);
            if (!this.references.has(funcName)) {
                // First time seeing this reference
                this.references.set(funcName, [range]);
            }
            else {
                (_a = this.references.get(funcName)) === null || _a === void 0 ? void 0 : _a.push(range);
            }
        });
    }
    /**
     * Parse raw section info to the section and set to this.sections
     * @param sectionsInfo Array of the section information of the file retrieved from MATLAB
     */
    parseSectionInfo(sectionsInfo) {
        sectionsInfo.forEach((sectionInfo) => {
            var _a;
            const { title, range: rangeSectionInfo } = sectionInfo;
            const range = convertRange(rangeSectionInfo);
            if (!this.sections.has(title)) {
                this.sections.set(title, [range]);
            }
            else {
                (_a = this.sections.get(title)) === null || _a === void 0 ? void 0 : _a.push(range);
            }
        });
    }
}
exports.MatlabCodeData = MatlabCodeData;
/**
 * Converts from a CodeDataRange to a Range as expected by the language server APIs.
 *
 * @param codeDataRange The CodeDataRange
 * @returns A Range corresponding to the inputted range
 */
function convertRange(codeDataRange) {
    // When converting, need to change value from 1-based to 0-based
    return vscode_languageserver_1.Range.create(codeDataRange.lineStart - 1, codeDataRange.charStart - 1, codeDataRange.lineEnd - 1, codeDataRange.charEnd - 1);
}
exports.default = FileInfoIndex.getInstance();
//# sourceMappingURL=FileInfoIndex.js.map