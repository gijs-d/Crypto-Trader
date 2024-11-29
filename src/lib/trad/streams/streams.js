const Stream = require('./stream');
const Cli = require('../../logs');
const cli = new Cli('trad', 'streams', 'streams.js');

class Streams {
    streams = new Map();

    getStream(pair, timef, handler) {
        const streamId = `${pair}-${timef}`;
        if (this.streams.has(streamId)) {
            this.streams.get(streamId).addHandler(handler);
        } else {
            const newStream = new Stream(pair, timef, handler);
            this.streams.set(streamId, newStream);
        }
        return this.streams.get(streamId);
    }

    stop(pair, timef, handler) {
        const streamId = `${pair}-${timef}`;
        if (!this.streams.has(streamId)) {
            return;
        }
        const stream = this.streams.get(streamId);
        stream.handlers.delete(handler.id);
        if (stream.handlers.size > 0) {
            return;
        }
        stream.stop();
        this.streams.delete(streamId);
    }

    getIds() {
        return [...this.streams.keys()];
    }
}

module.exports = new Streams();
