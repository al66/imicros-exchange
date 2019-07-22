const { transform } = require("json4json");
const template = "{{console.log('hello from template')}}";
const data = {val: 1};
const result = transform(template, data); // 1
console.log(result);