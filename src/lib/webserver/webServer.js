const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const routes = require('./routes');
const topics = require('./topics');
const socketStream = require('./socketStream');
const Cli = require('../logs');
const cli = new Cli('webserver', 'webserver.js');
const PORT = process.env.PORT || 80;

class Webserver {
    app = express();
    server = http.createServer(this.app);
    io = new Server(this.server);
    socketHandlers = new Map();

    constructor() {
        this.appFunctions();
        socketStream.io = this.io;
        this.routes();
        this.topics();
        this.socketRoutes();
        this.server.listen(PORT, () => {
            cli.log(`listening on http://localhost:${PORT}/`);
        });
    }

    appFunctions() {
        this.app.set('trust proxy', 1);
        this.app.use(express.urlencoded({ extended: true }));
        this.app.use(express.json());
        this.app.use(express.static(path.join(__dirname, './public')));
        this.app.set('views', path.join(__dirname, './views'));
        this.app.set('view engine', 'ejs');
    }

    socketRoutes() {
        this.io.on('connection', socket => {
            if (this.socketHandlers.has('connection')) {
                this.socketHandlers.get('connection')(socket);
            }
            socket.onAny((topic, msg) => {
                if (this.socketHandlers.has(topic)) {
                    this.socketHandlers.get(topic)(msg, this.io);
                } else {
                    cli.log('unhandeld', topic, msg);
                }
            });
        });
    }

    socketSend(topic, msg) {
        this.io.emit(topic, msg);
    }

    routes() {
        routes.forEach(route => this.app.use(route[0], route[1]));
        this.app.get('*', async (req, res) => {
            cli.log(`Path not found "${req.path}"`);
            //res.render('pages/pageNotFound');
        });
    }

    topics() {
        Object.values(topics).forEach(topicMap => {
            topicMap.forEach((handler, topic) => this.socketHandlers.set(topic, handler));
        });
    }

    addSockHandler(topic, handler) {
        this.socketHandlers.set(topic, handler);
    }
}

module.exports = Webserver;
