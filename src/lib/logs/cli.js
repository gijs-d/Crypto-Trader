const fs = require('fs');
let logFile = 'data/logs.txt';

class Cli {
    prefix = [];
    times = {};

    constructor() {
        for (let i = 0; i < arguments.length; i++) {
            this.prefix.push(arguments[i]);
        }
    }
    
    setLogFile(file) {
        logFile = file;
    }
    
    print(tekst, lvl, save = true) {
        const pref = this.prefix.map(p => `[${p}]`).join('');
        const str = `[${new Date().toISOString().split('.')[0]}]${pref}[${lvl}] : ${tekst} ;`;
        if (save) {
            this.logToFile(str);
        }
        return str;
    }
    
    start() {
        const str = `\n[${new Date().toISOString().split('.')[0]}] : Start\n`;
        this.logToFile(str);
    }
    
    logToFile(str) {
        try {
            fs.promises.appendFile(logFile, `${str} \n`);
        } catch (e) {
            const estr = `[${
                new Date().toISOString().split('.')[0]
            }][logs][cli.js][error] : Save log failed ${e} ;`;
            console.log('\x1b[31m', estr);
        }
    }
    
    log(tekst) {
        console.log('\x1b[37m', this.print(tekst, 'log'));
    }
    
    info(tekst) {
        console.log('\x1b[36m', this.print(tekst, 'info'));
    }
    
    succes(tekst) {
        console.log('\x1b[32m', this.print(tekst, 'succes'));
    }

    infoTime(tekst) {
        if (this.times[tekst]) {
            const start = this.times[tekst];
            const stop = new Date().getTime();
            const time = (stop - start) / 1000;
            let tstr = '';
            if (time >= 3600) {
                tstr += ` ${Math.floor(time / 3600)}h `;
            }
            if (time >= 60) {
                tstr += ` ${Math.floor((time % 3600) / 60)}m `;
            }
            tstr += ` ${(time % 60).toFixed(2)}s `;
            this.times[tekst] = undefined;
            tekst += tstr;
        } else {
            this.times[tekst] = new Date().getTime();
        }
        console.log('\x1b[36m', this.print(tekst, 'info'));
    }

    infoIdTime(id, tekst) {
        if (this.times[id]) {
            const start = this.times[id];
            const stop = new Date().getTime();
            const time = (stop - start) / 1000;
            let tstr = '';
            if (time >= 3600) {
                tstr += ` ${Math.floor(time / 3600)}h `;
            }
            if (time >= 60) {
                tstr += ` ${Math.floor((time % 3600) / 60)}m `;
            }
            tstr += ` ${(time % 60).toFixed(2)}s `;
            this.times[id] = undefined;
            tekst += tstr;
        }
        console.log('\x1b[36m', this.print(tekst, 'info'));
    }

    succesSel(tekst) {
        console.log('\x1b[33m', this.print(tekst, 'success'));
    }

    buy(tekst) {
        console.log('\x1b[32m', this.print(tekst, 'buy'));
    }

    sell(tekst) {
        console.log('\x1b[33m', this.print(tekst, 'sell'));
    }

    time(tekst) {
        process.stdout.write(`\x1b[37m${this.print(tekst, 'time')}  \r`);
    }

    portfolio(tekst) {
        console.log('\x1b[36m', this.print(tekst, 'portfolio'));
    }

    tempLog(tekst) {
        process.stdout.write(`\x1b[K\x1b[37m ${this.print(tekst, 'tempLog', false)}  \r`);
    }

    table(tekst, table) {
        console.log('\x1b[37m', this.print(tekst, 'table'));
        console.table(table);
    }

    warn(tekst) {
        console.log('\x1b[33m', this.print(tekst, 'warn'));
    }

    error(tekst) {
        console.log('\x1b[31m', this.print(tekst, 'error'));
    }
}

module.exports = Cli;
