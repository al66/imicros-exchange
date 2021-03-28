const fs = require("fs");
const { credentials } = require("./credentials");

let store = {};

function load (ownerId, objectName, filePath) {
    let internal = Buffer.from(ownerId + "~" + objectName).toString("base64");
    store[internal] = fs.readFileSync(filePath).toString();
}

let count = 0;

// mock imicros-minio mixin
const Store = (/*options*/) => { return {
    methods: {
        async putString ({ ctx = null, objectName = null, value = null } = {}) {
            if ( !ctx || !objectName ) return false;
            
            let internal = Buffer.from(ctx.meta.acl.ownerId + "~" + objectName).toString("base64");
            
            this.store[internal] = value;
            return true;
        },
        async getString ({ ctx = null, objectName }) {
            if ( !ctx || !objectName ) throw new Error("missing parameter");

            let internal = Buffer.from(ctx.meta.acl.ownerId + "~" + objectName).toString("base64");
            
            return this.store[internal];            
        },
        async putObject ({ ctx = null, objectName = null, value = null } = {}) {
            if ( !ctx || !objectName ) return false;
            
            let internal = Buffer.from(ctx.meta.acl.ownerId + "~" + objectName).toString("base64");
            
            this.store[internal] = value;
            return true;
        },
        async getObject ({ ctx = null, objectName }) {
            if ( !ctx || !objectName ) throw new Error("missing parameter");

            let internal = Buffer.from(ctx.meta.acl.ownerId + "~" + objectName).toString("base64");
            
            return this.store[internal];            
        },
        async getStream ({ ctx = null, objectName = null } = {}) {
            if ( !ctx || !objectName ) throw new Error("missing parameter");
            if ( !ctx.meta.acl.ownerId === credentials.ownerId ) throw new Error("wrong authentification");
            this.logger.debug("getStream called", { objectName });

            let fstream = fs.createReadStream(`assets/object${++count}.txt`);
            return fstream;
        },
        async pipeStream ({ ctx = null, objectName = null } = {}) {
            if ( !ctx || !objectName ) throw new Error("missing parameter");
            if ( !ctx.meta.acl.ownerId === credentials.partnerId ) throw new Error("wrong authentification");
            this.logger.debug("pipeStream called", { objectName });
            
            let fstream = fs.createWriteStream(`assets/object${count}.piped.txt`);
            return fstream;
        }

    },
    created () {
        this.store = store;
    }
}; };

module.exports = {
    store,
    load,
    Store
};
