require('dotenv').config();
const Cli = require('./lib/logs');
const cli = new Cli('index.js');
cli.start();

const serv = require('./lib/webserver');
new serv();
