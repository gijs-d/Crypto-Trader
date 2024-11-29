const Cli = require('../logs/cli');
const cli = new Cli('exchange', 'gate.js');

class Gate {
    urls = {
        getUrl: 'https://api.gateio.ws/api/v4',
        allTick: '/spot/tickers',
        candles: (pair, time, limit) =>
            `/spot/candlesticks?limit=${limit}&currency_pair=${pair}&interval=${time}`,
        candles2: (pair, time, from, to) =>
            `/spot/candlesticks?from=${from}&to=${to}&currency_pair=${pair}&interval=${time}`,
    };

    async getMulCandles(pair, time, maps) {
        let candles = await this.getCandles(pair, time, 1000);
        const interval = candles[1].time - candles[0].time;
        let start = candles[0].time;
        let newCandles = [];
        for (let i = 1; i < maps; i++) {
            const obj = { start: 0, stop: 0 };
            start -= interval;
            obj.stop = start;
            start -= interval * 999;
            obj.start = start;
            newCandles.push(obj);
        }
        newCandles = await Promise.all(
            newCandles.map(newCandle =>
                this.getCandlesFromTo(pair, '1m', newCandle.start, newCandle.stop)
            )
        );
        newCandles.forEach(newCandle => {
            candles = newCandle.concat(candles);
        });
        return candles;
    }

    async getCandles(pair, time, limit = 1000) {
        let candles = [];
        try {
            const req = await fetch(this.urls.getUrl + this.urls.candles(pair, time, limit));
            candles = await req.json();
            candles = candles.map(x => ({
                time: x[0],
                volume: Number(x[1]),
                close: Number(x[2]),
                high: Number(x[3]),
                low: Number(x[4]),
                open: Number(x[5]),
            }));
        } catch (e) {
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
                volume: Number(x[1]),
                close: Number(x[2]),
                high: Number(x[3]),
                low: Number(x[4]),
                open: Number(x[5]),
            }));
        } catch (e) {
            return { error: e };
        }
        return candles;
    }

    async getPair(pair) {
        let result;
        try {
            result = await (
                await fetch(this.urls.getUrl + this.urls.allTick + `?currency_pair=${pair}`)
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
                .filter(p => p.currency_pair.split('_')[1] == currency)
                .map(p => ({
                    pair: p.currency_pair,
                    price: Number(p.last),
                    high: Number(p.high_24h),
                    vol: Number(p.quote_volume), //quote_volume
                    low: Number(p.low_24h),
                    change: Number((Number(p.change_percentage) / 100).toFixed(4)),
                    buy: Number(p.highest_bid),
                    sell: Number(p.lowest_ask),
                }));
        } catch (e) {
            cli.log(e);
            return { error: e };
        }
        return pairs;
    }
}

module.exports = new Gate();
