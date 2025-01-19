"use strict";
// Copyright 2024 The MathWorks, Inc.
Object.defineProperty(exports, "__esModule", { value: true });
exports.isNoLicensingDataType = exports.isExistingLicensingDataType = exports.isNLMLicensingDataType = exports.isMHLMLicensingDataType = exports.ExistingLicenseType = exports.NLMLicenseType = exports.MHLMLicenseType = void 0;
// Licensing data types
exports.MHLMLicenseType = 'mhlm';
exports.NLMLicenseType = 'nlm';
exports.ExistingLicenseType = 'existing_license';
/**
 * Checks if the provided LicensingData is of type MHLMLicensingData.
 *
 * @param data - The LicensingData object to check.
 * @returns A boolean indicating whether the data is of type MHLMLicensingData.
 */
function isMHLMLicensingDataType(data) {
    return typeof data === 'object' && data !== null &&
        'identity_token' in data && data.identity_token !== null &&
        'source_id' in data && data.source_id !== null &&
        'expiry' in data && data.expiry !== null &&
        'entitlement_id' in data;
}
exports.isMHLMLicensingDataType = isMHLMLicensingDataType;
/**
 * Checks if the provided LicensingData is of type NLMLicensingData.
 *
 * @param data - The LicensingData object to check.
 * @returns A boolean indicating whether the data is of type NLMLicensingData.
 */
function isNLMLicensingDataType(data) {
    return typeof data === 'object' && data != null &&
        Object.keys(data).length === 2 &&
        'conn_str' in data && data.conn_str !== null;
}
exports.isNLMLicensingDataType = isNLMLicensingDataType;
/**
 * Checks if the provided LicensingData is of type ExistingLicenseData.
 *
 * @param data - The LicensingData object to check.
 * @returns A boolean indicating whether the data is of type ExistingLicenseData.
 */
function isExistingLicensingDataType(data) {
    return typeof data === 'object' && data != null &&
        Object.keys(data).length === 1 &&
        'type' in data && data.type === exports.ExistingLicenseType;
}
exports.isExistingLicensingDataType = isExistingLicensingDataType;
/**
 * Checks if the provided LicensingData is of type NoLicensingData (null).
 *
 * @param data - The LicensingData object to check.
 * @returns A boolean indicating whether the data is of type NoLicensingData (null).
 */
function isNoLicensingDataType(data) {
    return data === null;
}
exports.isNoLicensingDataType = isNoLicensingDataType;
//# sourceMappingURL=types.js.map