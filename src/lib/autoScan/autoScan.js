const cmc = require('../coinMarketCap');
const Tas = require('../trad/tas');
const Scan = require('../trad/scan');
const Highscores = require('../trad/highscores');
const candles = require('../trad/candles');
const Cli = require('../logs');
const cli = new Cli('autoScan', 'autoScan.js');

cli.setLogFile('data/autoScanLogs.txt');

class AutoScan {
    scan = new Scan();
    tas = new Tas();
    highscores = new Highscores();

    constructor(timeframes, base = 'USDT', pairs, types) {
        this.timeframes = timeframes || ['3m', '5m', '15m', '30m', '1h'];
        this.base = base;
        this.pairs = pairs;
        this.types = types;
        this.init();
    }

    async init() {
        cli.log('start');
        this.pairs ??= (await cmc.getTop100())?.filter(s => !s.includes('USD'));
        this.types ??= this.tas.types.map(t => t.type);
        while (true) {
            try {
                await this.tryNew();
            } catch (e) {
                cli.error(e);
            }
        }
    }

    resetSettings() {
        const getRNr = max => Math.floor(Math.random() * max);
        const getRSet = set => set[getRNr(set.length)];
        const settings = {
            pair: getRSet(this.pairs) + this.base,
            timef: getRSet(this.timeframes),
            size: 5 + getRNr(15),
            live: 0,
            scann: 1000 + getRNr(4000),
            fee: 0.1,
            minTas: 0,
            maxTas: 0,
            addOld: 0,
            tHs: 0,
        };
        this.tas = new Tas();
        for (let i = 0; i < getRNr(5) + 1; i++) {
            this.tas.add(getRSet(this.types));
        }
        this.highscores.reset();
        settings.maxTas = this.tas.arr.length + 1;
        return settings;
    }

    async tryNew() {
        const settings = this.resetSettings();
        cli.info(
            `${settings.pair} ${settings.timef} ${settings.size}000 ${
                settings.scann
            } ${this.tas.arr.map(ta => ta.type)}`
        );
        let data;
        try {
            data = await candles.getNewCandles(settings.pair, settings.timef, settings.size);
            if (!data.length) {
                throw new Error('geen data');
            }
        } catch (e) {
            return this.tryNew();
        }
        await this.#startScan(data, settings);
        const timeN = this.timeframes.indexOf(settings.timef);
        const filterd = this.highscores.bestScores[this.highscores.checks[0]].filter(
            newScore =>
                newScore[1].gain > 5 * timeN && newScore[1].wins / (newScore[1].tot || 1) > 0.5
        );
        this.#logFilterd(filterd);
        this.sendScore(filterd, settings);
        await new Promise(r => setTimeout(() => r(), 10000));
    }

    async #startScan(data, settings) {
        this.scan.stop = false;
        this.scan.handlers.loop = async loop => {
            cli.tempLog(
                `${loop.i + 1} / ${loop.scann} ${loop.tas
                    .map(ta => `${ta.type} [${ta.set.join(',')}]`)
                    .join(', ')} (${loop.tas.length})`
            );
            await new Promise(r => setTimeout(r, 10));
        };
        await this.scan.start(data, settings, this.tas, this.highscores, 500);
    }

    #logFilterd(filterd) {
        const string = filterd
            .map(
                newScore =>
                    `${newScore[1].gain.toFixed(2)}%  ${newScore[1].wins} / ${newScore[1].tot} (${(
                        (newScore[1].wins / newScore[1].tot) *
                        100
                    ).toFixed(0)}%) ${newScore[2]
                        .map(ta => `${ta.type} [ ${ta.set.join(',')} ]`)
                        .join(', ')}`
            )
            .join('  \t');
        cli.log(string);
    }

    sendScore(filterd, settings) {
        filterd.map(newScore => {
            cli.log(
                `adding ${newScore[1].gain.toFixed(2)}% (${((newScore[1].gainC - 1) * 100).toFixed(
                    2
                )}%)  ${newScore[1].wins} / ${newScore[1].tot} (${(
                    (newScore[1].wins / newScore[1].tot) *
                    100
                ).toFixed(0)}%) ${settings.size}`
            );
            fetch('http://127.0.0.1/live/new', {
                method: 'post',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    pair: settings.pair,
                    timef: settings.timef,
                    fee: settings.fee,
                    tas: newScore[2].map(ta => `${ta.type} [ ${ta.set.join(',')} ]`).join(', '),
                    comment: `${newScore[1].gain.toFixed(2)}% (${(
                        (newScore[1].gainC - 1) *
                        100
                    ).toFixed(2)}%)  ${newScore[1].wins} / ${newScore[1].tot} (${(
                        (newScore[1].wins / newScore[1].tot) *
                        100
                    ).toFixed(0)}%) ${newScore[1].max.toFixed(2)} | ${newScore[1].min.toFixed(2)} ${
                        settings.size
                    }`,
                }),
            });
        });
    }
}

module.exports = AutoScan;
