const express = require('express');
const config = require("../storage/config.json")

class App {
    constructor(logger) {
        this.app = express()
        
        this.app.set('view engine', 'squirrelly')
        this.app.use(express.static("public"))

        this.app.get("/", (req, res) => {
            res.render("index", {partials: {menu: "aaa"}, mn: "333"})
        })
        
        this.app.listen(config.serverDetails.port, () => {
            logger.info("O servidor express está rodando na porta:", config.serverDetails.port)
        })
    }
}

module.exports = App