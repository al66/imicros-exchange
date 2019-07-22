const JSONStream = require("JSONStream");
const fs = require("fs");
const Chain = require("stream-chain");

let stream = fs.createReadStream("assets/script1.json");

let chain = new Chain([
    function(part) {
        //console.log("Part:", part);
        if (part.match) part.match = new RegExp(part.match);
        return part;
    },
    function(part){
        console.log("Part:", part);
    }
]);

stream
//.pipe(JSONStream.parse([/./,{recurse: true},/./]))
.pipe(JSONStream.parse(/./))
//.pipe(JSONStream.parse(["struct","control"]))
.pipe(chain)
.on("error", (err) => {
    console.log("Error while reading file.", err);
})
.on("end", () => {
    console.log("Read entire file.");
});



