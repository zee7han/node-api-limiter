module.exports.start = (req, res) => {
    res.status(200).send({
        message: "start successful"
    })
}

module.exports.stop = (req, res) => {
    res.status(200).send({
        message: "stop successful"
    })
}