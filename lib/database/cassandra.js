/**
 * @license MIT, imicros.de (c) 2018 Andreas Leinen
 */
"use strict";

const Cassandra = require("cassandra-driver");
const { v4: uuid } = require("uuid");
const Constants = require("../util/constants");

class connector {
     
    constructor ({ broker, options }) {
         
        this.broker = broker;
        this.logger = this.broker.logger;
 
        /* istanbul ignore else */
        if (!this.client) {
            this.contactPoints = (options?.cassandra?.contactPoints ?? "127.0.0.1" ).split(",");
            this.datacenter = options?.cassandra?.datacenter ?? "datacenter1";
            this.keyspace = options?.cassandra?.keyspace ?? "imicros_messages";
            this.whitelistTable = options?.cassandra?.whitelistTable ?? "allowed";
            this.messageTable = options?.cassandra?.messageTable ?? "messages";
            this.cassandra = new Cassandra.Client({ contactPoints: this.contactPoints, localDataCenter: this.datacenter, keyspace: this.keyspace });
        }
         
    }

    async addMessage ({ owner, box, partner, status, id }) {
        let query = "UPDATE " + this.messageTable + " SET box = :box, partner = :partner, timestamp = toTimeStamp(now()), status = :status WHERE owner = :owner AND message = :id;";
        let params = { 
            owner, 
            id: id || uuid(),
            box, 
            partner,
            status
        };
        try {
            await this.cassandra.execute(query, params, {prepare: true});
            return { messageId: params.id };
        } catch (err) /* istanbul ignore next */ {
            this.logger.error("Cassandra insert error", { error: err.message, query: query, params: params });
            return false;
        }
    }

    async list ({ owner, search }) {
        let query = "SELECT message, box, partner, timestamp, status FROM " + this.messageTable + " WHERE owner = :owner LIMIT " + (search.limit || 10000)  + ";";
        let params = { 
            owner
        };
        try {
            let result = [];
            let resultSet = await this.cassandra.execute(query, params, {prepare: true});
            for (const row of resultSet) {
                // late filtering
                if (!search.inbox && row["box"] === Constants.INBOX) continue;
                if (!search.outbox && row["box"] === Constants.OUTBOX) continue;
                if (search.groupId && row["partner"].toString() !== search.groupId ) continue;
                if (search.time && ( row["timestamp"] < search.time.from || row["timestamp"] > search.time.to )) continue;
                result.push({
                    messageId: row["message"].toString(),
                    box: row["box"],
                    partnerId: row["partner"].toString(),
                    timestamp: row["timestamp"],
                    status: row["status"]
                });
            }
            return result;
        } catch (err) /* istanbul ignore next */ {
            this.logger.error("Cassandra insert error", { error: err.message, query: query, params: params });
            return false;
        }

    }

    async updateStatus ({ owner, id, status }) {
        let query = "UPDATE " + this.messageTable + " SET status = :status WHERE owner = :owner AND message = :id;";
        let params = { 
            owner, 
            id,
            status
        };
        try {
            await this.cassandra.execute(query, params, {prepare: true});
            return true;
        } catch (err) /* istanbul ignore next */ {
            this.logger.error("Cassandra insert error", { error: err.message, query: query, params: params });
            return false;
        }
    }
    
    async accept ({ owner, sender, label }) {
        let query = "INSERT INTO " + this.whitelistTable + " (owner,sender,label) VALUES (:owner,:sender,:label);";
        let params = { 
            owner, 
            sender, 
            label
        };
        try {
            await this.cassandra.execute(query, params, {prepare: true});
            return true;
        } catch (err) /* istanbul ignore next */ {
            this.logger.error("Cassandra insert error", { error: err.message, query: query, params: params });
            return false;
        }
    }
     
    async decline ({ owner, sender }) {
        let query = "DELETE FROM " + this.whitelistTable + " WHERE owner = :owner AND sender = :sender;";
        let params = { 
            owner, 
            sender
        };
        try {
            await this.cassandra.execute(query, params, {prepare: true});
            return true;
        } catch (err) /* istanbul ignore next */ {
            this.logger.error("Cassandra insert error", { error: err.message, query: query, params: params });
            return false;
        }
    }
     
    async whitelst ({ owner }) {
        let query = "SELECT sender, label FROM " + this.whitelistTable + " WHERE owner = :owner;";
        let params = { 
            owner
        };
        try {
            let result = [];
            let resultSet = await this.cassandra.execute(query, params, {prepare: true});
            for (const row of resultSet) {
                result.push({
                    id: row["sender"].toString(),
                    label: row["label"]
                });
            }
            return result;
        } catch (err) /* istanbul ignore next */ {
            this.logger.error("Cassandra insert error", { error: err.message, query: query, params: params });
            return false;
        }

    }
    
    async isAllowed ({ owner, sender }) {
        let query = "SELECT sender FROM " + this.whitelistTable + " WHERE owner = :owner AND sender = :sender;";
        let params = { 
            owner,
            sender
        };
        try {
            let resultSet = await this.cassandra.execute(query, params, {prepare: true});
            let result = ((resultSet.rows[0]?.sender ?? null) !== null) ? true : false;
            return result;
        } catch (err) /* istanbul ignore next */ {
            this.logger.error("Cassandra query error", { error: err.message, query: query, params: params });
            return false;
        }

    }
    

    /**
      * Connect to database
      */
    async connect() {

        // connect to cassandra cluster
        await this.cassandra.connect();
        this.logger.info("Connected to cassandra", { contactPoints: this.contactPoints, datacenter: this.datacenter, keyspace: this.keyspace });

        // create tables, if not exists
        let query = `CREATE TABLE IF NOT EXISTS ${this.keyspace}.${this.whitelistTable} `;
        query += " ( owner varchar, sender uuid, label varchar, PRIMARY KEY (owner,sender) ) ";
        query += " WITH comment = 'whitelist sender';";
        await this.cassandra.execute(query);

        query = `CREATE TABLE IF NOT EXISTS ${this.keyspace}.${this.messageTable} `;
        query += " ( owner uuid, message uuid, box smallint, partner uuid, timestamp timestamp, status smallint, PRIMARY KEY (owner,message) ) ";
        query += " WITH comment = 'messages';";
        await this.cassandra.execute(query);
        
    }
 
    /**
      * Disconnect from database
      */
    async disconnect() {
         
        /* istanbul ignore next */
        if (!this.cassandra) return Promise.resolve();

        // close all open connections to cassandra
        await this.cassandra.shutdown();
        this.logger.info("Disconnected from cassandra", { contactPoints: this.contactPoints, datacenter: this.datacenter, keyspace: this.keyspace });
         
    }
 
}
 
module.exports = connector;