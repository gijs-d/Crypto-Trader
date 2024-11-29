const Tas = require('../tas');
const streams = require('../streams');
const Check = require('../check');
const socketStream = require('../../webserver/socketStream');
const fs = require('fs');
const Cli = require('../../logs');
const cli = new Cli('trad', 'live', 'liveGame.js');

class LiveGame {
    data;
    running = -1;
    stream;
    check;
    nextUpdate = 0;
    error;
    backup = false;
    sendDatas = [];
    updateHandler = (stats, data) => {
        socketStream.sendData('update', stats, data);
    };
    errorHandler = () => {};

    constructor(set, tasArray, errorHandler, backup) {
        this.tas = new Tas();
        this.set = set;
        if (errorHandler) {
            this.errorHandler = errorHandler;
        }
        this.buys = backup?.buys;
        this.tempBuy = backup?.tempBuy;
        if (backup?.id) {
            this.id = backup.id;
            this.startTime = backup.startTime;
            this.startCandle = backup.startCandle;
            this.lastTime = backup.lastTime;
            this.nextUpdate = backup.nextUpdate;
            this.running = backup.running;
            this.backup = true;
        } else {
            this.id = Math.random().toString(36).slice(3) + new Date().getTime().toString(36);
            this.startTime = new Date().getTime();
            this.lastTime = new Date().getTime();
        }
        this.tasArray = tasArray;
        try {
            tasArray.forEach(t => {
                this.tas.add(t.type, t.set);
            });
        } catch {}
        this.#start(set);
    }

    #start(set) {
        const handle = d => {
            this.update(d);
        };
        const handler = {
            id: this.id,
            handle,
        };
        if (this.tas.arr.length > 0) {
            this.stream = streams.getStream(set.pair, set.timef, handler);
            cli.log(`live ${set?.pair} ${set?.timef} ${this.tas?.getTasString()} started`);
        } else {
            this.error = 'Bad Tas';
        }
    }

    update(data) {
        if (!this.startCandle) {
            this.startCandle = data
                .filter(d => ({ ...d, time: this.startTime }))
                ?.slice(-1)[0]?.time;
        }
        if (data?.error) {
            this.error = data.error;
            this.errorHandler(this.error);
            return;
        }
        this.#checkUpdateData(data);
        this.#save();
        this.updateHandler(this.getStats(), {
            data: { candles: data, buys: this.check.buys, tempBuy: this.check.tempBuy },
        });
    }

    #checkUpdateData(data) {
        if (this.running < 0 || this.backup) {
            this.check = new Check(data, this.tas, this.set, this.buys, this.tempBuy);
            this.backup = false;
        } else {
            this.check.updateLines(data);
            const score = this.check.checkScore();
            if (score.gain < -10) {
                this.close();
            }
        }
        this.running++;
        const last = new Date(data[data.length - 1].time).getTime();
        const interval = last - new Date(data[data.length - 2].time).getTime();
        this.nextUpdate = last + interval * 2;
        this.lastTime = new Date().getTime();
    }

    #save() {
        fs.writeFile(
            `data/live/lives/${this.id}.json`,
            JSON.stringify({
                set: this.set,
                tasArray: this.tasArray,
                buys: this.check.buys,
                tempBuy: this.check.tempBuy,
                startTime: this.startTime,
                running: this.running,
                lastTime: this.lastTime,
                nextUpdate: this.nextUpdate,
                startCandle: this.startCandle,
            }),
            () => {}
        );
    }

    close() {
        const f = d => {
            this.update(d);
        };
        const handler = { id: this.id, f };
        streams.stop(this.set.pair, this.set.timef, handler);
        fs.rmSync(`data/live/lives/${this.id}.json`);
        cli.log(`live ${this.set.pair} ${this.set.timef} ${this.tas.getTasString()} closed`);
    }

    getData() {
        if (!this.check) {
            return;
        }
        const stats = this.getStats();
        return { ...stats, data: { buys: this.check.buys, tempBuy: this.check.tempBuy } };
    }

    getStats() {
        if (!this.check) {
            return;
        }
        const score = this.check.checkScore();
        const tempScore = this.check.checkTempScore();
        return {
            id: this.id,
            startTime: this.startTime,
            running: this.running,
            time: new Date().getTime(),
            nextUpdate: this.nextUpdate,
            set: this.set,
            tas: this.tasArray,
            lastTime: this.lastTime,
            score,
            tempScore,
            startCandle: this.startCandle,
        };
    }
}

module.exports = LiveGame;
