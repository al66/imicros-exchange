"use-strict";

const fs = require("fs");
//const es = require("event-stream");
//const split = require("split");
const {Transform} = require("stream");
const Chain = require("stream-chain");
const Lines = require("../lib/transform/lines");
const Fixed2json = require("../lib/transform/fixed2json");

let stream = fs.createReadStream("assets/test1.txt");

let script = JSON.parse(fs.readFileSync("assets/script1.json").toString());
// Convert Regex
function walker(obj) {
    let k,
        has = Object.prototype.hasOwnProperty.bind(obj);
    for (k in obj) if (has(k)) {
        switch (typeof obj[k]) {
            case "object":
                walker(obj[k]); break;
            case "string":
                if (obj[k].toLowerCase() === "match") obj[k] = new RegExp(obj[k]);
        }
    }
}
walker(script);

let merge = new Transform({
    objectMode: true,
    transform: function transformer(obj, encoding, callback){
        // callback(<error>, <result>)
        this.push(obj);
        callback();
    },
    flush: function final(callback) {
        //if (message) this.push(message);
        callback();
    }
});

let chain = new Chain([
    new Lines(),
    new Fixed2json(script),
    //transform,
    merge,
    function(message){
        console.log("Message:", message);
    }
]);

stream
.pipe(chain)
/*
.pipe(es.mapSync(function(message){
    console.log("Message:", message);
}))
*/
.on("error", (err) => {
    console.log("Error while reading file.", err);
})
.on("end", () => {
    console.log("Read entire file.");
});

