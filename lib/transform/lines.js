/**
 * @license MIT, imicros.de (c) 2019 Andreas Leinen
 *
 */
"use strict";

const {Transform} = require("stream");
const { StringDecoder } = require("string_decoder");

// Split stream into single lines
class Lines extends Transform {
    constructor() {
        super();
        this.decoder = new StringDecoder();
        this.tail = null;
    }
    _transform(chunk, encoding, callback) {
        let matcher = /\r?\n/;
        
        let lines = ((this.tail != null ? this.tail : "") + this.decoder.write(chunk)).split(matcher);
        this.tail = lines.pop();
        
        for (let i=0; i<lines.length; i++) this.push(lines[i]);
        callback();
    }
    _flush(callback) {
        if (this.rest) this.push(this.rest);
        callback();
    }
}

module.exports = Lines;
