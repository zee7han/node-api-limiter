module.exports = {
    key_gnrtr: (req, res) => {
        return req["ip"]
    },
    skip_ip: (req, ip_list) => {
        let skp = false
        if (ip_list.includes(req["ip"])) {
            skp = true
        }
        return skp

    },
    rs_hndlr: (res, body) => {
        res.status(body["statusCode"]).send(body);
        return
    },
    lmt_rchd: (req, res) => {

    },
    skip_route: (req, path_list) => {
        // As path should be some exact route or few routes start with /api and all 
        // so we are checking for all the possible combination for that.
        let skp = false
        for (let i = 0; i < path_list["length"]; i++) {
            let ful_pth = req["baseUrl"] + req["path"]
            if (ful_pth.startsWith(path_list[i], 0)) {
                skp = true
                break;
            }
        }
        return skp
    },
    calculateNextResetTime: (windowMs) => {
        const d = new Date();
        d.setMilliseconds(d.getMilliseconds() + windowMs);
        return d;
    }
}