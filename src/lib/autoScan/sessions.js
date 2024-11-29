const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const Cli = require('../logs');
const cli = new Cli('autoScan', 'sessions.js');

const __root = process.cwd();
const processFile = path.join(__root, './src/startAutoScan.js');
const saveFile = 'data/sessions.json';

class Sessions {
    sessions = [];

    constructor() {
        this.getSessions();
    }

    async getSessions() {
        try {
            const savedSessions = JSON.parse(await fs.readFile(saveFile));
            this.sessions = savedSessions.sessions;
        } catch {}
    }

    async saveSessions() {
        await fs.writeFile(
            saveFile,
            JSON.stringify({ sessions: this.sessions })
        );
    }

    startTmux(settings) {
        const id = Date.now().toString(36);
        const name = `autoScan-${id}`;
        cli.info(`start tmux ${name}`);
        const tmuxSession = spawn(
            'tmux',
            [
                'new-session',
                '-d',
                '-s',
                name,
                'node',
                processFile,
                settings ? JSON.stringify(settings) : '',
            ],
            {
                detached: true,
                stdio: 'ignore',
            }
        );
        tmuxSession.unref();
        this.sessions.push({ name, settings, startTime: Date.now() });
        this.saveSessions();
        return name;
    }

    async stopTmux(name) {
        return new Promise(res => {
            cli.info(`stop tmux ${name}`);
            const tmuxKill = spawn('tmux', ['kill-session', '-t', name]);
            tmuxKill.on('close', code => {
                if (code === 0) {
                    this.sessions = this.sessions.filter(session => session.name != name);
                    this.saveSessions();
                    res(true);
                } else {
                    cli.log(code);
                    res(false);
                }
            });
        });
    }
}

module.exports = new Sessions();
