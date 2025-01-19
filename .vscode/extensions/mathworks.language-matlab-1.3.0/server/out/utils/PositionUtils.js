"use strict";
// Copyright 2022 - 2023 The MathWorks, Inc.
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPositionGreaterThanOrEqualTo = exports.isPositionGreaterThan = exports.isPositionLessThanOrEqualTo = exports.isPositionLessThan = void 0;
/**
 * Determines whether a position is less than another position.
 *
 * @param a The first position
 * @param b The second position
 * @returns true if position A is before position B
 */
function isPositionLessThan(a, b) {
    return checkLessThan(a, b);
}
exports.isPositionLessThan = isPositionLessThan;
/**
 * Determines whether a position is less than or equal to another position.
 *
 * @param a The first position
 * @param b The second position
 * @returns true if position A is before position B, or the same position
 */
function isPositionLessThanOrEqualTo(a, b) {
    return checkLessThan(a, b, true);
}
exports.isPositionLessThanOrEqualTo = isPositionLessThanOrEqualTo;
/**
 * Determines whether a position is greater than another position.
 *
 * @param a The first position
 * @param b The second position
 * @returns True if position A is after position B
 */
function isPositionGreaterThan(a, b) {
    return checkGreaterThan(a, b);
}
exports.isPositionGreaterThan = isPositionGreaterThan;
/**
 * Determines whether a position is greater than or equal to another position.
 *
 * @param a The first position
 * @param b The second position
 * @returns True if position A is after position B, or the same position
 */
function isPositionGreaterThanOrEqualTo(a, b) {
    return checkGreaterThan(a, b, true);
}
exports.isPositionGreaterThanOrEqualTo = isPositionGreaterThanOrEqualTo;
/**
 * Performs a "less than (or equal to)" check on two positions.
 *
 * @param a The first position
 * @param b The second position
 * @param orEqual Whether or not an "or equal to" check should be performed
 * @returns true if position A is before position B
 */
function checkLessThan(a, b, orEqual = false) {
    if (a.line < b.line) {
        return true;
    }
    if (a.line === b.line) {
        return orEqual
            ? a.character <= b.character
            : a.character < b.character;
    }
    return false;
}
/**
 * Performs a "greater than (or equal to)" check on two positions.
 *
 * @param a The first position
 * @param b The second position
 * @param orEqual Whether or not an "or equal to" check should be performed
 * @returns true if position A is after position B
 */
function checkGreaterThan(a, b, orEqual = false) {
    if (a.line > b.line) {
        return true;
    }
    if (a.line === b.line) {
        return orEqual
            ? a.character >= b.character
            : a.character > b.character;
    }
    return false;
}
//# sourceMappingURL=PositionUtils.js.map