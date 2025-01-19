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
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const fs = __importStar(require("fs"));
const config_1 = require("./config");
const mw_1 = require("./mw");
const FsUtils_1 = require("../utils/FsUtils");
const errors_1 = require("./errors");
const types_1 = require("./types");
const NotificationService_1 = __importStar(require("../notifications/NotificationService"));
const Logger_1 = __importDefault(require("../logging/Logger"));
const config = __importStar(require("./config"));
/**
 * The `Licensing` class is responsible for managing the licensing information for the application.
 * It handles the initialization of licensing, fetching and persisting licensing data, and setting up environment variables for MATLAB.
 * The class is designed as a singleton, ensuring there is only one instance of `Licensing` in the application.
 */
class Licensing {
    /**
     * Creates an instance of the `Licensing` class.
     * If an instance already exists, it returns the existing instance.
     */
    constructor() {
        this.data = null;
        this.error = null;
        if (Licensing.instance) {
            return Licensing.instance;
        }
        this.data = null;
        this.error = null;
        // Create the folder for storing proxy_app_config.json file
        this.createCachedConfigDirectory().then(() => { });
        // Initialize licensing
        this.initializeLicensing().then(() => { });
        // Update static variable to make this object a singleton instance
        Licensing.instance = this;
    }
    /**
     * Initializes the licensing information.
     * It checks for the presence of an NLM connection string in the environment variables or a cached licensing configuration file.
     * Based on the available information, it sets the appropriate licensing data.
     * @private
     */
    initializeLicensing() {
        return __awaiter(this, void 0, void 0, function* () {
            this.data = null;
            const nlmConnectionStringInEnv = process.env.MLM_LICENSE_FILE;
            const mwiConfigFileExists = fs.existsSync(Licensing.mwiConfigFilePath);
            if (nlmConnectionStringInEnv) {
                Logger_1.default.log(`Found MLM_LICENSE_FILE environment variable set to: ${nlmConnectionStringInEnv}. Using it for licensing MATLAB`);
                this.data = {
                    type: 'nlm',
                    conn_str: nlmConnectionStringInEnv
                };
                yield this.deleteCachedConfigFile();
            }
            else if (mwiConfigFileExists) {
                try {
                    const data = JSON.parse(fs.readFileSync(Licensing.mwiConfigFilePath, 'utf8'));
                    Logger_1.default.log('Found cached licensing information...');
                    const cachedLicensingData = data.licensing;
                    if (cachedLicensingData.type === types_1.NLMLicenseType) {
                        this.data = {
                            type: types_1.NLMLicenseType,
                            conn_str: cachedLicensingData.conn_str
                        };
                    }
                    else if (cachedLicensingData.type === types_1.MHLMLicenseType) {
                        this.data = {
                            type: types_1.MHLMLicenseType,
                            identity_token: cachedLicensingData.identity_token,
                            source_id: cachedLicensingData.source_id,
                            expiry: cachedLicensingData.expiry,
                            email_addr: cachedLicensingData.email_addr,
                            first_name: cachedLicensingData.first_name,
                            last_name: cachedLicensingData.last_name,
                            display_name: cachedLicensingData.display_name,
                            user_id: cachedLicensingData.user_id,
                            profile_id: cachedLicensingData.profile_id,
                            entitlements: [],
                            entitlement_id: cachedLicensingData.entitlement_id
                        };
                        // If 'matlab' field exists in the data, then update it in the config.
                        if ('matlab' in data) {
                            config.setMatlabVersion(data.matlab.version);
                        }
                        const expiry = new Date(this.data.expiry);
                        const expiryWindow = new Date(expiry.getTime() - 3600000); // subtract 1 hour
                        if (expiryWindow.getTime() > (new Date()).getTime()) {
                            const successfulUpdate = yield this.updateAndPersistLicensing();
                            if (successfulUpdate) {
                                console.debug('Using cached Online Licensing to launch MATLAB.');
                            }
                            else {
                                this.resetAndDeleteCachedConfig();
                                NotificationService_1.default.sendNotification(NotificationService_1.Notification.LicensingError, 'Failed to fetch entitlements. Resetting cached licensing information.');
                            }
                        }
                    }
                    else if (cachedLicensingData.type === types_1.ExistingLicenseType) {
                        this.data = cachedLicensingData;
                    }
                    else {
                        this.resetAndDeleteCachedConfig();
                        NotificationService_1.default.sendNotification(NotificationService_1.Notification.LicensingError, 'Failed to determine licensing type. Resetting cached licensing information.');
                    }
                }
                catch (e) {
                    NotificationService_1.default.sendNotification(NotificationService_1.Notification.LicensingError, 'Something went wrong when reading cached licensing info. Resetting cached licensing information.');
                    this.resetAndDeleteCachedConfig();
                }
            }
            else {
                Logger_1.default.log('Cached licensing not found...');
            }
        });
    }
    /**
     * Checks if the application is licensed.
     * @returns {boolean} `true` if the application is licensed, `false` otherwise.
     */
    isLicensed() {
        return this.isMHLMLicensing() || this.isNLMLicensing() || this.isExistingLicensing();
    }
    /**
     * Gets the email address associated with the MHLM licensing.
     * @returns {string | null} The email address if MHLM licensing is configured, `null` otherwise.
     */
    getMHLMEmailAddress() {
        if (this.isMHLMLicensing()) {
            return this.data.email_addr;
        }
        return null;
    }
    /**
     * Checks if the licensing type is MHLM (Online License Manager).
     * @private
     * @returns {boolean} `true` if the licensing type is MHLM, `false` otherwise.
     */
    isMHLMLicensing() {
        return (0, types_1.isMHLMLicensingDataType)(this.data);
    }
    /**
     * Checks if the licensing type is NLM (Network License Manager).
     * @private
     * @returns {boolean} `true` if the licensing type is NLM, `false` otherwise.
     */
    isNLMLicensing() {
        return (0, types_1.isNLMLicensingDataType)(this.data);
    }
    /**
     * Checks if the licensing type is an existing license.
     * @private
     * @returns {boolean} `true` if the licensing type is an existing license, `false` otherwise.
     */
    isExistingLicensing() {
        return (0, types_1.isExistingLicensingDataType)(this.data);
    }
    /**
     * Checks if there is no licensing configured.
     * @private
     * @returns {boolean} `true` if there is no licensing configured, `false` otherwise.
     */
    isNoLicensing() {
        return (0, types_1.isNoLicensingDataType)(this.data);
    }
    /**
     * Gets the minimal licensing information as a string.
     * @returns {string} The minimal licensing information.
     */
    getMinimalLicensingInfo() {
        if (this.isMHLMLicensing()) {
            return `${Licensing.type.MHLM_LICENSE} ${this.getMHLMEmailAddress()}`;
        }
        else if (this.isNLMLicensing()) {
            return `${Licensing.type.NLM_LICENSE} ${this.data.conn_str}`;
        }
        else if (this.isExistingLicensing()) {
            return Licensing.type.EXISTING_LICENSE;
        }
        return '';
    }
    /**
     * Unsets the licensing information and deletes the cached configuration file.
     */
    unsetLicensing() {
        return __awaiter(this, void 0, void 0, function* () {
            this.data = null;
            if (this.error && this.error instanceof errors_1.LicensingError) {
                this.error = null;
            }
            yield this.deleteCachedConfigFile();
            console.log("Successfully unset licensing");
        });
    }
    /**
     * Sets the licensing information based on the provided data.
     * @param licenseData - The licensing data to be set.
     */
    setLicensingInfo(licenseData) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!licenseData.hasOwnProperty('type') || ![types_1.MHLMLicenseType, types_1.NLMLicenseType, types_1.ExistingLicenseType].includes(licenseData.type)) {
                throw new Error("Incorrect values supplied. Licensing type must be 'NLM', 'MHLM' or 'ExistingLicense'");
            }
            const type = licenseData.type;
            if (type === types_1.MHLMLicenseType) {
                yield this.setLicensingToMHLM(licenseData);
            }
            else if (type === types_1.NLMLicenseType) {
                this.setLicensingToNLM(licenseData);
            }
            else {
                this.setLicensingToExistingLicense();
            }
        });
    }
    /**
     * Sets up the environment variables required for MATLAB based on the licensing information.
     * @returns {NodeJS.ProcessEnv} The environment variables.
     */
    setupEnvironmentVariables() {
        return __awaiter(this, void 0, void 0, function* () {
            const environmentVariables = {};
            // Is not licensed or existing license return early.
            if (!this.isLicensed()) {
                return environmentVariables;
            }
            if (this.isMHLMLicensing()) {
                const mhlmData = this.data;
                const accessTokenData = yield (0, mw_1.fetchAccessToken)(Licensing.mwaApiEndpoint, mhlmData.identity_token, mhlmData.source_id);
                if (accessTokenData) {
                    environmentVariables.MLM_WEB_LICENSE = 'true';
                    environmentVariables.MLM_WEB_USER_CRED = accessTokenData.token;
                    environmentVariables.MLM_WEB_ID = mhlmData.entitlement_id;
                }
            }
            else if (this.isNLMLicensing()) {
                const nlmData = this.data;
                environmentVariables.MLM_LICENSE_FILE = nlmData.conn_str;
            }
            Logger_1.default.log('Successfully marshaled environment variables for MATLAB');
            return environmentVariables;
        });
    }
    /**
     * Sets the licensing information to MHLM (Online License Manager).
     * @param licenseData - The MHLM licensing data.
     * @private
     */
    setLicensingToMHLM(licenseData) {
        return __awaiter(this, void 0, void 0, function* () {
            const { token: identityToken, sourceId, emailAddress } = licenseData;
            try {
                const expandTokenData = yield (0, mw_1.fetchExpandToken)(Licensing.mwaApiEndpoint, identityToken, sourceId);
                this.data = {
                    type: 'mhlm',
                    identity_token: identityToken,
                    source_id: sourceId,
                    expiry: expandTokenData.expiry,
                    email_addr: emailAddress,
                    first_name: expandTokenData.first_name,
                    last_name: expandTokenData.last_name,
                    display_name: expandTokenData.display_name,
                    user_id: expandTokenData.user_id,
                    profile_id: expandTokenData.profile_id,
                    entitlements: [],
                    entitlement_id: null
                };
                const successfulUpdate = yield this.updateAndPersistLicensing();
                if (successfulUpdate) {
                    Logger_1.default.log('MHLM login successful, persisting login info.');
                    // Set the error back to null if MHLM login was successful.
                    this.error = null;
                }
            }
            catch (error) {
                if (error instanceof errors_1.OnlineLicensingError || error instanceof errors_1.EntitlementError) {
                    this.error = error;
                    this.data = {
                        type: types_1.MHLMLicenseType,
                        email_addr: emailAddress
                    };
                }
                else {
                    this.error = error;
                    this.data = null;
                }
                Logger_1.default.error(error.message);
                console.log(error);
            }
        });
    }
    /**
     * Sets the licensing information to NLM (Network License Manager).
     * @param connectionStr - The NLM connection string.
     * @private
     */
    setLicensingToNLM(data) {
        const { connectionString } = data;
        this.data = {
            type: types_1.NLMLicenseType,
            conn_str: connectionString
        };
        Logger_1.default.log('Persisting NLM info.');
        this.persistConfigData();
    }
    /**
     * Sets the licensing information to an existing license.
     * @private
     */
    setLicensingToExistingLicense() {
        this.data = {
            type: types_1.ExistingLicenseType
        };
        this.persistConfigData();
    }
    /**
     * Updates the user-selected entitlement information for MHLM licensing.
     * @param entitlementId - The entitlement ID.
     */
    updateUserSelectedEntitlementInfo(entitlementId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isMHLMLicensing()) {
                const licensingData = this.data;
                licensingData.entitlement_id = entitlementId;
                this.data = licensingData;
                yield this.persistConfigData();
            }
        });
    }
    /**
     * Updates the entitlements for MHLM licensing.
     * @returns {Promise<boolean>} `true` if the entitlements were updated successfully, `false` otherwise.
     */
    updateEntitlements() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (((_a = this.data) === null || _a === void 0 ? void 0 : _a.type) !== types_1.MHLMLicenseType) {
                const err = new errors_1.LicensingError('MHLM licensing must be configured to update entitlements!');
                Logger_1.default.warn(err.message);
                this.error = err;
                return false;
            }
            const matlabVersion = yield (0, config_1.getMatlabVersion)();
            if (!matlabVersion) {
                const err = new errors_1.EntitlementError('MATLAB version is required for fetching entitlements');
                this.error = err;
                Logger_1.default.warn(err.message);
                return false;
            }
            const mhlmData = this.data;
            try {
                const accessTokenData = yield (0, mw_1.fetchAccessToken)(Licensing.mwaApiEndpoint, mhlmData.identity_token, mhlmData.source_id);
                // Fetch entitlements
                const entitlements = yield (0, mw_1.fetchEntitlements)(Licensing.mhlmApiEndpoint, accessTokenData.token, matlabVersion);
                mhlmData.entitlements = entitlements;
                // Auto-select the entitlement if only one entitlement is returned from MHLM
                if (entitlements.length === 1) {
                    mhlmData.entitlement_id = entitlements[0].id;
                }
                // Update the data variable
                this.data = mhlmData;
                Logger_1.default.log('Successfully fetched entitlements');
                return true;
            }
            catch (e) {
                if (e instanceof errors_1.EntitlementError) {
                    this.error = e;
                    const failedMhlmData = this.data;
                    failedMhlmData.identity_token = null;
                    failedMhlmData.source_id = null;
                    failedMhlmData.expiry = null;
                    failedMhlmData.first_name = null;
                    failedMhlmData.last_name = null;
                    failedMhlmData.display_name = null;
                    failedMhlmData.user_id = null;
                    failedMhlmData.profile_id = null;
                    failedMhlmData.entitlements = [];
                    failedMhlmData.entitlement_id = null;
                    this.data = failedMhlmData;
                    Logger_1.default.error(e.message);
                    return false;
                }
                else if (e instanceof errors_1.OnlineLicensingError) {
                    this.error = e;
                    Logger_1.default.error(e.message);
                    return false;
                }
                else {
                    this.error = e;
                    Logger_1.default.error(e.message);
                    return false;
                }
            }
        });
    }
    /**
     * Updates and persists the licensing information.
     * @private
     * @returns {Promise<boolean>} `true` if the licensing information was updated and persisted successfully, `false` otherwise.
     */
    updateAndPersistLicensing() {
        return __awaiter(this, void 0, void 0, function* () {
            const successfulUpdate = yield this.updateEntitlements();
            if (successfulUpdate) {
                this.persistConfigData();
            }
            else {
                yield this.resetAndDeleteCachedConfig();
            }
            return successfulUpdate;
        });
    }
    /**
     * Persists the licensing and MATLAB version information to the cached configuration file.
     * @private
     */
    persistConfigData() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isNoLicensing()) {
                yield this.deleteCachedConfigFile();
            }
            else {
                const matlabVersion = yield (0, config_1.getMatlabVersion)();
                const dataToWrite = {
                    licensing: this.data,
                    matlab: {
                        version: matlabVersion
                    }
                };
                yield (0, FsUtils_1.writeJSONDataToFile)(Licensing.mwiConfigFilePath, dataToWrite);
            }
        });
    }
    /**
     * Resets and deletes the cached configuration file.
     * @private
     */
    resetAndDeleteCachedConfig() {
        return __awaiter(this, void 0, void 0, function* () {
            this.data = null;
            yield this.deleteCachedConfigFile();
            Logger_1.default.log('Successfully unset licensing');
        });
    }
    /**
     * Deletes the cached configuration file.
     * @private
     */
    deleteCachedConfigFile() {
        return __awaiter(this, void 0, void 0, function* () {
            yield (0, FsUtils_1.deleteFile)(Licensing.mwiConfigFilePath);
        });
    }
    /**
     * Creates the directory for storing the cached configuration file if it doesn't exist.
     * @private
     */
    createCachedConfigDirectory() {
        return __awaiter(this, void 0, void 0, function* () {
            yield (0, FsUtils_1.createDirectoryIfNotExist)(Licensing.mwiConfigFolderPath);
        });
    }
}
exports.default = Licensing;
// NOTE: If wsEnv's are introduced, ./server/routeHandlers.ts::createStatusResponse() return
// value needs to be updated accordingly.
Licensing.mwaApiEndpoint = `https://login.mathworks.com/authenticationws/service/v4`;
Licensing.mhlmApiEndpoint = `https://licensing.mathworks.com/mls/service/v1/entitlement/list`;
Licensing.mwiConfigFolderPath = path.join(os.homedir(), '.matlab', 'MWI', 'hosts', os.hostname());
Licensing.mwiConfigFilePath = path.join(Licensing.mwiConfigFolderPath, 'proxy_app_config.json');
Licensing.type = {
    NO_LICENSE: '',
    MHLM_LICENSE: ' as',
    NLM_LICENSE: ' using',
    EXISTING_LICENSE: '.'
};
//# sourceMappingURL=index.js.map