const Check = require('./check');

class Scan {
    stop = false;
    startTas = [];
    tas;
    data;
    config;
    highscore;
    check;
    oldSet = {};
    handlers = {
        loop: async () => {},
        newScore: () => {},
    };
    updateF = async () => {};
    updateFS = () => {};

    async start(data, config, tas, highscore, slowDown = 1) {
        this.config = config;
        this.data = data;
        this.tas = tas;
        this.highscore = highscore;
        this.startTas = [...this.tas.arr];
        for (let i = 0; i < this.config.scann; i++) {
            this.check = new Check();
            this.#loop(Number(this.config.tHs) || i / this.config.scann, i);
            await this.updateF(
                `${i + 1} / ${this.config.scann} [ ${this.tas.arr
                    .map(t => [t.set.join(',')])
                    .join(',')} ]`
            );
            if (slowDown) {
                await new Promise(r => setTimeout(() => r(), slowDown));
            }
            if (this.stop) {
                i = this.config.scann;
            }
        }
    }

    #loop(r, i) {
        if (Math.random() < r) {
            const score = this.highscore.getRBestScore();
            if (score) {
                this.tas.arr = [...score.map(s => ({ ...s, keep: true, tweak: true, hs: true }))];
            } else {
                this.#mixTas();
            }
        } else {
            this.#mixTas();
        }
        this.#mixSets();
        this.#addOld();
        this.handlers.loop({ i, scann: this.config.scann, tas: this.tas.arr });
        this.check.checkData(this.data, this.tas, this.config);
        const { score } = this.check;
        this.highscore.checkScore(score, [...this.tas.arr]);
        this.updateFS(score);
        this.handlers.newScore(score);
    }

    #mixTas() {
        if (this.startTas.length <= 1 && !this.tas.arr[0].hs) {
            return;
        }
        this.oldSet = {};
        const min = Math.max(1, this.config.minTas);
        let temp;
        let filterv = Math.random();
        temp = this.startTas.filter(f => Math.random() > filterv || f.keep).map(m => ({ ...m }));
        if (this.config.maxTas > 0) {
            filterv = Math.random();
            while (temp.length > this.config.maxTas && temp.filter(t => !t.keep).length > 0) {
                temp = temp.filter(f => Math.random() > filterv || f.keep);
            }
        }
        while (temp.length < min) {
            const ii = Math.floor(Math.random() * this.startTas.length);
            temp.push({ ...this.startTas[ii] });
        }
        this.tas.arr = [...temp];
    }

    #mixSets() {
        this.tas.arr.forEach(ta => {
            if (ta.keepSet) {
                return;
            }
            const tempSet = [];
            if (ta.type == 'adx3') {
                ta.max[2] = 100;
            }
            ta.min.forEach((v, i) => {
                tempSet.push(Math.floor(Math.random() * (ta.max[i] - v) + v));
            });
            if (ta.tweak) {
                this.#tweakSets(ta, tempSet);
            }
            ta.set.forEach((v, i) => {
                ta.set[i] = tempSet[i];
            });
            if (tempSet.length > 1 && ta.fss) {
                const set1 = ta.set[0] > ta.set[1] ? ta.set[1] : ta.set[0];
                ta.set[1] = ta.set[0] > ta.set[1] ? ta.set[0] : ta.set[1];
                ta.set[0] = set1;
            }
        });
    }

    #tweakSets(ta, tempSet) {
        if (this.oldSet[ta.name]) {
            ta.set = [...this.oldSet[ta.name]];
        } else {
            this.oldSet[ta.name] = [...ta.set];
        }
        tempSet.forEach((v, i) => {
            const r = Math.random();
            if (r < 0.4) {
                tempSet[i] = Math.abs(ta.set[i] - Math.floor((ta.max[i] / 2 - v) * r)) || 1;
            } else {
                tempSet[i] = ta.set[i];
            }
        });
    }

    #addOld() {
        if (Math.random() >= this.config.addOld) {
            return;
        }
        let oldBests = this.highscore.getRBestScore();
        if (oldBests.length <= 0) {
            return;
        }
        if (oldBests.length > 1) {
            const randomNr = Math.random();
            const first = oldBests[0];
            oldBests = oldBests.filter(() => Math.random() > randomNr);
            if (oldBests.length < 1) {
                oldBests.push(first);
            }
        }
        oldBests = oldBests.filter(
            oldBest =>
                !this.tas.arr.find(
                    ta => ta.type == oldBest.type && ta.set.toString() == oldBest.set.toString()
                )
        );
        oldBests.forEach(oldBest => {
            const temp = this.tas.add(oldBest.type);
            temp.set = oldBest.set;
            temp.name += '1';
        });
    }
}

module.exports = Scan;
