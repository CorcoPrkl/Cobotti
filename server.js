var express = require('express');
var app     = express();
var bodyParser = require('body-parser');
var mysql   = require('mysql');
var fs      = require('fs');
var irc		= require('irc');
 
var mysqlconn = mysql.createConnection({
host : process.env.OPENSHIFT_MYSQL_DB_HOST,
port : process.env.OPENSHIFT_MYSQL_DB_PORT,
user : process.env.OPENSHIFT_MYSQL_DB_USERNAME,
password : process.env.OPENSHIFT_MYSQL_DB_PASSWORD,
database : 'cobotti',
});

mysqlconn.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(__dirname + '/'));
app.listen(process.env.OPENSHIFT_NODEJS_PORT, process.env.OPENSHIFT_NODEJS_IP);

//generate quote-listing for index.html
app.get('/api', function(req, res) {
	var querystr = 'SELECT * FROM quotes;';
	mysqlconn.query(querystr, function(err, rows, fields) {  
    res.json({ quotes: rows});
  });
  });
  
//read botname and server from database
function readBotData(callBack)
{
var querystr = 'SELECT * FROM botdata LIMIT 1;';
mysqlconn.query(querystr, function(err, rows) {

for (var i in rows)
{
if (rows.length > 0) {
botName = rows[i].name;
botServer = rows[i].server;
}
//if database has no botname or server, use the defaults
else {
botName = "Cobotti";
botServer = "quakenet.org";
}
}
//log the botname and server
console.log("Botname: "+botName);
console.log("Server: "+botServer);
callBack(botName, botServer);
});
}

//create bot, using the above function for the name and server
	readBotData(function(name,server) {
    bot = new irc.Client(server, name, {
	channels: [],
    port: 6667,
    debug: true,
	autoConnect: true,
	floodProtection: true,
	retryDelay: 60000,	
	});

//join channels once connected
bot.addListener('registered', function(message) {
var querystr = 'SELECT * FROM channels;';
mysqlconn.query(querystr, function(err, rows) {
for (var i in rows) {
bot.join(rows[i].channel);
}
});
});

//create listeners, once the bot is created
//listeners for join/part, ping, atm only for logging
bot.addListener('join', function(channel, who) {
console.log(channel, who + " joined");
});

bot.addListener('part', function(channel, who) {
console.log(channel, who + " left");
});

bot.addListener('ping', function(server) {
console.log("ping: " + server);
});

//listener for channel messages
bot.addListener('message', function(from, to, message) {

var subMessage = message.split(" ");

//print out requested quote
if (subMessage[0] == "!def") {

var querystr = ("SELECT * FROM quotes WHERE id = '"+subMessage[1]+"' LIMIT 1;");
mysqlconn.query(querystr, function(err, rows) {
	if (err) throw err;
	if (rows.length == 0) bot.say(to, "Quote '"+subMessage[1]+"' not found");
	if (rows.length > 0) for (var i in rows) {
	bot.say(to, rows[i].id+ ": '"+rows[i].quote+"'");	
	}
	});
}

//add new quote
if (subMessage[0] == "!defadd") {

	var querystr = ("SELECT * FROM quotes WHERE id = '"+subMessage[1]+"';");
	mysqlconn.query(querystr, function(err, rows) {
	if (rows.length > 0) bot.say(to, "Duplicate entry, try 'def! "+subMessage[1]+"'");
	else {
	var joinedMessage = subMessage[2]+" ";
	for (var i = 3; i < subMessage.length; i++)
	{
	joinedMessage += subMessage[i]+" ";
	}
	joinedMessage = joinedMessage.slice(0, -1);
	var querystr = ("INSERT INTO quotes(id, quote) VALUES ('"+subMessage[1]+"','"+joinedMessage+"') ON DUPLICATE KEY UPDATE id=id,quote=quote;");
	
	mysqlconn.query(querystr, function(err, rows) {
	if (err) throw err;
	if  (rows.changedRows > 0) bot.say(to, "Quote added: !def "+subMessage[1]+ ", " +joinedMessage);
	});
	}
	
	});
	}

//remove quote	
if (subMessage[0] == "!defrem") {
var querystr = ("DELETE FROM quotes WHERE id = '"+subMessage[1]+"';");
mysqlconn.query(querystr, function(err, rows){
if (err) throw err;
if (rows.affectedRows > 0) bot.say(to, "Quote '"+subMessage[1]+"' removed!");
if (rows.affectedRows == 0) bot.say(to, "Quote '"+subMessage[1]+"' not found!");
});
}

//add new channel in to the database and join the channel
if (subMessage[0] == "!channeladd") {
var querystr = ("INSERT INTO channels(channel) VALUES ('"+subMessage[1]+"') ON DUPLICATE KEY UPDATE channel=channel;");
mysqlconn.query(querystr, function(err, rows){
if (err) throw err;
if (rows.changedRows > 0) {
bot.say(to, "Channel '"+subMessage[1]+"' added! Joining now");
bot.join(subMessage[1]);
}
if (rows.changedRows == 0) bot.say(to, "Channel '"+subMessage[1]+"' already on the list!");
});
}

//remove channel from the database and leave it
if (subMessage[0] == "!channelrem") {
var querystr = ("DELETE FROM channels WHERE channel = '"+subMessage[1]+"';");
mysqlconn.query(querystr, function(err, rows){
if (err) throw err;
if (rows.affectedRows > 0) { 
bot.say(to, "Channel '"+subMessage[1]+"' removed! Leaving now");
bot.part(subMessage[1]);
}
if (rows.affectedRows == 0) bot.say(to, "Channel '"+subMessage[1]+"' not found!");
});
}

//print help message
if (subMessage[0] == "!help") {
bot.say(to, "!def NAME to read a quote, !defadd NAME QUOTE to add a new one, !defrem NAME to remove a quote. !list for a list of all quotes. !channeladd #CHANNEL to join a new channel, !channelrem #CHANNEL to leave. !source for the github link. Have fun!");
}

//list all quotes, check index.html
if (subMessage[0] == "!list") {
bot.say(to, "http://cobotti-corcoder.rhcloud.com/");
}

//link to the github
if (subMessage[0] == "!source") {
bot.say(to, "https://github.com/CorcoPrkl/Cobotti");
}

});
});