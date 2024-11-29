const Cli = require('../logs/cli');
const cli = new Cli('exchange', 'bincance.js');

class Binance {
    urls = {
        getUrl: 'https://api.binance.com/api/v3',
        allTick: '/ticker/24hr',
        candles: (pair, time, limit) => `/klines?symbol=${pair}&interval=${time}&limit=${limit}`,
        candles2: (pair, time, from, to) =>
            `/klines?startTime=${from}&endTime=${to}&symbol=${pair}&interval=${time}&limit=1000`,
    };

    async getMulCandles(pair, time, maps) {
        let candles;
        try {
            candles = await this.getCandles(pair, time, 1000);
            const interval = candles[1].time - candles[0].time;
            let start = candles[0].time;
            let arr = [];
            for (let i = 1; i < maps; i++) {
                const obj = { start: 0, stop: 0 };
                start -= interval;
                obj.stop = start;
                start -= interval * 999;
                obj.start = start;
                arr.push(obj);
            }
            arr = await Promise.all(
                arr.map(a => this.getCandlesFromTo(pair, time, a.start, a.stop))
            );
            arr.forEach(a => {
                candles = a.concat(candles);
            });
        } catch (e) {
            cli.error(e);
            candles = [];
        }
        return candles;
    }

    async getCandles(pair, time, limit = 1000) {
        let candles = [];
        try {
            const req = await fetch(this.urls.getUrl + this.urls.candles(pair, time, limit));
            candles = await req.json();
            candles = candles.map(x => ({
                time: x[0],
                open: Number(x[1]),
                high: Number(x[2]),
                low: Number(x[3]),
                close: Number(x[4]),
                volume: Number(x[5]),
            }));
        } catch (e) {
            cli.error(e);
            return { error: e };
        }
        return candles;
    }

    async getCandlesFromTo(pair, time, from, to) {
        let candles;
        try {
            candles = await (
                await fetch(this.urls.getUrl + this.urls.candles2(pair, time, from, to))
            ).json();
            candles = candles.map(x => ({
                time: x[0],
                open: Number(x[1]),
                high: Number(x[2]),
                low: Number(x[3]),
                close: Number(x[4]),
                volume: Number(x[5]),
            }));
        } catch (e) {
            cli.error(e);

            return { error: e };
        }
        return candles;
    }

    async getPair(pair) {
        let result;
        try {
            result = await (
                await fetch(`${this.urls.getUrl}${this.urls.allTick}?symbol=${pair}`)
            ).json();
        } catch (e) {
            return { error: e };
        }
        return result;
    }

    async getPairs(currency = 'USDT') {
        let pairs;
        try {
            pairs = await (await fetch(this.urls.getUrl + this.urls.allTick)).json();
            pairs = pairs
                .filter(p => p.symbol.endsWith(currency))
                .map(p => ({
                    pair: p.symbol,
                    price: Number(p.lastPrice),
                    high: Number(p.highPrice),
                    vol: Number(p.quoteVolume), //quote_volume
                    low: Number(p.lowPrice),
                    change: Number((Number(p.priceChangePercent) / 100).toFixed(4)),
                    buy: Number(p.bidPrice),
                    sell: Number(p.askPrice),
                }));
        } catch (e) {
            cli.error(`error ${e}`);
            return { error: e };
        }
        return pairs;
    }
}

module.exports = new Binance();
