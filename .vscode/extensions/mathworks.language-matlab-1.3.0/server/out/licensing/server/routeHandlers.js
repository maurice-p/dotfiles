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
exports.authenticate = exports.updateEntitlement = exports.deleteLicensingInfo = exports.setLicensingInfo = exports.fallbackEndpoint = exports.getStatus = exports.getEnvConfig = void 0;
const path = __importStar(require("path"));
const tokenAuth = __importStar(require("./tokenAuth"));
const config_1 = require("../config");
const index_1 = __importDefault(require("../index"));
const LicensingUtils_1 = require("../../utils/LicensingUtils");
const config = __importStar(require("../config"));
const errors_1 = require("../errors");
const NotificationService_1 = __importStar(require("../../notifications/NotificationService"));
const index_2 = require("./index");
let tokenAuthError = null;
/**
 * Creates a status response object containing MATLAB version, environment suffix, error information, warnings, and licensing information.
 * @param licensing - The Licensing object containing licensing data.
 * @returns {CreateStatusResponse} An object representing the status response with MATLAB version, environment suffix, error information, warnings, and licensing information.
 */
function createStatusResponse(licensing) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield (0, config_1.getMatlabVersion)().then(version => {
            return {
                matlab: {
                    version
                },
                wsEnv: "",
                error: (0, LicensingUtils_1.marshalErrorInfo)((tokenAuthError != null) ? tokenAuthError : licensing.error),
                warnings: [],
                licensing: (0, LicensingUtils_1.marshalLicensingInfo)(licensing.data)
            };
        });
    });
}
/**
 * Retrieves the environment configuration including the MATLAB version and supported versions.
 * @param _req - The Express request object (not used).
 * @param res - The Express response object.
 * @returns {Promise<void>} A promise that resolves when the environment config is sent as a response.
 */
function getEnvConfig(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield (0, config_1.getMatlabVersion)().then(version => {
            res.send({
                matlab: {
                    version
                },
                authentication: {
                    enabled: config.MWI_ENABLE_TOKEN_AUTH,
                    status: tokenAuth.isRequestAuthentic(req)
                }
            });
        });
    });
}
exports.getEnvConfig = getEnvConfig;
/**
 * Retrieves the licensing status, including MATLAB version, licensing information, error information, and warnings.
 * @param _req - The Express request object (not used).
 * @param res - The Express response object.
 * @returns {Promise<void>} A promise that resolves when the server status is sent as a response.
 */
function getStatus(_req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const licensing = new index_1.default();
        res.send(yield createStatusResponse(licensing));
    });
}
exports.getStatus = getStatus;
/**
 * Fallback endpoint for handling requests coming from the React application.
 * Serves the index.html file from the build directory.
 * @param _req - The Express request object (not used).
 * @param res - The Express response object.
 */
function fallbackEndpoint(_req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        res.sendFile(path.join(__dirname, '/build/index.html'));
    });
}
exports.fallbackEndpoint = fallbackEndpoint;
/**
 * Sets the licensing information for MATLAB.
 * @param req - The Express request object containing the licensing information in the request body.
 * @param res - The Express response object.
 * @returns {Promise<void>} A promise that resolves when the server status is sent as a response.
 */
function setLicensingInfo(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const licensing = new index_1.default();
        const jsonData = req.body;
        // If user needed to provide matlabVersion (as it was not determinable in getEnvConfig)
        // then update in config.
        if ('matlabVersion' in jsonData) {
            config.setMatlabVersion(jsonData.matlabVersion);
        }
        yield licensing.setLicensingInfo(jsonData);
        if (licensing.error == null) {
            // Start licensed MATLAB if there's no error related to licensing
            index_2.matlabLifecycleManager.eventEmitter.emit('StartLicensedMatlab');
        }
        else {
            // When there is a licensing error, unset the matlabVersion in config
            // if it was sent by the front-end
            if ('matlabVersion' in jsonData) {
                config.setMatlabVersion('');
            }
        }
        res.send(yield createStatusResponse(licensing));
        NotificationService_1.default.sendNotification(NotificationService_1.Notification.LicensingData, licensing.getMinimalLicensingInfo());
    });
}
exports.setLicensingInfo = setLicensingInfo;
/**
 * Deletes the licensing information for MATLAB.
 * @param _req - The Express request object (not used).
 * @param res - The Express response object.
* @returns {Promise<void>} A promise that resolves when the server status is sent as a response.
 */
function deleteLicensingInfo(_req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const licensing = new index_1.default();
        yield licensing.unsetLicensing();
        res.send(yield createStatusResponse(licensing));
    });
}
exports.deleteLicensingInfo = deleteLicensingInfo;
/**
 * Updates the user-selected entitlement information for MATLAB.
 * @param req - The Express request object containing the entitlement ID in the request body.
 * @param res - The Express response object.
 * @returns {Promise<void>} A promise that resolves when the server status is sent as a response.
 */
function updateEntitlement(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const licensing = new index_1.default();
        const jsonData = req.body;
        const entitlementId = jsonData.entitlement_id;
        yield licensing.updateUserSelectedEntitlementInfo(entitlementId);
        if (licensing.error == null) {
            // Start licensed MATLAB if there's no error related to licensing
            index_2.matlabLifecycleManager.eventEmitter.emit('StartLicensedMatlab');
        }
        res.send(yield createStatusResponse(licensing));
        NotificationService_1.default.sendNotification(NotificationService_1.Notification.LicensingData, licensing.getMinimalLicensingInfo());
    });
}
exports.updateEntitlement = updateEntitlement;
/**
 * Authenticates the user based on the token provided in the request.
 * @param req - The Express request object containing the authentication token.
 * @param res - The Express response object.
 * @returns {Promise<void>} A promise that resolves when the authentication status is sent as a response.
 */
function authenticate(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const isAuthentic = tokenAuth.isRequestAuthentic(req);
        tokenAuthError = isAuthentic ? null : new errors_1.InvalidTokenError('Token invalid. Please enter a valid token to authenticate');
        const status = {
            status: isAuthentic,
            error: (0, LicensingUtils_1.marshalErrorInfo)(tokenAuthError)
        };
        res.send(status);
    });
}
exports.authenticate = authenticate;
//# sourceMappingURL=routeHandlers.js.map