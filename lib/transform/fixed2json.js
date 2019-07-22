/**
 * @license MIT, imicros.de (c) 2019 Andreas Leinen
 *
 */
"use strict";

const {Transform} = require("stream");
const { StringDecoder } = require("string_decoder");

function move(str, struct) {
    let obj = {}, offset = 0;
    for (let i = 0; i<struct.length; i++) {
        if (struct[i].sub) {
            let len = 0;
            for (let n = 0; n<struct[i].sub.length; n++) len += (struct[i].sub[n].length ? struct[i].sub[n].length : 0 ) + (struct[i].sub[n].skip ? struct[i].sub[n].skip : 0 );
            while (offset < str.length) {
                obj[struct[i].name] ? null : obj[struct[i].name] = [];
                obj[struct[i].name].push(move(str.slice(offset,str.length),struct[i].sub));
                offset += len;
            }  
        } else {
            obj[struct[i].name] = str.slice(offset,offset+struct[i].length);
            offset += struct[i].length + ( struct[i].skip ? struct[i].skip : 0 );
        }
    }
    return obj;
}

function match(str, struct) {
    for (let i = 0; i< struct.length; i++) {
        if (str.match(struct[i].match)) return move(str, struct[i].struct); 
    }
}

// transform fixed length records into json objects
class Fixed2json extends Transform {
    constructor(script) {
        super({
            readableObjectMode: true 
        });
        
        this.readableObjectMode = true;
        
        this.decoder = new StringDecoder();
        this.script = script || null;
        this.message = null;
        this.lineNumber = 0;
    }
    _transform(chunk, encoding, callback) {

        let line = this.decoder.write(chunk);
        if (line.length < 1) return callback(); // empty line
        
        let control = {};

        for (let i = 0; i< this.script.control.length; i++) {
            if (line.match(this.script.control[i].match)) Object.assign(control,this.script.control[i].control); 
        }
        
        this.lineNumber += 1;
        
        if (control.new && this.message) this.push(this.message);
        if (control.new) this.message = { type: control.attr };
        if (this.message) {
            this.message.lines ? this.message.lines.push(this.lineNumber) : this.message.lines = [this.lineNumber]; 
        }
        if (this.message && !control.ignore) {
            let path = this.message;
            if (!control.attr) control.attr = "content";
            this.message[control.attr] ? path = this.message[control.attr] : path = this.message[control.attr] = [];
            if (this.script.struct) { 
                path.push(match(line,this.script.struct));
            } else {
                path.push(line);
            }
        }

        callback();

    }
    _flush(callback) {

        if (this.message) this.push(this.message);
        
        callback();
    }
}

module.exports = Fixed2json;

