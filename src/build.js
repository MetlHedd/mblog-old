const sass = require('node-sass')
const fs = require("fs")

class Build {
    constructor(logger, sassPath, outputPath, callback) {
        this.logger = logger

        logger.info("Iniciando a build do main.sass ["+sassPath+"] para ["+outputPath+"]")

        sass.render({
            file: sassPath
        }, (er, result) => {
            if(er) {
                logger.error("A build do 'main.sass' não sucedeu resultando em: ", er)
            } else {
                let css = result.css
                logger.sucess("A build o 'main.sass' foi concluida")
                fs.writeFile(outputPath, css, 'utf8', (er) => {
                    if(er) {
                        logger.error("Não foi possível criar o arquivo em ["+outputPath+"], resultando no error: ", er)
                    } else {
                        logger.sucess("O arquivo css foi criado com sucess")
                        callback()
                    }
                })
            }
        })
    }

    step2() {

    }
}

module.exports = Build