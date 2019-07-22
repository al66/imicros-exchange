let str = [];
str.push("038C: Header       14.07.2019");
str.push("011A: Row 1   7.685,22+S  12.07.2019");
str.push("011B: Detail 1   Ref: 123456:REFA xyz:REFB abc");
str.push("011B: Detail 2   Ref: 789012");
str.push("011A: Row 2  11-735,11-H  13.07.2019");
str.push("073E: Footer   2   3.456,13+     593,76- 13.07.2019");

let struct = [
    { 
        match: /^038C/,
        struct: [
            { name: "type", length: 4 },
            { name: "separator", length: 1 },
            { name: "description", length: 14 },
            { name: "date", length: 10}
        ] 
    },
    {
        match: /^011A/,
        struct: [
            { name: "type", length: 4 },
            { name: "separator", length: 1 },
            { name: "description", length: 6 },
            { name: "amount", length: 12 },
            { name: "sign", length: 1, skip: 2 },
            { name: "date", length: 10}
        ]
    },
    {
        match: /^073E/,
        struct: [
            { name: "type", length: 4 },
            { name: "separator", length: 1, skip: 1 },
            { name: "description", length: 6 },
            { name: "rows", length: 4 },
            { name: "startBalance", length: 12 },
            { name: "endBalance", length: 12 },
            { name: "date", length: 10 }
        ]
    },
    {
        match: /^011B/,
        struct: [
            { name: "type", length: 4 },
            { name: "separator", length: 1 },
            { name: "description", length: 12 },
            { name: "referenceLabel", length: 4, skip: 1 },
            { name: "reference", length: 6, skip: 1 },
            { 
                name: "additional", 
                sub: [
                    { name: "referenceLabel", length: 3 },
                    { name: "referenceName", length: 1, skip: 1 },
                    { name: "reference", length: 3, skip: 1 }
                ], 
                min: 1, 
                max: 99 
            }
        ]
    }
];

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

for (let i=0; i< str.length; i++) console.log("Object:", match(str[i],struct));
