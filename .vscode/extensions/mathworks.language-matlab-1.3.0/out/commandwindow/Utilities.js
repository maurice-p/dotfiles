"use strict";
// Copyright 2024 The MathWorks, Inc.
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiClientNotifier = exports.createResolvablePromise = void 0;
/**
 * Creates a resolvable promise
 * @returns A resolvable promise
 */
function createResolvablePromise() {
    let res, rej;
    const p = new Promise((resolve, reject) => {
        res = resolve;
        rej = reject;
    });
    p.resolve = res;
    p.reject = rej;
    return p;
}
exports.createResolvablePromise = createResolvablePromise;
class MultiClientNotifier {
    constructor(notifier) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this._callbacks = {};
        this._notifier = notifier;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sendNotification(tag, data) {
        this._notifier.sendNotification(tag, data);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onNotification(tag, callback) {
        if (!(tag in this._callbacks)) {
            this._callbacks[tag] = [];
            this._notifier.onNotification(tag, this._handler.bind(this, tag));
        }
        this._callbacks[tag].push(callback);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _handler(tag, data) {
        this._callbacks[tag].forEach((callback) => {
            callback(data);
        }, this);
    }
}
exports.MultiClientNotifier = MultiClientNotifier;
//# sourceMappingURL=Utilities.js.map