const socketTopics = new Map();
const socketStream = require('../socketStream');

//socketTopics.set('connection', async (socket) => {
//const userId = socket.request.session.user;
//socket.join(userId);
//});

socketTopics.set('getData', async msg => {
    socketStream.dataStreams.add(msg.id);
});

module.exports = socketTopics;
