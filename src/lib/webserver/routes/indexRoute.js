const express = require('express');
const router = new express.Router();
const check = require('../../trad/check');
const highscores = require('../../trad/highscores');
const types = require('../../trad/types');
const tas = require('../../trad/tas');
const scan = require('../../trad/scan');
const Cli = require('../../logs');
const cli = new Cli('webserver', 'routes', 'indexRoute.js');

router.get('/modules/:type', (req, res, next) => {
    const { type } = req.params;
    let classString;
    switch (type) {
        case 'types.js':
            classString = `const types = { "getTasString":()=>JSON.stringify(${types.getTasString()}) };`;
            break;
        case 'check.js':
            classString = check.toString();
            break;
        case 'highscores.js':
            classString = highscores.toString();
            break;
        case 'tas.js':
            classString = tas.toString();
            break;
        case 'scan.js':
            classString = scan.toString();
            break;
        default:
            cli.warn(`type ${type} not suported`);
            break;
    }
    res.setHeader('Content-Type', 'application/javascript');
    return res.send(classString);
});

router.get('/', async (req, res) => {
    res.render('index');
});

router.get('/p', async (req, res) => {
    res.render('test');
});

router.get('/fit', async (req, res) => {
    res.render('fit/fit');
});

module.exports = router;
