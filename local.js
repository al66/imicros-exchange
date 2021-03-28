process.env.CASSANDRA_CONTACTPOINTS = "192.168.2.124";
process.env.CASSANDRA_DATACENTER = "datacenter1";
process.env.CASSANDRA_KEYSPACE = "imicros_messages";

module.exports =  {
    "collectCoverageFrom": [
        "lib/*.js",
        "lib/util/*.js",
        "!node_modules/",
        "!/dev/",
        "!test/helper/*.js"
    ],
    "testPathIgnorePatterns": [
        "/node_modules/",
        "/dev/"
    ],
    "rootDir": ".",
    "roots": [
        "./test"
    ]
};

