const types = require('./types');

class Tas {
    arr = [];
    maxn = 500;
    ids = 0;
    temp = [];
    res = [];
    types = [];
    lastTime;
    cache = {};

    constructor() {
        const savedList = types.getTasString();
        this.types = JSON.parse(savedList).map(t => {
            t.calc = eval(t.calc);
            return t;
        });
    }

    calc(data) {
        this.temp = {};
        this.res = {};
        let saveSome = [false];
        this.#setup(saveSome);
        this.#loop(data);
        this.#saveCache(saveSome);
        this.lastTime = data[data.length - 1].time;
        return this.res;
    }

    #setup(saveSome) {
        this.arr.forEach(ta => {
            ta.ids.forEach(id => {
                this.temp[id] = [];
                this.res[id] = [];
            });
            if (ta.keepSet) {
                saveSome[0] = true;
                if (this.cache[ta.name]) {
                    this.cache[ta.name].forEach(([id, arr]) => {
                        this.res[id] = [...arr];
                    });
                }
            }
        });
    }

    #loop(data) {
        const loopTas = this.arr.filter(ta => !(ta.keepSet && this.cache[ta.name]));
        if (loopTas.length) {
            data.forEach(d => {
                loopTas.forEach(t => {
                    t.calc(t.ids, t.set, d);
                });
            });
        }
    }

    #saveCache(saveSome) {
        if (saveSome[0]) {
            this.cache = {};
            this.arr.forEach(ta => {
                if (ta.keepSet) {
                    this.cache[ta.name] = ta.ids.map(id => [id, this.res[id]]);
                }
            });
        }
    }
    testSet(savedtas) {
        savedtas.calc = eval(savedtas.calc);
        const tas = this.makeTas(savedtas);
        if (tas.set.length == this.arr[0].set.length) {
            tas.set = this.arr[0].set;
        }
        this.arr = [tas];
    }

    update(data) {
        data.filter(d => d.time > this.lastTime).forEach(d => {
            this.arr.forEach(t => {
                t.calc(t.ids, t.set, d);
            });
        });
        this.lastTime = data[data.length - 1].time;
        return this.res;
    }

    del(name) {
        this.arr = this.arr.filter(t => t.name !== name);
    }

    get() {
        return this.arr;
    }

    getTasString() {
        return this.arr.map(tt => `${tt.type} [${tt.set.join(',')}]`).join(', ');
    }

    loadFromTasArray(array) {
        array.forEach(newTas => {
            try {
                this.add(newTas.type, newTas.set);
            } catch {}
        });
    }

    add(type, set) {
        const savedtas = this.types.find(t => t.type == type);
        const tas = this.makeTas(savedtas);
        if (set) {
            if (set?.length != tas.set.length) {
                throw new Error('Bad Set');
            }
            tas.set = set;
        }
        this.arr.push(tas);
        return tas;
    }

    makeTas(savedtas) {
        const name = Math.random().toString(36).slice(3) + new Date().getTime().toString(36);
        const set = [...Array(savedtas.set[0]).keys()].map(() =>
            Math.floor(Math.random() * this.maxn)
        );
        const ids = [...Array(savedtas.set[1]).keys()].map((m, i) => this.ids + i);
        const min = [...Array(savedtas.set[0]).keys()].map((m, i) => 1);
        const max = [...Array(savedtas.set[0]).keys()].map((m, i) => this.maxn);
        const tas = { ...savedtas, name, min, max, set, ids };
        const updateId = rule => {
            if (rule.some(element => element[0] == 'id')) {
                return rule.map(element => {
                    if (element[0] == 'id') {
                        return ['id', this.ids + element[1]];
                    }
                    return element;
                });
            }
        };
        if (tas.oc?.open) {
            tas.oc = JSON.parse(JSON.stringify(tas.oc));
            tas.oc.open = tas.oc.open.map(updateId);
            tas.oc.close = tas.oc.close.map(updateId);
        }
        tas.check = tas.check.map(updateId);
        this.ids += savedtas.set[1];
        return tas;
    }
}

module.exports = Tas;
