class SocketStream {
    io;
    dataStreams = new Set();

    sendData(topic, stats, data) {
        let message = stats;
        if (this.dataStreams.has(stats.id)) {
            this.dataStreams.delete(stats.id);
            message = { ...stats, ...data };
        }
        this.io.emit(topic, message);
    }

    send(topic, message) {
        this.io.emit(topic, message);
    }
}

module.exports = new SocketStream();
