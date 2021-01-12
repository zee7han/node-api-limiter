const helper = require("../lib/helper.js")
const conf = require("./config.js")

describe("A test suite for the helper function", () => {

    test("A positive scenario for key_gnrtr.", () => {
        let result = helper["key_gnrtr"](conf["req"], {})
        expect(result).toBe(conf["req"]["ip"])
    });

    test("A positive scenario for skip_ip.", () => {
        let result = helper["skip_ip"](conf["req"], conf["ip_list"])
        expect(result).toBe(true)
    });

    test("A negative scenario for skip_ip.", () => {
        let result = helper["skip_ip"]({
            ip: "127.0.0.1"
        }, conf["ip_list"])
        expect(result).toBe(false)
    });

    test("A positive scenario for skip_route.", () => {
        let result = helper["skip_route"](conf["req"], conf["path_list"])
        expect(result).toBe(true)
    });

    test("A negative scenario for skip_route.", () => {
        let result = helper["skip_route"]({
            path: "/stop",
            baseUrl: ""
        }, conf["path_list"])
        expect(result).toBe(false)
    });

});