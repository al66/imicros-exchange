const parse = require("json-templates");

let template = parse({
    "magic_key_{{magic}}": {
        "{{magic}}_1": "interpolation is nice {{deep.1.value}}",
        "{{magic}}_2": "interpolation is nice {{deep.2.value:default}}"
    }
});

let result = template(
  { magic: "key", deep: [ { value: "also deep" }, { value: "also second" } ] }
);

console.log(result);
