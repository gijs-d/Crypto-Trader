const fs = require('fs');
const LiveGame = require('./liveGame');
const Cli = require('../../logs');
const cli = new Cli('trad','live', 'live.js');

class Live {
    playing = [];

    constructor() {
        this.loadBackups();
    }

    async loadBackups() {
        try {
            let backups = await fs.promises.readFile('data/live/backup.json');
            backups = JSON.parse(backups.toString());
            const n = backups.length;
            if (n > 0) {
                cli.log(`restoring ${n} lives`);
            }
            backups.forEach(async backupId => {
                try {
                    let backup = await fs.promises.readFile(`data/live/lives/${backupId}.json`);
                    backup = JSON.parse(backup.toString());
                    backup['id'] = backupId;
                    this.add(backup.set, backup.tasArray, backup);
                } catch {}
            });
        } catch {}
    }

    checkPlayings() {
        this.playing = this.playing.filter(f => {
            if (f.error) {
                cli.error(
                    `${f.set.pair} ${f.set.timef} ${f.tasArray
                        .map(t => `${t.type} [ ${t?.set.join(',')} ]`)
                        .join(', ')} stoped`
                );
                return false;
            }
            return true;
        });
    }

    add(set, tas, backup) {
        const errorHandler = e => {
            this.checkPlayings(e);
        };
        const newGame = new LiveGame(set, tas, errorHandler, backup);
        if (newGame.error) {
            cli.error(
                `live ${set?.pair} ${set?.timef} ${tas.getTasString && tas.getTasString()} stoped`
            );
            return;
        }
        this.playing.push(newGame);
        if (!backup) {
            fs.writeFileSync('data/live/backup.json', JSON.stringify(this.playing.map(p => p.id)));
        }
    }

    getAll() {
        return this.playing.map(p => p.getStats()).filter(f => f);
    }

    get(id) {
        return this.playing.find(p => p?.id == id)?.getStats();
    }

    getData(id) {
        return this.playing.find(p => p?.id == id)?.getData();
    }

    close(id) {
        this.playing.find(p => p.id == id)?.close();
        this.playing = this.playing.filter(p => p.id != id);
        fs.writeFileSync('data/live/backup.json', JSON.stringify(this.playing.map(p => p.id)));
    }
}

module.exports = new Live();
