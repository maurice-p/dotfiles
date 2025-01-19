"use strict";
// Copyright 2024 The MathWorks, Inc.
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoutes = void 0;
const routeHandlers_1 = require("./routeHandlers");
const middlewares_1 = require("./middlewares");
/**
 * Adds routes to the express application
 * @param app - The Express application object.
 */
function addRoutes(app) {
    // Endpoints that do not require token authentication
    app.get('/get_env_config', routeHandlers_1.getEnvConfig);
    app.get('/get_status', routeHandlers_1.getStatus);
    app.post('/authenticate', routeHandlers_1.authenticate);
    // Endpoints that require token authentication
    app.put('/set_licensing_info', middlewares_1.authenticateRequest, routeHandlers_1.setLicensingInfo);
    app.put('/update_entitlement', middlewares_1.authenticateRequest, routeHandlers_1.updateEntitlement);
    app.delete('/set_licensing_info', middlewares_1.authenticateRequest, routeHandlers_1.deleteLicensingInfo);
    // Fallback endpoint for handling requests coming in from react.
    // NOTE: This endpoint does not need authentication
    // NOTE: Comment out if working with react dev server
    app.get('*', routeHandlers_1.fallbackEndpoint);
}
exports.addRoutes = addRoutes;
//# sourceMappingURL=routes.js.map