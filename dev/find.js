const util = require("util");

let count = 0;

function handle(ref) {
    console.log(ref);
    ref.object = "Replaced by " + count++;
    return; 
}

function iterate(o, key, f) {
    //Early return
    if( o[key] ){
        return f(o[key]);
    }
    let result, p; 
    for (p in o) {
        // eslint-disable-next-line no-prototype-builtins
        if( o.hasOwnProperty(p) && typeof o[p] === 'object' ) {
            result = iterate(o[p], key, f);
            if(result){
                return result;
            }
        }
    }
    return result;
}

let message = { my: { deep: { object: "Hallo", deeplink: { "#ref": { object: "path to object 2", label: "name of object 2"} } }}, link: { "#ref": { object: "path to object", label: "name of object 1"} }};
iterate(message, "#ref", handle);
console.log(util.inspect(message, true, 99, true));
