const express = require('express');
const router = new express.Router();
const tmux = require('../../autoScan/sessions');
const cmc = require('../../coinMarketCap');
const Tas = require('../../trad/tas');

router.get('/', async (req, res) => {
    const coins = await cmc.getTop100();
    const tas = new Tas();
    const types = tas.types.map(t => t.type);
    res.render('autoScan/autoScan', { tas, coins, types });
});

router.get('/data', async (req, res) => {
    const { sessions } = tmux;
    const coins = await cmc.getTop100();
    res.json({ sessions, coins });
});

router.post('/', async (req, res) => {
    const { base, delay, timeframes, coins, tas } = req.body;
    tmux.startTmux({ base, delay, timeframes, coins, tas });
    res.json(tmux.sessions);
});

router.delete('/', async (req, res) => {
    const { name } = req.body;
    await tmux.stopTmux(name);
    const { sessions } = tmux;
    res.json({ sessions });
});

module.exports = router;
