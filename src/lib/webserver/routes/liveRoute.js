const express = require('express');
const router = new express.Router();
const live = require('../../trad/live');
const streams = require('../../trad/streams');
const socketStream = require('../socketStream');

router.get('/', async (req, res) => {
    const streamsIds = streams.getIds();
    res.render('live/live', { streamsIds });
});

router.get('/id/:id', async (req, res) => {
    const { id } = req.params;
    const game = live.getData(id);
    if (game) {
        socketStream.dataStreams.add(id);
    } else {
        return res.redirect('/live');
    }
    res.render('live/id', { game });
});

router.delete('/id/:id', async (req, res) => {
    const { id } = req.params;
    live.close(id);
    res.json({ id });
});

router.get('/all', async (req, res) => {
    res.send(live.getAll());
});

router.post('/new', async (req, res) => {
    const { pair, timef, fee, tas, comment } = req.body;
    let tasArray = false;
    try {
        tasArray = tas
            ?.split(']')
            .slice(0, -1)
            .map((ta, i) => {
                return {
                    type: ta.split('[')[0].replace(',', '').trim(),
                    set: ta
                        .split('[')[1]
                        .split(',')
                        .map(tt => Number(tt.trim())),
                };
            });
    } catch (e) {
        res.send(false);
        return;
    }
    live.add({ pair, timef, fee, comment }, tasArray);
    res.send(true);
});

module.exports = router;
