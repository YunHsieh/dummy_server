const path = require("path");
const { readdir } = require('fs').promises;
const jsonServer = require('json-server');
const { argv } = require('yargs');

const server = jsonServer.create();
const middlewares = jsonServer.defaults()

const initConfig = {
    port: argv.port || 8000,
    root_path: argv.root_path || 'default'
}

const port = initConfig.port;
const base_url = `http://localhost:${port}`
const target = {};
const map_routers = {}

async function* getFiles(dir, _target, current_path=[]) {
    const dirents = await readdir(dir, { withFileTypes: true });
    for (const dirent of dirents) {
        const res = path.resolve(dir, dirent.name);
        if (dirent.isDirectory()) {
            Object.assign(_target, {[dirent.name]: {}})
            yield* getFiles(res, _target, [...current_path, dirent.name]);
        } else {
            const file_name = [dirent.name.replace('.json', '')]
            const api_path = `${[...current_path, file_name].join('-')}`
            Object.assign(_target, {[api_path]: require(res)})
            yield api_path
        }
    }
}
const processed =  getFiles(path.join(__dirname, initConfig.root_path), target)

;(async () => {
    console.log('routes:')
    for await (const f of processed) {
        api_path = `/${f.replaceAll('-', '/')}`
        Object.assign(map_routers, {[api_path]:`/${f}`})
        console.log(`${base_url}${api_path}`);
    }
    const router = jsonServer.router(target);
    console.log('-----\n')

    console.log(JSON.stringify(map_routers))
    
    server.use(middlewares);
    server.use(jsonServer.rewriter(
        require(path.resolve(__dirname, initConfig.root_path, 'routes.json'))
    ));
    server.use(router)

    server.listen(port, () => {
        console.log(`JSON Server is running url:http://localhost:${port} `)
    })
})()
