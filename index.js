const express = require('express');
const socketio = require('socket.io');
const http = require('http');

const PORT = 7070;

const router = require('./router');

const app = express();
const server = http.createServer(app);
const io = socketio(server);
require('./socket./socket')(io)

app.use(router);

server.listen(PORT, () => console.log(`started PORT ${PORT}`))
