const express = require("express");
const cors = require("cors");
const fs = require('fs');
const path = require('path');
const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");

const app = express();
const args = yargs(hideBin(process.argv))
.option('c', {
  alias: 'config',
  type: 'string',
  desc: 'Path to config json file which defines the port & APIs'
})
.option('a', {
  alias: 'api',
  type: 'array',
  desc: `One or more API objects with the following positionals:\n
  {route: string}\n 
  {type: string}\n
  {returnData: string | path to json file | object}`
})
.argv;

let appPort = 8080;

app.use(cors());

const isPath = (str) => typeof str === "string" && str !== path.basename(str);

const routeReturns = (req, res, returns) => res.send(isPath(returns) ? JSON.parse(fs.readFileSync(returns, 'utf8')) : returns);

const getAvailableRoutes = (routerStack) => routerStack.reduce((acc, curr) => {
  if(curr.route && curr.route.path) {
    const methods = (Object.keys(curr.route.methods) || '').toString().toUpperCase();
    acc.push(`${methods} - ${curr.route.path}`);
  }
  return acc;
}, []);

const createRoute = (apiObj) => {
  const { route, type, returns } = apiObj;
  switch(type.toLowerCase()) {
    case "get": app.get(route, (req, res) => routeReturns(req, res, returns)); break;
    case "post": app.post(route, (req, res) => routeReturns(req, res, returns)); break;
    case "put": app.put(route, (req, res) => routeReturns(req, res, returns)); break;
    case "patch": app.patch(route, (req, res) => routeReturns(req, res, returns)); break;
    case "delete": app.delete(route, (req, res) => routeReturns(req, res, returns)); break;
    default: console.log(`Invalid route type found (${type}), no API created for ${route}`)
  }
};

if(args.config) {
  console.log(`Loading config from ${args.config}...`);
  const { port, apis = [] } = JSON.parse(fs.readFileSync(args.config, 'utf8'));
  appPort = parseInt(args.port || port || appPort);
  apis.forEach(api => createRoute(api));
} else {
  console.log(`Creating APIs using arguments...`);
  const { port, api = [] } = args;
  appPort = parseInt(port || appPort);

  if(api.length === 0) {
    console.log("Please specify 1 or more APIs using the -a or --api arguments");
    return;
  } else if(api.length % 3 !== 0) {
    console.log("Please specify each API in the following format: '-a {route} {type} {returnData}'");
    return;
  }

  for(let i = 0; i < api.length; i+= 3) {
    const [route, type, returns] = api.slice(i, i + 3);
    createRoute({ route, type, returns });
  }
}

app.listen(appPort, () => {
  console.log(`Mock server listening at http://localhost:${appPort}`);  
  const routes = getAvailableRoutes(app._router.stack);
  console.log(`APIs available:\n    ${routes.join("\n    ")}`);  
});
