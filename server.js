var fs = require('fs');
var config = JSON.parse(fs.readFileSync('./config.cnf', 'utf8').toString());
exports.config = config;

var logger = require('./utils/logger.js'),
    math = require('./utils/math.js'),
    net = require('net'),
    winston = require('winston'),
    obj = require('./utils/obj.js'),
    systemLogger = winston.loggers.get('system');

var clients = {};

var processRequest = function (client, data) {
    var commands = data.toString().split(" ");
    switch (commands[0]) {
        case "SETUP": {
            var k = JSON.parse(commands[1]).k;
            var status = math.setupFFS(k);
            obj.merge(client.status, status);
            systemLogger.info("Client: " + client.id + " requested identification. Generating p,q,n,s,v.");
            return { n: status.n, v: status.v, k: status.k }
        }
        case "X": {
            var status = math.generateX(client.status.n);
            obj.merge(client.status, status);
            systemLogger.info("Client: " + client.id + " requested x generation.");
            return { x: status.x };
        }
        case "FX": {
            var status = math.generateFX(client.status.n, client.status.v);
            obj.merge(client.status, status);
            systemLogger.info("Generating fake x for client: " + client.id);
            return { x: status.fx };
        }
        case "A": {
            var a = JSON.parse(commands[1]);
            obj.merge(client.status, a);
            systemLogger.info("Client: " + client.id + " sent a.");
            return a;
        }
        case "Y": {
            var status = math.generateY(client.status.r, client.status.s, client.status.a, client.status.n);
            obj.merge(client.status, status);
            systemLogger.info("Client: " + client.id + " requested y generation.");
            return { y: status.y };
        }
        case "FY": {
            systemLogger.info("Sending fake y for client: " + client.id);
            return { y: client.status.fy };
        }
        case "RESET": {
            client.status = {};
            systemLogger.info("Resetting client: " + client.id + " status");
            return {};
        }
    }
}

net.createServer(function (socket) {
    
    systemLogger.info("Client connected");
    
    socket.write("Welcome\n");
    
    var client = { socket: socket, status: {}, id: obj.generateId() };
    
    clients[client.id] = client;
    
    socket.on('data', function (data) {
        try {
            systemLogger.debug(data.toString());
        } catch (err) { }
        var response = processRequest(client, data);
        socket.write(JSON.stringify(response));
    });
    
    socket.on('end', function () {
        systemLogger.info("Client: " + client.id + " disconnected");
        delete clients[client.id];
    });

    socket.on('error', function () {
        systemLogger.error("Connection with client: " + client.id + " dropped");
        delete clients[client.id];
    });

}).listen(config.port);

