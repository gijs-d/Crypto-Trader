const express = require('express');
const router = new express.Router();
const types = require('../../trad/types');

router.get('/', async (req, res) => {
    res.render('tas/tas');
});

router.get('/test', async (req, res) => {
    res.render('tas/test');
});

router.post('/', async (req, res) => {
    const { tas } = req.body;
    types.addTas(tas);
    res.send(true);
});

router.delete('/:type', async (req, res) => {
    const { type } = req.params;
    types.removeTas(type);
    res.send(true);
});

router.put('/:type', async (req, res) => {
    const { type } = req.params;
    const { tas } = req.body;
    types.updateTas(type, tas);
    res.send(true);
});

router.get('/list', async (req, res) => {
    const list = types.getTasString();
    res.send(list);
});

module.exports = router;
