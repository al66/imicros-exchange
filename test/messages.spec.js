"use strict";

const { ServiceBroker } = require("moleculer");
const { Messages } = require("../index");
const { v4: uuid } = require("uuid");

// helper & mocks
const { Agents } = require("./helper/agents");
const { credentials } = require("./helper/credentials");
const { Store, load, store } = require("./helper/store");

// service authentifcation
process.env.SERVICE_ID = credentials.serviceId;
process.env.SERVICE_AUTH_TOKEN = credentials.authToken;

describe("Test template service", () => {

    let broker, service;
    let opts, userId = uuid(), groupId = credentials.ownerId;
    let sender = [{ id: uuid(), label: "first sender" }, { id: credentials.partnerId, label: "second sender" }];

    beforeAll(() => {
    });
    
    afterAll(() => {
    });
    
    describe("Test create service", () => {

        it("it should start the broker", async () => {
            broker = new ServiceBroker({
                logger: console,
                logLevel: "debug" // "info" //"debug"
            });
            service = await broker.createService(Messages, Object.assign({ 
                name: "messages",
                mixins: [Store()],
                settings: { 
                    cassandra: {
                        contactPoints: process.env.CASSANDRA_CONTACTPOINTS || "127.0.0.1", 
                        datacenter: process.env.CASSANDRA_DATACENTER || "datacenter1", 
                        keyspace: process.env.CASSANDRA_KEYSPACE || "imicros_flow" 
                    }
                }
            }));
            // Start additional services
            [Agents].map(service => { return broker.createService(service); }); 
            await broker.start();
            expect(service).toBeDefined();
        });

    });

    describe("Test whitelist ", () => {

        beforeEach(() => {
            opts = { meta: { user: { id: userId , email: `${userId}@host.com` }, ownerId: groupId, acl: { ownerId: groupId } } };
        });

        it("it should return empty list", () => {
            let params = {
            };
            return broker.call("messages.allowed", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res.data).toBeDefined();
                expect(res.data.length).toEqual(0);
                expect(res.data).toEqual([]);
            });
        });
       
        it("it should add sender to whitelist ", () => {
            let params = {
                groupId: sender[0].id,
                label: sender[0].label
            };
            return broker.call("messages.accept", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res.success).toEqual(true);
            });
        });

        it("it should add second sender to whitelist ", () => {
            let params = {
                groupId: sender[1].id,
                label: sender[1].label
            };
            return broker.call("messages.accept", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res.success).toEqual(true);
            });
        });
       
        it("it should list both sender ", () => {
            let params = {
            };
            return broker.call("messages.allowed", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res.data).toBeDefined();
                expect(res.data).toContainEqual(sender[0]);
                expect(res.data).toContainEqual(sender[1]);
            });
        });
       
        it("it should remove first sender from whitelist ", () => {
            let params = {
                groupId: sender[0].id
            };
            return broker.call("messages.decline", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res.success).toEqual(true);
            });
        });
       
        it("it should list second sender only", () => {
            let params = {
            };
            return broker.call("messages.allowed", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res.data).toBeDefined();
                expect(res.data.length).toEqual(1);
                expect(res.data).toContainEqual(sender[1]);
            });
        });
       
        it("it should confirm second sender", () => {
            let params = {
                groupId: sender[1].id
            };
            return broker.call("messages.isAllowed", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res).toEqual(true);
            });
        });

        it("it should not confirm first deleted sender", () => {
            let params = {
                groupId: sender[0].id
            };
            return broker.call("messages.isAllowed", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res).toEqual(false);
            });
        });

    });

    describe("Test messages ", () => {

        let messageId;

        beforeEach(() => {
            opts = { meta: { user: { id: userId , email: `${userId}@host.com` }, ownerId: groupId, acl: { ownerId: groupId } } };
        });

        it("it should send a simple message", () => {
            opts = { meta: { user: { id: userId , email: `${userId}@host.com` }, ownerId: credentials.partnerId, acl: { ownerId: credentials.partnerId } } };
            let params = {
                receiver: groupId,
                message: {
                    a: 5,
                    b: 6
                }
            };
            return broker.call("messages.send", params, opts).then(res => {
                expect(res).toBeDefined();
                console.log(res);
                console.log(store);
                expect(res.success).toEqual(true);
                expect(res.messageId).toBeDefined();
                messageId = res.messageId;
            });
        });

        it("it should get the message by sender", () => {
            opts = { meta: { user: { id: userId , email: `${userId}@host.com` }, ownerId: credentials.partnerId, acl: { ownerId: credentials.partnerId } } };
            let params = {
                messageId
            };
            return broker.call("messages.get", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res.message).toBeDefined();
                expect(res.message).toEqual({ a: 5, b: 6 });
            });
        });

        it("it should get the message by receiver", () => {
            let params = {
                messageId
            };
            return broker.call("messages.get", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res.message).toBeDefined();
                expect(res.message).toEqual({ a: 5, b: 6 });
                console.log(res.message);
            });
        });

        it("it should send a message with referenced objects", () => {
            opts = { meta: { user: { id: userId , email: `${userId}@host.com` }, ownerId: credentials.partnerId, acl: { ownerId: credentials.partnerId } } };
            let params = {
                receiver: groupId,
                message: {
                    a: {
                        deeplink: {
                            "#ref": {
                                object: "object1.txt",
                                label: "Object 1"
                            }
                        }
                    },
                    link: {
                        "#ref": {
                            object: "object2.txt",
                            label: "Object 2"
                        }
                    }
                }
            };
            return broker.call("messages.send", params, opts).then(res => {
                expect(res).toBeDefined();
                console.log(res);
                console.log(store);
                expect(res.success).toEqual(true);
            });
        });

        it("it should get the messages by receiver", () => {
            let params = {
                search: {
                    inbox: true,
                    outbox: true,
                    time: {
                        from: new Date(Date.now()-10000),   // - 10 s
                        to: new Date(Date.now()+10000)      // + 10 s
                    }
                }
            };
            return broker.call("messages.list", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res.data).toBeDefined();
                expect(res.data.length).toEqual(2);
                console.log(res.data);
            });
        });

        it("it should get empty messages list due to unselected inbox", () => {
            let params = {
                search: {
                    inbox: false,
                    outbox: true
                }
            };
            return broker.call("messages.list", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res.data).toBeDefined();
                expect(res.data.length).toEqual(0);
            });
        });

        it("it should get the messages by sender", () => {
            opts = { meta: { user: { id: userId , email: `${userId}@host.com` }, ownerId: credentials.partnerId, acl: { ownerId: credentials.partnerId } } };
            let params = {
                search: {
                    inbox: true,
                    outbox: true
                }
            };
            return broker.call("messages.list", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res.data).toBeDefined();
                expect(res.data.length).toEqual(2);
                console.log(res.data);
            });
        });

    });
        
    describe("Test stop broker", () => {
        it("should stop the broker", async () => {
            expect.assertions(1);
            await broker.stop();
            expect(broker).toBeDefined();
        });
    });    
    
});