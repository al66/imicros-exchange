const { credentials } = require("./credentials");

// mock service agents
const Agents = {
    name: "agents",
    actions: {
        login: {
            params: {
                serviceId: { type: "uuid" },
                authToken: { type: "string", min: 20 }
            },
            async handler({ params: { serviceId, authToken }}) {
                this.logger.info("agents.login called", { serviceId, authToken } );
                if (serviceId === credentials.serviceId && authToken === credentials.authToken) return { serviceToken: credentials.serviceToken };
                throw new Error("Login failed");
            }
        },
        grantAccess: {
            async handler({ meta: { acl: { ownerId }, service: { serviceToken } } }) {
                this.logger.info("agents.grantAccess called", { ownerId, serviceToken } );
                if (!ownerId) throw new Error("not authorized");
                if (!serviceToken) throw new Error("service not authorized");
                if (serviceToken === credentials.serviceToken && ownerId === credentials.ownerId) return true;
                return false;
            }
        },
        requestAccess: {
            params: {
                ownerId: { type: "string" }
            },
            async handler({ params: { ownerId }, meta: { service: { serviceToken }} }) {
                this.logger.info("agents.requestAccess called", { ownerId, serviceToken } );
                if (!ownerId) throw new Error("not authorized");
                if (!serviceToken) throw new Error("service not authorized");
                if (serviceToken === credentials.serviceToken && ( ownerId === credentials.ownerId || ownerId === credentials.partnerId ) ) return { token: credentials.accessToken };
                throw new Error("failed to retrieve access token");
            }
        }
    }
};

module.exports = {
    Agents
};
