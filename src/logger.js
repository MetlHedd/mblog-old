const cf = require("colorfy")

function getParams(printParam) {
    let params = printParam.match(/[^\{@}]+/g)
    let ar = []
    for (let i = 0; i < params.length; i++){
        if (params[i] == "time") {
            let d = new Date()
            ar.push("["+(d.getDate())+"/"+(d.getMonth())+"/"+(d.getFullYear())+" "+(d.toLocaleTimeString())+"]")
        }
    }

    return ar
}

class logger {
    constructor(options) {
        this.printParam = ""

        if (typeof(options) === "object") {
            if (options["timeStamp"]) this.printParam += "{@time}"
            this.printParam += "{@msg}"
        } else {
            this.printParam = "{@msg}"
        }
    }

    log() {
        let toPrint = ""
        let params = getParams(this.printParam)

        for (let i = 0; i < arguments.length; i++) {
            toPrint += arguments[i].toString()+" "
        }

        console.log(cf().green("[Log] ", "bold").dgrey(params.join(" "), "").txt(" "+toPrint, "italic").colorfy())
    }

    sucess() {
        let toPrint = ""
        let params = getParams(this.printParam)

        for (let i = 0; i < arguments.length; i++) {
            toPrint += arguments[i].toString()+" "
        }

        console.log(cf().dgreen("[Sucess] ", "bold").dgrey(params.join(" "), "").txt(" "+toPrint, "italic").colorfy())
    }

    info() {
        let toPrint = ""
        let params = getParams(this.printParam)

        for (let i = 0; i < arguments.length; i++) {
            toPrint += arguments[i].toString()+" "
        }

        console.log(cf().azure("[Info] ", "bold").dgrey(params.join(" "), "").txt(" "+toPrint, "italic").colorfy())
    }

    warn() {
        let toPrint = ""
        let params = getParams(this.printParam)

        for (let i = 0; i < arguments.length; i++) {
            toPrint += arguments[i].toString()+" "
        }

        console.log(cf().orange("[Warn] ", "bold").dgrey(params.join(" "), "").txt(" "+toPrint, "italic").colorfy())
    }

    error() {
        let toPrint = ""
        let params = getParams(this.printParam)

        for (let i = 0; i < arguments.length; i++) {
            toPrint += arguments[i].toString()+" "
        }

        console.log(cf().pink("[Error] ", "bold").dgrey(params.join(" "), "").txt(" "+toPrint, "italic").colorfy())
    }
}

module.exports = logger