const candles = require('../candles');
const Cli = require('../../logs');
const cli = new Cli('trad', 'streams', 'stream.js');

class Stream {
    interval;
    lastUpdate;
    stopStream;
    size = 1;
    data;
    timeout;
    handlers = new Map();
    error;
    good = false;

    constructor(pair, timef, handler) {
        this.pair = pair;
        this.timef = timef;
        cli.log(`stream ${this.pair} ${this.timef} started`);
        this.handlers.set(handler.id, handler.handle);
        this.stream();
    }

    addHandler(handler) {
        if (this.error) {
            cli.error(`stream ${this.pair} ${this.timef} failed`);
            handler.handle({ error: 'stream failed' });
            return;
        }
        this.handlers.set(handler.id, handler.handle);
        if (this.data) {
            handler.handle(this.data);
        }
    }

    async stream() {
        if (this.stopStream) {
            return;
        }
        let data = await this.#loadData();
        if (data?.error) {
            return;
        }
        this.good = true;
        const nextUpdate = this.#getNextUpdateTime(data);
        if (this.stopStream) {
            return;
        }
        this.timeout = setTimeout(() => {
            this.stream();
        }, nextUpdate);
    }

    #getNextUpdateTime(data) {
        this.interval = new Date(data[1].time).getTime() - new Date(data[0].time).getTime();
        this.lastUpdate = new Date(data[data.length - 1].time).getTime();
        let nextUpdate = new Date(this.lastUpdate).getTime() - new Date().getTime() + this.interval;
        cli.log(`stream ${this.pair} ${this.timef} reload in ${nextUpdate}`);
        if (nextUpdate > 0) {
            this.data = data.slice(0, -1);
            if (this.handlers.size > 0) {
                this.handlers.forEach(handler => {
                    handler(data.slice(0, -1));
                });
            }
        } else {
            nextUpdate = 1000;
        }
        return nextUpdate;
    }

    async #loadData() {
        let data = await candles.getLastCandles(this.pair, this.timef, 1000);
        while (
            data?.error &&
            (!data?.error?.toString()?.includes('candles.map is not a function') || this.good)
        ) {
            cli.error(`stream ${this.pair} ${this.timef} reload`);
            await new Promise(r => setTimeout(r, 1000));
            data = await candles.getLastCandles(this.pair, this.timef, 1000);
        }
        if (data?.error) {
            cli.error(`stream ${this.pair} ${this.timef} failed ${data.error}`);
            this.error = data;
            if (this.handlers.size > 0) {
                this.handlers.forEach(handler => {
                    handler({ error: data });
                });
            }
        }
        return data;
    }

    async stop() {
        if (this.handlers.size > 0) {
            return;
        }
        this.stopStream = true;
        clearTimeout(this.timeout);
        cli.log(`stream ${this.pair} ${this.timef} closed`);
    }
}

module.exports = Stream;
