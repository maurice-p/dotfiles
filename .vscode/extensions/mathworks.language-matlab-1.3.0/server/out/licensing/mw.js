"use strict";
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
exports.fetchEntitlements = exports.fetchAccessToken = exports.fetchExpandToken = void 0;
// Copyright 2024 The MathWorks, Inc.
const xml2js = __importStar(require("xml2js"));
const NetworkUtils_1 = __importDefault(require("../utils/NetworkUtils"));
const LicensingUtils_1 = require("../utils/LicensingUtils");
const errors_1 = require("./errors");
/**
 * Fetches an expand token from the MathWorks Access (MWA) service.
 * @param mwaUrl - The URL of the MathWorks Access service.
 * @param identityToken - The identity token to use for authentication.
 * @param sourceId - The source ID for the request.
 * @returns {Promise<{expiry: string, first_name: string, last_name: string, display_name: string, user_id: string, profile_id: string}>} A Promise that resolves with an object containing the expiry date, first name, last name, display name, user ID, and profile ID.
 * @throws {OnlineLicensingError} If there is an error fetching the access token
*/
function fetchExpandToken(mwaUrl, identityToken, sourceId) {
    return __awaiter(this, void 0, void 0, function* () {
        const accessTokenUrl = mwaUrl + '/tokens';
        const data = {
            tokenString: identityToken,
            tokenPolicyName: 'R2',
            sourceId
        };
        const formData = new URLSearchParams(data).toString();
        const options = {
            method: 'POST',
            headers: {
                'content-type': 'application/x-www-form-urlencoded',
                accept: 'application/json',
                X_MW_WS_callerId: 'desktop-jupyter'
            },
            body: formData
        };
        const response = yield (0, NetworkUtils_1.default)(accessTokenUrl, options);
        if (response == null || !response.ok) {
            throw new errors_1.OnlineLicensingError(`Communication with ${mwaUrl} failed.`);
        }
        const jsonData = yield response.json();
        return {
            expiry: jsonData.expirationDate,
            first_name: jsonData.referenceDetail.firstName,
            last_name: jsonData.referenceDetail.lastName,
            display_name: jsonData.referenceDetail.displayName,
            user_id: jsonData.referenceDetail.userId,
            profile_id: jsonData.referenceDetail.referenceId
        };
    });
}
exports.fetchExpandToken = fetchExpandToken;
/**
 * Fetches an access token from the MathWorks Access (MWA) service.
 * @param mwaUrl - The URL of the MathWorks Access service.
 * @param identityToken - The identity token to use for authentication.
 * @param sourceId - The source ID for the request.
 * @returns {Promise<{token: string}>} A Promise that resolves with an object containing the access token.
 * @throws {OnlineLicensingError} If there is an error fetching the access token
 */
function fetchAccessToken(mwaUrl, identityToken, sourceId) {
    return __awaiter(this, void 0, void 0, function* () {
        const accessTokenUrl = mwaUrl + '/tokens/access';
        const data = {
            tokenString: identityToken,
            type: 'MWAS',
            sourceId
        };
        const formData = new URLSearchParams(data).toString();
        const options = {
            method: 'POST',
            headers: {
                'content-type': 'application/x-www-form-urlencoded',
                accept: 'application/json',
                X_MW_WS_callerId: 'desktop-jupyter'
            },
            body: formData
        };
        const response = yield (0, NetworkUtils_1.default)(accessTokenUrl, options);
        if (response == null || !response.ok) {
            throw new errors_1.OnlineLicensingError('HTTP request failed');
        }
        const jsonData = yield response.json();
        return {
            token: jsonData.accessTokenString
        };
    });
}
exports.fetchAccessToken = fetchAccessToken;
/**
 * Fetches entitlements from the MathWorks Hosted License Manager (MHLM) service.
 * @param mhlmUrl - The URL of the MathWorks Hosted License Manager service.
 * @param accessToken - The access token to use for authentication.
 * @param matlabVersion - The version of MATLAB for which to fetch entitlements.
 * @returns {Promise<Entitlement[]>} A Promise that resolves with an array of Entitlement objects.
 * @throws {EntitlementError} If there is an error fetching or parsing the entitlements.
 */
function fetchEntitlements(mhlmUrl, accessToken, matlabVersion) {
    return __awaiter(this, void 0, void 0, function* () {
        const data = {
            token: accessToken,
            release: matlabVersion,
            coreProduct: 'ML',
            context: 'jupyter',
            excludeExpired: 'true'
        };
        const formData = new URLSearchParams(data).toString();
        const options = {
            method: 'POST',
            headers: {
                'content-type': 'application/x-www-form-urlencoded'
            },
            body: formData
        };
        const response = yield (0, NetworkUtils_1.default)(mhlmUrl, options);
        if (response == null || !response.ok) {
            throw new errors_1.EntitlementError(`Communication with ${mhlmUrl} failed`);
        }
        const text = yield response.text();
        const jsonData = yield xml2js.parseStringPromise(text);
        if (!Object.prototype.hasOwnProperty.call(jsonData.describe_entitlements_response, 'entitlements')) {
            throw new errors_1.EntitlementError('Failed to extract entitlements');
        }
        const entitlementsData = (0, LicensingUtils_1.findAllEntitlements)(jsonData.describe_entitlements_response.entitlements);
        if (entitlementsData.length === 0) {
            throw new errors_1.EntitlementError(`Your MathWorks account is not linked to a valid license for MATLAB ${matlabVersion}.\nSign out and login with a licensed user.`);
        }
        const entitlements = entitlementsData.map(entitlementData => {
            const entitlement = entitlementData[0];
            return {
                id: String(entitlement.id),
                label: String(entitlement.label),
                license_number: String(entitlement.license_number)
            };
        });
        return entitlements;
    });
}
exports.fetchEntitlements = fetchEntitlements;
//# sourceMappingURL=mw.js.map