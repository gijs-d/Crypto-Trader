const fs = require('fs');

const fileName = 'data/tas/tas.json';

class Types {
    list = [];

    constructor() {
        this.#loadTas();
    }

    getTasString() {
        return JSON.stringify(
            this.list.map(t => {
                t.calc = t.calc
                    .toString()
                    .split('\n')
                    .map(s => s.trim())
                    .join('\n ');
                return t;
            })
        );
    }

    #saveTas() {
        fs.writeFileSync(fileName, this.getTasString());
    }

    #loadTas() {
        try {
            let savedList = fs.readFileSync(fileName);
            savedList = JSON.parse(savedList);
            this.list = savedList.map(t => {
                t.calc = eval(t.calc);
                return t;
            });
        } catch {}
    }

    addTas(newTas) {
        if (this.list.some(l => l.type === newTas.type)) {
            return false;
        }
        newTas.calc = eval(newTas.calc);
        this.list.unshift(newTas);
        this.#saveTas();
        return true;
    }

    removeTas(type) {
        const oldLength = this.list.length;
        this.list = this.list.filter(l => l.type !== type);
        if (oldLength != this.list.length) {
            this.#saveTas();
        }
    }

    getTas(type) {
        return this.list.find(l => l.type === type);
    }

    updateTas(type, newTas) {
        const tasN = this.list.findIndex(l => l.type === type);
        if (!(tasN >= 0)) {
            return false;
        }
        this.list[tasN] = { ...newTas };
        this.#saveTas();
        return true;
    }
}

module.exports = new Types();
