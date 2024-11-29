const express = require('express');
const router = new express.Router();

router.get('/', async (req, res) => {
    res.render('live/live');
});

module.exports = router;
