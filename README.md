# mblog

## Instalação
1. Instale as depedências
```
npm install
```
2. Crie a pasta `storage` e um arquivo `config.json` como esse:
```json
{
    "mdurl": "COLOQUE O ENDEREÇO MONGODB AQUI",
    "port": 3000
}
```
Tudo pode ser customizado no `index.js`
3. Na sua db crie as coleções `pages` `posts` `site_details` `widgets` e `users`
4. Na coleção `site_details` deixe como no exemplo:
```json
{
    "menu": [
        {
            "name": "INICIO",
            "href": "/",
            "logged": false
        }
    ],
    "options": {
        "siteTitle": "mBlog",
        "showThumb": "on",
        "showAuthor": "on",
        "showTime": "on",
        "widgetsEnabled": "on"
    }
}
```
5. Ligue o servidor com o comando `node index.js`