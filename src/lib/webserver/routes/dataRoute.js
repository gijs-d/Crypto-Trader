const express = require('express');
const router = new express.Router();
const candles = require('../../trad/candles');

router.get('/:pair/:timef/:size', async (req, res) => {
    const { pair, timef, size } = req.params;
    const data = await candles.getCandles(pair, timef, size);
    res.json(data);
});

router.get('/live/:pair/:timef/:size', async (req, res) => {
    const { pair, timef, size } = req.params;
    const data = await candles.getNewCandles(pair, timef, size);
    res.json(data);
});

module.exports = router;
