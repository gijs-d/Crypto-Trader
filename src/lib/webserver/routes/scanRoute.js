const express = require('express');
const router = new express.Router();

router.get('/', async (req, res) => {
    res.render('scan/scan');
});

router.get('/p', async (req, res) => {
    res.render('test');
});

module.exports = router;
