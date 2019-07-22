const object = require("json-templater/object");

let template = {
    "magic_key_{{magic}}": {
        "key": "interpolation is nice {{deep[1].value}}"
    }
};

let result = object(
  template,
  { magic: "key", deep: [ { value: "also deep" }, { value: "also second" } ] }
);

console.log(result);
