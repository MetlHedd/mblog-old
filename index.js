/*
    mBlog
*/
const lm          = require('./src/logger.js')
const bm          = require('./src/build.js')
const config      = require('./storage/config.json')
const sass        = require('node-sass')
const express     = require('express')
const mongodb     = require('mongodb')
const mquery      = require('mquery')
const fs          = require('fs')
const bodyParser  = require('body-parser')
const marked      = require('marked')
let hbs           = require('express-hbs')
let siteDetails   = false
let buildFinished = false
let collections   = {}
let widgets       = []
let app           = express()
let ObjectId      = mongodb.ObjectId
const logger      = new lm({
    'timeStamp': true
})
let build         = new bm(logger, __dirname+'/sass/main.sass', __dirname+'/public/css/style.css', ()=>{
    hbs.registerHelper('renderTemplate', (text, options) => {
        return hbs.compile(text)(options.data.root)
    })

    hbs.registerHelper('jsonString', (text, options) => {
        return new hbs.SafeString(JSON.stringify(text))
    })

    hbs.registerHelper('marked', (text, options) => {
        return new hbs.SafeString(marked(text))
    })
    mongodb.connect(config.mdurl, {useNewUrlParser: true}, (er, client) => {
        if(er) {
            logger.error('A conexão com o servidor mongodb falhou, detalhes:', er)
        } else {
            let db = client.db('heroku_85jx74gz')
            collections['pages'] = db.collection('pages')
            collections['widgets'] = db.collection('widgets')
            collections['posts'] = db.collection('posts')
            collections['siteDetails'] = db.collection('site_details')
            collections['db'] = db

            logger.sucess('A conexão com o servidor mongodb foi efetuada')
            mquery(collections['siteDetails']).findOne({}, (er, doc) => {
                if(er || !doc){
                    logger.error('Não foi possível encontrar os detalhes do site, error:', er, ' | Documento encontrado: ', doc)
                } else {
                    siteDetails = doc
                    siteDetails["title"] = siteDetails.options.siteTitle
                    app.listen(config.port, () => {
                        logger.info('O servidor express está rodando na porta:', config.port)
                    })
                }
            })
            mquery(collections["widgets"]).find({}, (er, doc) => {
                if (er || !doc) {
                    logger.error("Não foi possível encontrar os widgets")
                } else {
                    widgets = doc
                }
            })
        }
    })
})

app.engine('hbs', hbs.express4({
    partialsDir: __dirname + '/views/partials'
}))
app.use(express.static('public'))
app.set('view engine', 'hbs')
app.set('views', __dirname + '/views')
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: true}))

app.get('/', (req, res) => {
    mquery(collections['posts']).find().sort({_id: -1}).limit(10).exec((er, doc) => {
        if(er){
            res.render('error', {site: siteDetails, error: {message: 'Não foi possivel efetuar a query'}})
        } else {
            res.render('index', {site: siteDetails, posts: doc, widgets: widgets})
        }
    })
})

app.get('/post/:id', (req, res) => {
    let postID = req.params.id
    if (postID.length == 24) {
        mquery(collections['posts']).findOne({'_id': new ObjectId(postID)}, (er, doc) => {
            if(er || !doc) {
                res.render('error', {site: siteDetails, error: {message: 'Post não encontrado'}})
            } else {
                res.render('post', {site: siteDetails, post: doc, widgets: widgets})
            }
        })
    } else {
        res.redirect('/')
    }
})

app.route('/dashboard')
    .all((req, res, next) => {
        next()
    })
    .get((req, res) => {
        res.render('dashboard/index', {site: siteDetails})
    })
    .post((req, res) => {
        let body = req.body
        mquery(collections["siteDetails"]).updateOne({title: siteDetails.title}, {$set:{options: body}}, (er) => {
            if (er) {
                res.render('error', {site: siteDetails, error: {message: 'Não foi possivel efetuar a query'}})
            } else {
                siteDetails.title = body.siteTitle
                siteDetails.options = body
                res.redirect('/dashboard')
            }
        })
    })

app.route('/dashboard/menu')
    .all((req, res, next) => {
        next()
    })
    .get((req, res) => {
        res.render('dashboard/edit-menu', {site: siteDetails})
    })
    .post((req, res) => {
        if(!req.body.code) return res.render('error', {site: siteDetails, error: {message: 'Não foi possivel enviar o formulário'}})
        mquery(collections['siteDetails']).updateOne({ title: siteDetails.title }, {$set: {menu: JSON.parse(req.body.code)}}, (er) => {
            if (er) {
                res.render('error', {site: siteDetails, error: {message: 'Não foi possivel efetuar a query'}})
            } else {
                siteDetails.menu = JSON.parse(req.body.code)
                res.render('dashboard/edit-menu', {site: siteDetails})
            }
        })
    })

app.get('/dashboard/posts', (req, res) => {
    mquery(collections['posts']).find().sort({_id: -1}).limit(10).exec((er, doc) => {
        if(er){
            res.render('error', {site: siteDetails, error: {message: 'Não foi possivel efetuar a query'}})
        } else {
            res.render('dashboard/list-posts', {site: siteDetails, posts: doc})
        }
    })
})

app.route('/dashboard/posts/new')
    .all((req, res, next) => {
        next()
    })
    .get((req, res) => {
        res.render('dashboard/new-post', {site: siteDetails, head: {mdEditor: true}, form: {action: '/dashboard/posts/new'}})
    })
    .post((req, res) => {
        let body = req.body
        if (body.title && body.content && body.img && body.author) {
            collections['posts'].insertOne({
                'title': body.title,
                'content': body.content,
                'time': new Date().getTime(),
                'img': body.img == 'false' && false || body.img,
                'categories': [],
                'author': body.author
            }, (er, result) => {
                if (er) {
                    res.render('error', {site: siteDetails, error: {message: 'Não foi possivel efetuar a query'}})
                } else {
                    res.redirect('/dashboard/posts')
                }
            })
        } else {
            res.render('error', {site: siteDetails, error: {message: 'Formulário incompleto'}})
        }
    })

app.route('/dashboard/posts/edit/:id')
    .all((req, res, next) => {
        next()
    })
    .get((req, res) => {
        let postID = req.params.id
        if (postID.length == 24) {
            mquery(collections['posts']).findOne({'_id': new ObjectId(postID)}, (er, doc) => {
                if(er || !doc) {
                    res.render('error', {site: siteDetails, error: {message: 'Post não encontrado'}})
                } else {
                    res.render('dashboard/new-post', {site: siteDetails, post: doc, head: {mdEditor: true} })
                }
            })
        } else {
            res.redirect('/dashboard/posts')
        }
    })
    .post((req, res) => {
        let body = req.body
        let postID = req.params.id
        if (body.title && body.content && body.img && body.author && postID.length == 24) {
            mquery(collections["posts"]).updateOne(
            {
                '_id': new ObjectId(postID)}, {
                $set: {title: body.title, content: body.content, img: body.img == 'false' && false || body.img, author: body.author
            }}, (er) => {
                if(er) {
                    res.render('error', {site: siteDetails, error: {message: 'Falha na execução da queyr'}})
                } else {
                    res.redirect('/dashboard/posts')
                }
            })
        } else {
            res.render('error', {site: siteDetails, error: {message: 'Formulário incompleto ou id errada'}})
        }
    })

app.route('/dashboard/style')
    .all((req, res, next) => {
        next()
    })
    .get((req, res) => {
        let pathToFile = req.query.path || ''
        fs.stat('./sass/'+pathToFile, (er, stats) => {
            if (er) {
                res.render('error', {site: siteDetails, error: {message: 'Não foi possível encontrar esse arquivo'}})
            } else {
                if (stats.isFile()) {
                    fs.readFile('./sass/'+pathToFile, (err, data) => {
                        if (err) {
                            res.render('error', {
                                site: siteDetails, error: {message: 'Não foi possível ler esse arquivo'}
                            })
                        } else {
                            res.render('dashboard/edit-code', {
                                site: siteDetails,
                                code: {
                                    content: data.toString(),
                                    language: 'css'
                                },
                                head: {
                                    cdEditor: true
                                },
                                form: {
                                    action: '/dashboard/style/',
                                    path: pathToFile,
                                    method: 'POST'
                                }
                            })
                        }
                    })
                } else {
                    fs.readdir('./sass/'+pathToFile, (err, files) => {
                        if (err) {
                            res.render('error', {site: siteDetails, error: {message: 'Não foi possível ler esse diretório'}})
                        } else {
                            res.render('dashboard/list-dir', {site: siteDetails, files: files, pathToFile: pathToFile})
                        }
                    })
                }
            }
        })
    })
    .post((req, res) => {
        let body = req.body
        if(!body.path || !body.code){
            res.render('error', {site: siteDetails, error: {message: 'Formulário incompleto'}})
        } else {
            let pathToFile = req.body.path
            let fileData = req.body.code
            fs.writeFile('./sass/'+pathToFile, fileData, (er) => {
                if(er) {
                    res.render('error', {site: siteDetails, error: {message: 'Não foi possível fazer alterações no arquivo [/sass/'+pathToFile+']'}})
                } else {
                    res.redirect('/dashboard/style?path='+pathToFile)
                }
            })
        }
    })

app.route('/dashboard/views')
    .all((req, res, next) => {
        next()
    })
    .get((req, res) => {
        let pathToFile = req.query.path || ''
        fs.stat('./views/'+pathToFile, (er, stats) => {
            if (er) {
                res.render('error', {site: siteDetails, error: {message: 'Não foi possível encontrar esse arquivo'}})
            } else {
                if (stats.isFile()) {
                    fs.readFile('./views/'+pathToFile, (err, data) => {
                        if (err) {
                            res.render('error', {site: siteDetails, error: {message: 'Não foi possível ler esse arquivo'}})
                        } else {
                            res.render('dashboard/edit-code', {
                                site: siteDetails,
                                code: {
                                    content: data.toString(),
                                    language: 'test'
                                },
                                head: {
                                    cdEditor: true
                                },
                                form: {
                                    action: '/dashboard/views/',
                                    path: pathToFile,
                                    method: 'POST'
                                }
                            })
                        }
                    })
                } else {
                    fs.readdir('./views/'+pathToFile, (err, files) => {
                        if (err) {
                            res.render('error', {site: siteDetails, error: {message: 'Não foi possível ler esse diretório'}})
                        } else {
                            res.render('dashboard/list-dir', {site: siteDetails, files: files, pathToFile: pathToFile })
                        }
                    })
                }
            }
        })
    })
    .post((req, res) => {
        let body = req.body
        if(!body.path || !body.code){
            res.render('error', {site: siteDetails, error: {message: 'Não foi possível enviar o formulário'}})
        } else {
            let pathToFile = req.body.path
            let fileData = req.body.code
            fs.writeFile('./views/'+pathToFile, fileData, (er) => {
                res.redirect('/dashboard/views/?path='+pathToFile)
            })
        }
    })

app.get('/dashboard/widgets', (req, res) => {
    mquery(collections['widgets']).find().sort({_id: -1}).limit(10).exec((er, doc) => {
        if(er){
            res.render('error', {site: siteDetails, error: {message: 'Não foi possivel efetuar a query'}})
        } else {
            res.render('dashboard/list-widgets', {site: siteDetails, posts: doc, widgets: widgets})
        }
    })
})

app.route('/dashboard/widgets/new')
    .all((req, res, next) => {
        next()
    })
    .get((req, res) => {
        res.render('dashboard/edit-code', {
            site: siteDetails,
            code: {
                content: '',
                language: 'soon'
            },
            head: {
                cdEditor: true
            },
            form: {
                action: '',
                path: '',
                editPath: true,
                method: 'POST',
                widget: true
            }
        })
    })
    .post((req, res) => {
        let body = req.body
        if(req.body.code && req.body.path) {
            collections["widgets"].insertOne({
                name: body.path,
                content: body.code,
                showOnMainPage: body.show || false
            }, (er, result) => {
                if (er) {
                    res.render('error', {site: siteDetails, error: {message: 'Falha na execução da query'}})
                } else {
                    res.redirect('/dashboard/widgets')
                    mquery(collections["widgets"]).find({}, (er, doc) => {
                        if (er || !doc) {
                            logger.error("Não foi possível encontrar os widgets")
                        } else {
                            widgets = doc
                        }
                    })
                }
            })
        } else {
            res.render('error', {site: siteDetails, error: {message: 'Formulário incompleto'}})
        }
    })

app.route('/dashboard/widgets/edit/:id')
    .all((req, res, next) => {
        next()
    })
    .get((req, res) => {
        let postID = req.params.id
        if (postID.length == 24) {
            mquery(collections['widgets']).findOne({'_id': new ObjectId(postID)}, (er, doc) => {
                if(er || !doc) {
                    res.render('error', {site: siteDetails, error: {message: 'Widget não encontrado'}})
                } else {
                    res.render('dashboard/edit-code', {
                        site: siteDetails,
                        code: {
                            content: doc.content,
                            language: 'soon'
                        },
                        head: {
                            cdEditor: true
                        },
                        form: {
                            action: '',
                            path: doc.name,
                            editPath: true,
                            method: 'POST',
                            widget: true
                        }
                    })
                }
            })
        } else {
            res.redirect('/dashboard/widgets')
        }
    })
    .post((req, res) => {
        let body = req.body
        if(req.body.code && req.body.path) {
            mquery(collections["widgets"]).updateOne({'_id': new ObjectId(req.params.id)}, {
                $set: {
                    name: body.path,
                    content: body.code,
                    showOnMainPage: body.show || false
                }
            }, (er) => {
                if (er) {
                    res.render('error', {site: siteDetails, error: {message: 'Falha na execução da query'}})
                } else {
                    res.redirect('/dashboard/widgets')
                    mquery(collections["widgets"]).find({}, (er, doc) => {
                        if (er || !doc) {
                            logger.error("Não foi possível encontrar os widgets")
                        } else {
                            widgets = doc
                        }
                    })
                }
            })
        } else {
            res.render('error', {site: siteDetails, error: {message: 'Formulário incompleto'}})
        }
    })

// PAGES
app.get('/dashboard/pages', (req, res) => {
    mquery(collections['pages']).find().sort({_id: -1}).limit(10).exec((er, doc) => {
        if(er){
            res.render('error', {site: siteDetails, error: {message: 'Não foi possivel efetuar a query'}})
        } else {
            res.render('dashboard/list-pages', {site: siteDetails, posts: doc, pages: doc})
        }
    })
})

app.route('/dashboard/pages/new')
    .all((req, res, next) => {
        next()
    })
    .get((req, res) => {
        res.render('dashboard/edit-code', {
            site: siteDetails,
            code: {
                content: '',
                language: 'soon'
            },
            head: {
                cdEditor: true
            },
            form: {
                action: '',
                path: '',
                editPath: true,
                method: 'POST'
            }
        })
    })
    .post((req, res) => {
        let body = req.body
        if(req.body.code && req.body.path) {
            collections["pages"].insertOne({
                link: body.path,
                content: body.code
            }, (er, result) => {
                if (er) {
                    res.render('error', {site: siteDetails, error: {message: 'Falha na execução da query'}})
                } else {
                    res.redirect('/dashboard/pages')
                }
            })
        } else {
            res.render('error', {site: siteDetails, error: {message: 'Formulário incompleto'}})
        }
    })

app.route('/dashboard/pages/edit/:id')
    .all((req, res, next) => {
        next()
    })
    .get((req, res) => {
        let postID = req.params.id
        if (postID.length == 24) {
            mquery(collections['pages']).findOne({'_id': new ObjectId(postID)}, (er, doc) => {
                if(er || !doc) {
                    res.render('error', {site: siteDetails, error: {message: 'Widget não encontrado'}})
                } else {
                    res.render('dashboard/edit-code', {
                        site: siteDetails,
                        code: {
                            content: doc.content,
                            language: 'soon'
                        },
                        head: {
                            cdEditor: true
                        },
                        form: {
                            action: '',
                            path: doc.link,
                            editPath: true,
                            method: 'POST'
                        }
                    })
                }
            })
        } else {
            res.redirect('/dashboard/pages')
        }
    })
    .post((req, res) => {
        let body = req.body
        if(req.body.code && req.body.path) {
            mquery(collections["pages"]).updateOne({'_id': new ObjectId(req.params.id)}, {
                $set: {
                    link: body.path,
                    content: body.code
                }
            }, (er) => {
                if (er) {
                    res.render('error', {site: siteDetails, error: {message: 'Falha na execução da query'}})
                } else {
                    res.redirect('/dashboard/pages')
                    mquery(collections["pages"]).find({}, (er, doc) => {
                        if (er || !doc) {
                            logger.error("Não foi possível encontrar os pages")
                        } else {
                            pages = doc
                        }
                    })
                }
            })
        } else {
            res.render('error', {site: siteDetails, error: {message: 'Formulário incompleto'}})
        }
    })
//END


app.get('/p/:link', (req, res) => {
    mquery(collections["pages"]).findOne({link: req.params.link}, (er, doc) => {
        if(er || !doc) {
            res.render('error', {site: siteDetails, error: {message: 'Página não encontrada'}})
        } else {
            res.render('page', {site: siteDetails, pageHtml: doc.content, widgets: widgets})
        }
    })
})