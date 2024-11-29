class Check {
    lines;
    buys = [];
    markers = [];
    oldBuys = [false];
    score;
    fee;
    tempBuy = { open: 0, close: 0, time: 0 };
    buyHandler = (candle, buy) => {};

    constructor(data, tas, config, buys, tempBuy) {
        if (!config) {
            return;
        }
        this.fee = Number(config.fee) / 100;
        this.lines = tas.calc(data);
        this.tas = tas;
        if (buys) {
            this.buys = buys;
        }
        if (tempBuy) {
            this.tempBuy = tempBuy;
        }
    }

    checkData(data, tas, config, start = 0) {
        this.lines = tas.calc(data);
        this.checkLines(data, tas, config, start);
        this.checkScore(config);
    }

    checkLines(dataL, tas, config, start) {
        this.buys = [];
        this.markers = [];
        const minN = Math.min(
            dataL.length,
            ...Object.values(this.lines)
                .map(l => l.length)
                .filter(f => f > 0)
        );
        const data = dataL.slice(-minN);
        Object.keys(this.lines).forEach(l => (this.lines[l] = this.lines[l].slice(-minN)));
        this.fee = Number(config.fee) / 100;
        data.forEach((candle, i) => {
            if (start && candle.time <= start) {
                return;
            }
            const buy = this.checkTas(tas, candle, i);
            this.checkBuy(buy, candle);
        });
    }

    checkRule(rule, ta, candle, i, update) {
        const getValue = nr => {
            if (nr[0] == 'id') {
                if (update) {
                    return this.lines[nr[1]][this.lines[nr[1]].length - 1]?.value;
                }
                return this.lines[nr[1]][i].value;
            } else if (nr[0] == 'nr') {
                return nr[1];
            } else if (nr[0] == 'close') {
                return candle.close;
            } else if (nr[0] == 'set') {
                return ta.set[nr[1]];
            }
        };
        const nr1 = getValue(rule[0]);
        const nr2 = getValue(rule[2]);
        return eval(`${nr1} ${rule[1]} ${nr2}`);
    }

    checkTas(tas, candle, i, update) {
        let buy = true;
        tas.arr.forEach(ta => {
            if (ta.oc?.open) {
                const prevBuy = this.oldBuys[0];
                ta.oc.close?.forEach(
                    sellRule => (buy &&= !this.checkRule(sellRule, ta, candle, i, update))
                );
                if (buy && !prevBuy) {
                    ta.oc.open?.forEach(
                        buyRule => (buy &&= this.checkRule(buyRule, ta, candle, i, update))
                    );
                }
            } else {
                ta.check?.forEach(rule => (buy &&= this.checkRule(rule, ta, candle, i, update)));
            }
        });
        this.oldBuys[0] = buy;
        return buy;
    }

    updateLines(data) {
        const nData = data.filter(d => d.time > this.tas.lastTime);
        if (nData.length <= 0) {
            return;
        }
        this.lines = this.tas.update(data);
        const candle = data.at(-1);
        const buy = this.checkTas(this.tas, candle, false, true);
        this.checkBuy(buy, candle, true);
        this.checkScore();
    }

    checkBuy(buy, candle, update) {
        if (buy) {
            if (!this.tempBuy.open) {
                this.openBuy(buy, candle, update);
            }
            this.tempBuy.close = candle.close;
        } else {
            if (this.tempBuy.open) {
                this.closeBuy(buy, candle, update);
            }
        }
    }

    openBuy(buy, candle, update) {
        if (update) {
            this.buyHandler(candle, buy);
            this.tempBuy.time = new Date().getTime();
            this.tempBuy.openCandle = candle.time;
        }
        this.tempBuy.open = candle.close;
        this.markers.push({
            buy: true,
            label: `buy ${this.buys.length + 1}`,
            time: candle.time,
        });
    }

    closeBuy(buy, candle, update) {
        if (update) {
            this.buyHandler(candle, buy);
            this.tempBuy.closeTime = new Date().getTime();
            this.tempBuy.closeCandle = candle.time;
        } else {
            this.tempBuy.closeTime = candle.time;
        }
        this.tempBuy.close = candle.close;
        this.buys.push(this.tempBuy);
        let { open, close } = this.tempBuy;
        open *= 1 + this.fee;
        close *= 1 - this.fee;
        const proc = ((close - open) / open) * 100;
        let color = 'yellow';
        if (proc >= 0) {
            color = 'red';
        }
        this.tempBuy = { open: false, close: 0, time: 0 };
        this.markers.push({
            buy: false,
            label: `sell ${proc.toFixed(2)}`,
            time: candle.time,
            color,
        });
    }

    checkTempScore() {
        if (!this.tempBuy.open) {
            return { gain: 0, time: 0 };
        }
        let { open, close } = this.tempBuy;
        open *= 1 + this.fee;
        close *= 1 - this.fee;
        const gain = ((close - open) / open) * 100;
        return { gain, time: this.tempBuy.time };
    }

    checkScore(config) {
        if (config?.fee >= 0) {
            this.fee = Number(config.fee) / 100;
        }
        const fee = this.fee;
        let gain = this.buys.map(
            b => ((b.close * (1 - fee) - b.open * (1 + fee)) / (b.open * (1 + fee))) * 100
        );
        const u = gain.reduce((a, b) => a + b, 0) / gain.length || 1;
        const std = Math.sqrt(gain.reduce((a, b) => a + (b - u) ** 2, 0) / gain.length || 1);
        const min = gain.reduce((a, b) => Math.min(a, b), 0);
        const max = gain.reduce((a, b) => Math.max(a, b), 0);
        const gainC = gain.reduce((a, b) => a * (1 + b / 100), 1);
        const tot = this.buys.length;
        const wins = gain.filter(w => w >= 0).length;
        gain = gain.reduce((a, b) => a + b, 0);
        this.score = { gain, tot, wins, gainC, u, std, max, min };
        return this.score;
    }

    makeMarkers(buys, config) {
        this.markers = [];
        buys.forEach((b, i) => {
            this.markers.push({
                buy: true,
                label: `buy ${i + 1}`,
                time: b.openCandle,
            });
            if (b.close && b.closeTime) {
                let { open, close } = b;
                open *= 1 + Number(config.fee);
                close *= 1 - Number(config.fee);
                const proc = ((close - open) / open) * 100;
                let color = 'yellow';
                if (proc >= 0) {
                    color = 'red';
                }
                this.markers.push({
                    buy: false,
                    label: `sell ${proc.toFixed(2)}`,
                    time: b.closeCandle,
                    color,
                });
            }
        });
    }
}

module.exports = Check;
