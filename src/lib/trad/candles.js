const ex = require('../exchange');
const fs = require('fs');
const Cli = require('../logs');
const cli = new Cli( 'trad', 'candles.js');

class Candles {
    async getCandles(pair, timef, size) {
        const filename = `data/candles/${pair}-${timef}-${size}.candles`;
        let cdata;
        try {
            cdata = await fs.promises.readFile(filename);
        } catch {}
        if (!cdata) {
            cdata = await ex.getMulCandles(pair, timef, size);
            fs.promises.writeFile(`${filename}`, JSON.stringify(cdata));
        } else {
            cdata = JSON.parse(cdata);
        }
        return cdata;
    }

    async getNewCandles(pair, timef, size) {
        return await ex.getMulCandles(pair, timef, size);
    }

    async getLastCandles(pair, timef, size) {
        return await ex.getCandles(pair, timef, size);
    }
}

module.exports = new Candles();
