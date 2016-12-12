
function showProperties(obj) {
    console.log("!!: " + typeof obj);
    for (x in obj)
        console.log(x + ": " + obj[x]);
    console.log("---------------");
}

//https://github.com/dthree/vorpal/wiki/api-%7C-vorpal.command#commanddescriptionstring
var vorpal = require('vorpal')();
var less = require('vorpal-less');
var repl = require('vorpal-repl');
vorpal.use(less).use(repl);

vorpal
.delimiter('> ')
.show()
.parse(process.argv);

vorpal.command('cc <clientcount>', 'Specifies the number of active clients')
    .alias('clientcount')
    .action(function (args, cb) {
        clientcount = args.clientcount;
        this.log('Client count set to ' + clientcount);
        cb(undefined, clientcount);
    });

vorpal.command('d', 'Toggels debugmode')
    .alias('debug')
    .action(function (args, cb) {
        debugmode = !debugmode;
        this.log('debugmode set to: ' + debugmode);
        cb(undefined, clientcount);
    });

vorpal.command('stat', 'displays statistics')
    .action(function (args, cb) {
        this.log('clients instanzes: ' + clients.length + ", counter: " + currentConnectedClients + ", connected: " + currentConnectedClients + ", reqCounter: " + reqCounter);
        var cnt = 0;
        for (i in clients) {
            if (clients[i].connection != undefined) {
                if (clients[i].connection.connected)
                    cnt ++;
            }
        }
        cb(undefined, clientcount);
    });

vorpal.command('reset', 'reset statistic counter')
    .action(function (args, cb) {
        this.log('statistic counter reseted');
        reqCounter = 0;
        cb(undefined, clientcount);
    });

vorpal.command('timer [milliesonds]', 'display or set timer intervall')
    .action(function (args, cb) {
        if (args.milliesonds == undefined) {
            this.log('Current timer intervall: ' + sendIntervall+'ms');
        }
        else {
            sendIntervall = args.milliesonds;
            for (i in clients) {
                clients[i].setSendIntervall(sendIntervall);
            }
        }
        
        cb(undefined, sendIntervall);
    });


var colors = require('colors');
var glblconfig = require('./config.json');
var reqCounter = 0;
var currentConnectedClients = 0;
var sendIntervall = glblconfig.sendIntervall;
var debugmode = false;

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


//https://github.com/theturtle32/WebSocket-Node/blob/master/docs/WebSocketConnection.md#methods
function WebSocketContainer(config) {

    var sessioncount = 0;
    var WebSocketClient = require('websocket').client;

    this.NewClient = function () {
        var client = new WebSocketClient();
        //showProperties(client);

        client.SessionID = sessioncount++;
        client.setSendIntervall = function (sendIntervall) {
            config.sendIntervall = sendIntervall;

        };

        function sendNumber() {
            if (client.connection != undefined) {
                if (client.connection.connected) {
                    var number = Math.round(Math.random() * 0xFFFFFF);
                    data = {
                        sessionID: client.SessionID.toString(),
                        number: number
                    };

                    client.connection.send(JSON.stringify(data));
                    reqCounter++;
                }
            }
            client.TimerID = setTimeout(sendNumber, config.sendIntervall);
        };

        client.on('connect', function (connection) {

            currentConnectedClients++;
            client.connection = connection;

            LogFuction(messageType.info, 'WebSocket Client Connected: ' + connection.remoteAddress + ' ' + connection.protocol + ' ID:' + client.SessionID);

            connection.on('error', function (error) {
                LogFuction(messageType.error, "Connection Error ID(" + client.SessionID + "): " + error.toString());
                client.SessionID = -1;
            });

            connection.on('close', function () {
                currentConnectedClients--;
                LogFuction(messageType.info, 'echo-protocol Connection Closed');
                client.SessionID = -1;
            });


            connection.on('message', function (message) {
                if (message.type === 'utf8') {
                    LogFuction(messageType.debug, "Received(" + client.SessionID + "): '" + message.utf8Data + "'");
                    var data = JSON.parse(message.utf8Data);
                    //console.log(data.number);
                }
            });

            sendNumber();
        });

        client.on('connectFailed', function (connection) {
            LogFuction(messageType.error, 'Connection failed: ' + connection);
            client.SessionID = -1;
        });


        var url = 'ws://' + this.ip() + ':' + this.port() + '/';
        client.connect(url, 'echo-protocol');
        
        return client;
    };
    this.port = function () { return config.port };
    this.ip = function () { return config.serverIP };
}

var wsContainer = new WebSocketContainer(glblconfig);
var wsUrl = 'ws://' + glblconfig.serverIP + ':' + glblconfig.port + '/testpath?param1&value1';
console.log(wsUrl);

var clients = new Array();
var clientcount = glblconfig.clientcount;
var createTimeout = function () {
    
    if (clientcount > clients.length)
    {
        var cli = wsContainer.NewClient();
        clients.push(cli);
        setTimeout(createTimeout, 5);
        return;
    }
    if (clientcount < clients.length) {
        var delClient = clients.shift();
        if (delClient.connection != undefined)
            delClient.connection.close();
        setTimeout(createTimeout, 5);
        return;
    }
    if (clients.length > 0) {
        var chkClient = clients.shift();
        if (chkClient != undefined)
        {
            if (chkClient.SessionID != -1) {
                clients.push(chkClient);
            }
        }
    }
    setTimeout(createTimeout, 10);
}
setTimeout(createTimeout, 1);




