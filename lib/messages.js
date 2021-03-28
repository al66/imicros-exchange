/**
 * @license MIT, imicros.de (c) 2021 Andreas Leinen
 */
"use strict";

const Connector = require("./database/cassandra");
const Constants = require("./util/constants");
const { v4: uuid } = require("uuid");

module.exports = {
    name: "messages",
    
    /**
     * Service settings
     */
    settings: {
        /*
        cassandra: {
            contactPoints: ["192.168.2.124"],
            datacenter: "datacenter1",
            keyspace: "imicros_messages",
            whitelistTable: "allowed",
            messageTable: "messages"
        },
        services: {
            agents: "agents"
        }
        */
    },

    /**
     * Service metadata
     */
    metadata: {},

    /**
     * Service dependencies
     */
    //dependencies: [],	

    /**
     * Actions
     */
    actions: {
        
        /**
         * Send a message 
         * 
         * @param {String} receiver -   uuid
         * @param {Object} message  -   message (can have ref links to objects)
         * 
         * @returns {Object} result -   { messageId, success, errors }
         */
        send: {
            acl: "before",
            params: {
                receiver: { type: "uuid" },
                message: { type: "object" }
            },
            async handler(ctx) {
                let owner = ctx.meta?.ownerId ?? null;
                if (!owner) return { success: false, errors: [{ code: Constants.ERROR_NOT_AUTHORIZED, message: "not authorized" }]};

                // create message entry in owners outbox and retrieve messageId
                let { messageId } = await this.connector.addMessage({ owner, box: Constants.OUTBOX, partner: ctx.params.receiver, status: Constants.STATUS_SEND });
                if (!messageId) return { success: false, errors: [{ code: Constants.ERROR_ADD_MESSAGE_OUT, message: "failed to add message" }]};

                // message will be updated and saved
                let message = ctx.params.message;

                // set id's for referenced objects
                await this.setAppendixId({ message });

                // save message to folder messages of sender group
                try {
                    await this.putObject({ ctx, objectName: `~messages/${messageId}.message`, value: message });
                } catch (err) {
                    this.logger.debug("Failed to save message at sender");
                    return { success: false, errors: [{ code: 103, message: "failed to save message in folder" }]};
                }

                // check, if group is on whitelist of receiver
                let allowed = await this.connector.isAllowed({ owner: ctx.params.receiver, sender: owner });
                if (!allowed) return { success: false, errors: [{ code: Constants.ERROR_NOT_ACCEPTED, message: "not accepted by receiver" }]};

                // create message entry in receivers inbox
                let result = await this.connector.addMessage({ owner: ctx.params.receiver, box: Constants.INBOX, partner: owner, status: Constants.STATUS_RECEIVE, id: messageId });
                if (!result) return { success: false, errors: [{ code: Constants.ERROR_ADD_MESSAGE_IN, message: "failed to add message in receivers inbox" }]};

                // request access for receiver
                let meta;
                try {
                    meta = await this.getMeta({ ownerId: ctx.params.receiver });
                } catch (err) {
                    this.logger.debug("Failed to retrieve access token for receiver");
                    return { success: false, errors: [{ code: Constants.ERROR_REQUEST_ACCESS, message: "failed to retrieve access for receiver" }]};
                }

                // save referenced object to folder messages of receiver group and replace references by new ones
                try {
                    await this.sendAppendix({ ctx, receiver: { ownerId: ctx.params.receiver, meta }, messageId, message });
                } catch (err) {
                    this.logger.debug("Failed to save referenced objects at receiver");
                    return { success: false, errors: [{ code: Constants.ERROR_SAVE_APPENDIX_IN, message: "failed to save referenced objects at receiver" }]};
                }

                // save message to folder messages of receiver group
                try {
                    await this.putObject({ ctx: { meta }, objectName: `~messages/${messageId}.message`, value: message });
                } catch (err) {
                    this.logger.debug("Failed to save message at receiver");
                    return { success: false, errors: [{ code: Constants.ERROR_SAVE_MESSAGE_IN, message: "failed to save message at receiver" }]};
                }
                
                // confirm message sent
                result = await this.connector.updateStatus({ owner: ctx.params.receiver, status: Constants.STATUS_COMPLETE, id: messageId });
                if (!result) return { success: false, errors: [{ code: Constants.ERROR_CONFIRM_MESSAGE_SENT, message: "failed to update message status in receivers inbox" }]};
                result = await this.connector.updateStatus({ owner, status: Constants.STATUS_COMPLETE, id: messageId });
                if (!result) return { success: false, errors: [{ code: Constants.ERROR_CONFIRM_MESSAGE_SENT, message: "failed to update message status in senders outbox" }]};

                // return response
                return { success: true, messageId };
            }
        },
        
        /**
         * Delete a message 
         * 
         * @param {String} messageId -   uuid
         * 
         * @returns {Object} result -   { success, errors }
         */
        delete: {
            acl: "before",
            params: {
                messageId: { type: "uuid" }
            },
            async handler(/*ctx*/) {
                // get message entry

                // mark message entry as deleted

                // if inbox, get message and delete referenced objects from folder messages
                // TODO

                // delete message from folder messages

                // confirm message deleted

                // return response
            }
        },
        
        /**
         * List messages
         * 
         * @param {Object} search   -   search parameter
         * 
         * @returns {Object} result -   { data, errors }
         */
        list: {
            acl: "before",
            params: {
                search: { type: "object",
                    props: {
                        inbox: { type: "boolean", default: true },
                        outbox: { type: "boolean", default: true },
                        groupId: { type: "uuid", optional: true },
                        time: { type: "object", optional: true,
                            props: {
                                from: { type:"date" },
                                to: { type:"date" }
                            }
                        },
                        limit: { type: "number", positive: true, integer: true, optional: true }
                    }
                }
            },
            async handler(ctx) {
                let owner = ctx.meta?.ownerId ?? null;
                if (!owner) return { success: false, errors: [{ code: Constants.ERROR_NOT_AUTHORIZED, message: "not authorized" }]};

                // query list
                let result = await this.connector.list({ owner, search: ctx.params.search });
                if (!result) return { errors: [{ code: Constants.ERROR_DATABASE, message: "database query failed" }]};
                return { data: result };
            }
        },
        
        /**
         * Get a message 
         * 
         * @param {String} messageId -   uuid
         * 
         * @returns {Object} result -   { data, errors }
         */
        get: {
            acl: "before",
            params: {
                messageId: { type: "uuid" }
            },
            async handler(ctx) {
                let owner = ctx.meta?.ownerId ?? null;
                if (!owner) return { success: false, errors: [{ code: Constants.ERROR_NOT_AUTHORIZED, message: "not authorized" }]};

                let result = {};
                try {
                    result.message = await this.getObject({ ctx, objectName: `~messages/${ctx.params.messageId}.message` });
                } catch (err) {
                    this.logger.debug("Failed to read message", { messageId: ctx.params.messageId });
                    return { success: false, errors: [{ code: Constants.ERROR_READ_MESSAGE, message: "failed to read message" }]};
                }

                return result;
            }
        },
        
        /**
         * Accept 
         * 
         * @param {String} groupId  -   uuid
         * @param {String} label    -   label for this group
         * 
         * @returns {Object} result -   { success, errors }
         */
        accept: {
            acl: "before",
            params: {
                groupId: { type: "uuid" },
                label: { type: "string" }
            },
            async handler(ctx) {
                let owner = ctx.meta?.ownerId ?? null;
                if (!owner) return { success: false, errors: [{ code: Constants.ERROR_NOT_AUTHORIZED, message: "not authorized" }]};

                // retrieve grant token for this service (necessary for send task)
                const meta = ctx.meta;
                meta.service = { serviceToken: this.serviceToken };
                let granted = await ctx.call(this.services.agents + ".grantAccess",{},{ meta });
                if (!granted) throw new Error("Failed to grant access for service");

                // add to whitelist
                let result = await this.connector.accept({owner, sender: ctx.params.groupId, label: ctx.params.label });
                if (!result) return { success: false, errors: [{ code: Constants.ERROR_UPDATE_WHITELIST, message: "database update failed" }]};
                return { success: true };
            }
        },
        
        /**
         * Decline 
         * 
         * @param {String} groupId -   uuid
         * 
         * @returns {Object} result -   { success, errors }
         */
        decline: {
            acl: "before",
            params: {
                groupId: { type: "uuid" }
            },
            async handler(ctx) {
                let owner = ctx.meta?.ownerId ?? null;
                if (!owner) return { success: false, errors: [{ code: Constants.ERROR_NOT_AUTHORIZED, message: "not authorized" }]};

                // remove from whitelist
                let result = await this.connector.decline({owner, sender: ctx.params.groupId });
                if (!result) return { success: false, errors: [{ code: Constants.ERROR_UPDATE_WHITELIST, message: "database update failed" }]};
                return { success: true };
            }
        },
        
        /**
         * List allowed groups 
         * 
         * @returns {Object} result -   { data, errors }
         */
        allowed: {
            acl: "before",
            params: {
            },
            async handler(ctx) {
                let owner = ctx.meta?.ownerId ?? null;
                if (!owner) return { success: false, errors: [{ code: Constants.ERROR_NOT_AUTHORIZED, message: "not authorized" }]};

                // query whitelist
                let result = await this.connector.whitelst({ owner });
                if (!result) return { errors: [{ code: Constants.ERROR_DATABASE, message: "database query failed" }]};
                return { data: result };
            }
        },
        
        /**
         * check, if group is on whitelist 
         * 
         * @returns {Boolean} result
         */
        isAllowed: {
            acl: "before",
            params: {
                groupId: { type: "uuid" }
            },
            async handler(ctx) {
                let owner = ctx.meta?.ownerId ?? null;
                if (!owner) return { success: false, errors: [{ code: Constants.ERROR_NOT_AUTHORIZED, message: "not authorized" }]};

                // check whitelist
                let result = await this.connector.isAllowed({ owner, sender: ctx.params.groupId });
                return result;
            }
        }

    },

    /**
     * Events
     */
    events: {},

    /**
     * Methods
     */
    methods: {
        
        async getMeta({ ownerId }) {
            let accessToken;
            let opts = {
                meta: {
                    service: {
                        serviceId: this.serviceId,
                        serviceToken: this.serviceToken
                    }
                }
            };
            try {
                let res = await this.broker.call(this.services.agents + ".requestAccess", { ownerId }, opts);
                if (res && res.token) accessToken = res.token;
            } catch (err) {
                this.logger.error("Failed to retrieve access token", { ownerId });
            }
            return {
                service: {
                    serviceId: this.serviceId,
                    serviceToken: this.serviceToken
                },
                ownerId,
                acl: {
                    accessToken,
                    ownerId
                }
            };
        },

        async iterate(o, key, f) {
            if( o[key] ){
                return await f(o[key]);
            }
            let result, p; 
            for (p in o) {
                // eslint-disable-next-line no-prototype-builtins
                if( o.hasOwnProperty(p) && typeof o[p] === "object" ) {
                    result = await this.iterate(o[p], key, f);
                    if(result){
                        return result;
                    }
                }
            }
            return result;
        },

        async setAppendixId({ message }) {
            function setId(ref) {
                if (ref["object"]) ref.id = uuid();
            }
            await this.iterate(message, "#ref", setId);
        },

        async sendAppendix({ ctx, receiver: { ownerId = null, meta = {} }, messageId, message }) {
            let self = this;
            async function pipe (ref) {
                if (!ref || !ref.object || !ref.id) return;
                let targetName = `~messages/${ messageId }.${ ref.id }`;
                self.logger.debug("copy appendix", { source: ref.object, receiver: ownerId, target: targetName });
                let source = await self.getStream({ ctx, objectName: ref.object });
                let target = await self.pipeStream({ ctx: { meta }, objectName: targetName });
                target.on("error", (err) => { 
                    self.logger.debug("error during streaming", { receiver: ownerId, targetName });
                    throw err;
                });
                await source.pipe(target);
            }
            await this.iterate(message, "#ref", pipe);
            // wait for encryption and zip
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
    },

    /**
     * Service created lifecycle event handler
     */
    async created() { 

        this.connector = new Connector({ broker: this.broker, options: this.settings });

        // map service names and wait for services
        this.services = { 
            agents: this.settings?.services?.agents ?? "agents"
        };
        await this.broker.waitForServices(Object.values(this.services));

    },

    /**
     * Service started lifecycle event handler
     */
    async started() { 

        // connect to db
        await this.connector.connect();

        const serviceId = process.env.SERVICE_ID;
        const authToken = process.env.SERVICE_AUTH_TOKEN;        
        const { serviceToken } = await this.broker.call(this.services.agents + ".login", { serviceId, authToken});
        if (!serviceToken) throw new Error("failed to login service");
        this.serviceToken = serviceToken;

    },

    /**
     * Service stopped lifecycle event handler
     */
    async stopped() { 

        // disconnect from db
        await this.connector.disconnect();

    }

};