"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Copyright 2024 The MathWorks, Inc.
const node_1 = require("vscode-languageserver/node");
class ClientConnection {
    /**
     * Retrieves the connection to the client. If no connection currently exists,
     * a new connection is created.
     *
     * @returns The connection to the client
     */
    static getConnection() {
        if (ClientConnection.connection == null) {
            ClientConnection.connection = (0, node_1.createConnection)(node_1.ProposedFeatures.all);
        }
        return ClientConnection.connection;
    }
    /**
     * Sets the ClientConnection to a given object.
     * This API is primarily meant for testing purposes.
     *
     * @param connection The connection object to set
     */
    static _setConnection(connection) {
        ClientConnection.connection = connection;
    }
    /**
     * Clears the current connection.
     * This API is primarily meant for testing purposes.
     */
    static _clearConnection() {
        ClientConnection.connection = undefined;
    }
}
exports.default = ClientConnection;
//# sourceMappingURL=ClientConnection.js.map