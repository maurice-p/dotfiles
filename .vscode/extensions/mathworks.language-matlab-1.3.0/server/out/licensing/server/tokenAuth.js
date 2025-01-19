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
Object.defineProperty(exports, "__esModule", { value: true });
exports.isRequestAuthentic = exports.getAuthToken = exports.generateAuthToken = void 0;
const crypto = __importStar(require("crypto"));
const config_1 = require("../config");
let authToken;
let authTokenHashed = null;
/**
 * Checks if the authentication token is present in the session cookie and is valid.
 * @param  req - The Express request object.
 * @returns True if the token is valid and present in the session cookie, otherwise false.
 */
function isAuthTokenInSessionCookie(req) {
    const token = req.session['mwi-auth-token'];
    if (isValidToken(token)) {
        return true;
    }
    return false;
}
/**
 * Checks if the authentication token is present in the request headers and is valid.
 * If the token is valid, it is also stored in the session cookie.
 * @param req - The Express request object.
 * @returns True if the token is valid and present in the request headers, otherwise false.
 */
function isAuthTokenInRequestHeaders(req) {
    const token = req.headers[config_1.MWI_AUTH_TOKEN_NAME_FOR_HTTP];
    if (isValidToken(token)) {
        req.session['mwi-auth-token'] = token;
        return true;
    }
    return false;
}
/**
 * Checks if the authentication token is present in the request parameters and is valid.
 * @param req - The Express request object.
 * @returns True if the token is valid and present in the request parameters, otherwise false.
 */
function isAuthTokenInRequestParams(req) {
    const token = req.query[config_1.MWI_AUTH_TOKEN_NAME_FOR_HTTP];
    if (isValidToken(token)) {
        return true;
    }
    return false;
}
/**
 * Generates a new authentication token of the specified length if one does not already exist.
 * The token is then hashed and stored.
 * @param length - The length of the authentication token to generate.
 * @returns The generated authentication token.
 */
function generateAuthToken(length) {
    if (isValidToken(authToken)) {
        return authToken;
    }
    authToken = crypto.randomBytes(length).toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '')
        .substring(0, length);
    const hash = crypto.createHash('sha256');
    hash.update(authToken);
    authTokenHashed = hash.digest('hex');
    return authToken;
}
exports.generateAuthToken = generateAuthToken;
/**
 * Retrieves the current authentication token.
 * @returns The current authentication token.
 */
function getAuthToken() {
    return authToken;
}
exports.getAuthToken = getAuthToken;
/**
 * Checks if the incoming request is authentic by verifying the presence and validity of the authentication token
 * in the session cookie, request headers, or request parameters.
 * @param req - The Express request object.
 * @returns True if the request is authentic, otherwise false.
 */
function isRequestAuthentic(req) {
    return isAuthTokenInSessionCookie(req) || isAuthTokenInRequestHeaders(req) || isAuthTokenInRequestParams(req);
}
exports.isRequestAuthentic = isRequestAuthentic;
/**
 * Validates the provided authentication token against the stored token and its hashed version.
 * @param token - The token to validate.
 * @returns True if the token is valid, otherwise false.
 */
function isValidToken(token) {
    return token !== null && token !== undefined && (token === authToken || token === authTokenHashed);
}
//# sourceMappingURL=tokenAuth.js.map