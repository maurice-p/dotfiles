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
exports.getMatlabVersion = exports.setMatlabVersion = exports.setInstallPath = exports.staticFolderPath = exports.MWI_LICENSING_SESSION_COOKIE_NAME = exports.MWI_ENABLE_TOKEN_AUTH = exports.MWI_AUTH_TOKEN_LENGTH = exports.MWI_AUTH_TOKEN_NAME_FOR_HTTP = void 0;
const fs_1 = require("fs");
const FsUtils_1 = require("../utils/FsUtils");
const path = __importStar(require("path"));
const xml2js = __importStar(require("xml2js"));
const Logger_1 = __importDefault(require("../logging/Logger"));
const VERSION_INFO_FILENAME = 'VersionInfo.xml';
exports.MWI_AUTH_TOKEN_NAME_FOR_HTTP = 'mwi-auth-token';
exports.MWI_AUTH_TOKEN_LENGTH = 32;
exports.MWI_ENABLE_TOKEN_AUTH = true;
exports.MWI_LICENSING_SESSION_COOKIE_NAME = 'matlab-licensing-session';
let installPath = null;
let matlabVersion = null;
exports.staticFolderPath = path.join(__dirname, 'licensing', 'static');
/**
 * Sets the MATLAB install path. Is called when:
 * 1) The LSP is initialzed
 * &
 * 2) The installPath setting changes by its config change handler
 * @param path - The MATLAB install path
 */
function setInstallPath(path) {
    installPath = path;
    // When installPath changes, update MATLAB version
    getMatlabVersionFromInstallPath(installPath).then((version) => {
        matlabVersion = version;
    });
}
exports.setInstallPath = setInstallPath;
/**
 * Sets the MATLAB version. This function is called to update the current
 * MATLAB version in the application state.
 *
 * @param version - The MATLAB version to be set
 */
function setMatlabVersion(version) {
    matlabVersion = version;
}
exports.setMatlabVersion = setMatlabVersion;
/**
 * Gets the MATLAB version
 * @returns {Promise<string | null>} The MATLAB version or null if it cannot be determined
 */
function getMatlabVersion() {
    return __awaiter(this, void 0, void 0, function* () {
        // If MATLAB version was already determined (either by this function or the setInstallPath function), return it directly.
        if (matlabVersion) {
            return matlabVersion;
        }
        else {
            const matlabExecutableOnPath = yield (0, FsUtils_1.findExecutableOnPath)('matlab');
            // If there's no matlab executable on system PATH return null
            if (!matlabExecutableOnPath) {
                return null;
            }
            const absoluteMatlabPath = yield (0, FsUtils_1.resolveSymlink)(matlabExecutableOnPath);
            const matlabRoot = path.resolve(absoluteMatlabPath, '..', '..');
            // Update matlabVersion variable before returning to avoid recomputation.
            matlabVersion = yield getMatlabVersionFromInstallPath(matlabRoot);
            return matlabVersion;
        }
    });
}
exports.getMatlabVersion = getMatlabVersion;
/**
 * Retrieves the MATLAB version from the installation path.
 *
 * @param pathToMatlabRoot - The path to the MATLAB ROOT.
 * @returns {Promise<string|null>} A promise that resolves to the MATLAB version as a string, or null if an error occurs.
 */
function getMatlabVersionFromInstallPath(pathToMatlabRoot) {
    return __awaiter(this, void 0, void 0, function* () {
        const versionInfoPath = path.join(pathToMatlabRoot, VERSION_INFO_FILENAME);
        try {
            const fileContent = yield fs_1.promises.readFile(versionInfoPath, { encoding: 'utf-8' });
            const xmlData = (yield xml2js.parseStringPromise(fileContent));
            const versionInfo = xmlData.MathWorks_version_info.release[0];
            return versionInfo;
        }
        catch (error) {
            Logger_1.default.error(`Failed to read version info file at path:${versionInfoPath} with error:${error}`);
            return null;
        }
    });
}
//# sourceMappingURL=config.js.map