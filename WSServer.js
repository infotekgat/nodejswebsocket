
//https://github.com/dthree/vorpal/wiki/api-%7C-vorpal.command#commanddescriptionstring
var vorpal = require('vorpal')();
var less = require('vorpal-less');
var repl = require('vorpal-repl');
vorpal.use(less).use(repl);

vorpal
.delimiter('> ')
.show()
.parse(process.argv);

vorpal.command('d', 'Toggels debugmode')
    .alias('debug')
    .action(function (args, cb) {
        debugmode = !debugmode;
        this.log('debugmode set to: ' + debugmode);
        cb(undefined, debugmode);
    });

vorpal.command('stat', 'displays statistics')
    .action(function (args, cb) {
        this.log('clients: ' + currentConnectedClients + ", reqCounter: " + reqCounter);
        cb(undefined, reqCounter);
    });


var reqCounter = 0;
var currentConnectedClients = 0;
var debugmode = false;


var colors = require('colors');
var conf = require('./config.json');


function MessageType() {
    this.debug = 0;
    this.error = 1;
    this.warning = 2;
    this.info = 3;
}

var messageType = new MessageType();
function LogFuction(msgType, msg) {

    if (msgType == messageType.debug) {
        if (!debugmode) return;
        return vorpal.log(msg.yellow);
    }

    if (msgType == messageType.error)
        return vorpal.log(msg.red);

    if (msgType == messageType.warning)
        return vorpal.log(msg.orange);

    if (msgType == messageType.info)
        return vorpal.log(msg.white);
}


var WebSocketServer = require('websocket').server;
var http = require('http');
 
var server = http.createServer(function(request, response) {
    LogFuction(messageType.warning, (new Date()) + ' Received request for ' + request.url);
    response.writeHead(404);
    response.end();
});
var server_port = process.env.YOUR_PORT || process.env.PORT || 80;
var server_host = process.env.YOUR_HOST || '0.0.0.0';
server.listen(server_port, server_host, function () {
   
    LogFuction(messageType.info, ((new Date()) + ' Server is listening on port: ' + server_port));
});
 
wsServer = new WebSocketServer({
    httpServer: server,
    // You should not use autoAcceptConnections for production 
    // applications, as it defeats all standard cross-origin protection 
    // facilities built into the protocol and the browser.  You should 
    // *always* verify the connection's origin and decide whether or not 
    // to accept it. 
    autoAcceptConnections: false
});
 
function originIsAllowed(origin) {
    // put logic here to detect whether the specified origin is allowed. 
    return true;
}
 
wsServer.on('request', function(request) {
    if (!originIsAllowed(request.origin)) {
        // Make sure we only accept requests from an allowed origin 
        request.reject();
        LogFuction(messageType.error, ((new Date()) + ' Connection from origin ' + request.origin + ' rejected.'));
        return;
    }
    
    var connection = request.accept('echo-protocol', request.origin);
    LogFuction(messageType.info, (new Date()) + ' Connection accepted.');
    currentConnectedClients++;
    connection.on('message', function (message) {
        reqCounter++;
        if (message.type === 'utf8') {
            LogFuction(messageType.debug, 'Received Message: ' + message.utf8Data);
            connection.sendUTF(message.utf8Data);
        }
        else if (message.type === 'binary') {
            LogFuction(messageType.debug, 'Received Binary Message of ' + message.binaryData.length + ' bytes');
            connection.sendBytes(message.binaryData);
        }
    });
    connection.on('close', function (reasonCode, description) {
        currentConnectedClients--;
        LogFuction(messageType.error,  (new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
    });
});

