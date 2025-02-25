// HiddePlayer GPL-3.0 License

//Packages
const mineflayer = require('mineflayer');
const cmd = require('mineflayer-cmd').plugin;
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const pvpBot = require('mineflayer-pvp').plugin;
const prompt = require("prompt-sync")();
const Discord = require('discord.js');
const commander = require('commander');
const yml = require('yaml');
const fs = require('fs');

// sub commands
const program = new commander.Command;
    
    program
            .option('--testmode', 'Enable testmode')
            .option('--minecraft-player-name <playername>', 'Player name for testmode Minecraft bot')
            .option('--minecraft-server-ip <ip>', 'Server IP for testmode server')
            .option('--minecraft-server-port <port>', 'Server port for testmode server')
            .option('--minecraft-player-join-msg <message>', 'test mode on join message')
            .option('--discord <token>', 'Testmode discord bot')
            .option('--testmode-timeout <timeout>', 'Test mode timeout in milliseconds')
    program.parse();

// date
let date = new Date;
let date_d = String(date.getDate()).padStart(2, '0');
let date_m = String(date.getMonth() + 1).padStart(2, '0'); //January is 0!
let date_y = date.getFullYear();
let date_mm = 'AM';
let date_h = date.getHours();
    if(date_h >= 12) { date_mm = 'PM' }
    if(date_h > 12){
        date_h = date_h - 12;
    }
let date_mi = date.getMinutes()
let date_dmy = date_d + '-' + date_m + '-' + date_y + '-' + date_h + ':' + date_mi + '-' + date_mm + '.' + randomInteger(100,200);

//logger
const consoleLog = new Logger();

//Create discord client
const client = new Discord.Client({ 
    intents: [
        Discord.Intents.FLAGS.GUILDS,
        Discord.Intents.FLAGS.GUILD_INTEGRATIONS,
        Discord.Intents.FLAGS.GUILD_BANS,
        Discord.Intents.FLAGS.GUILD_MEMBERS,
        Discord.Intents.FLAGS.GUILD_MESSAGES,
        Discord.Intents.FLAGS.GUILD_PRESENCES
    ]
});

// Global variables
const configlocation = 'config/config.yml';
const logPath = 'logs/';
let configVersion = null;
let config = {};
let debug = false;
let messages = {
    reload_config: {
        start: "Reading config file...",
        success: "Config is ready!",
        failed: "Config error!",
        different_versions: "Config error: different versions"
    }
};
let messageResponseFile = {};

consoleLog.overwriteLatest();
consoleLog.log(date_dmy, "Date");
parse();

//connections
var discordConnected = false;
var BotUsed = false;
var conn = null;

// Repository
var fullname = config['debug']['prefix']+config['player']['name']+config['debug']['suffix'];
startUpScreen();
consoleLog.log('============================ '+fullname+' '+configVersion+' ===========================', "Startup", 1);
consoleLog.log("", "Startup", 1);
consoleLog.log('GitHub: https://github.com/FalloutStudios/HiddenPlayer', "Startup", 1);
consoleLog.log("", "Startup", 1);
consoleLog.log('=========================================================='+loop(fullname.length, '=')+loop(configVersion.length, '='), "Startup", 1);
consoleLog.log("\n\n", "Startup", 1);

//debug mode enabled/disabled log
if(debug) consoleLog.log(messages['logging']['enabled'], "Debug", 1);
if(!debug) consoleLog.log(messages['logging']['disabled'], "Debug", 1);

//Global functions
function startUpScreen() {
    consoleLog.log("\n\n", 'Startup', 1);
    consoleLog.log(' __    __    ________    ________     ________     ______   ______     __', 'Startup', 1);
    consoleLog.log('|  |  |  |  |__    __|  |   ___  \\   |   ___  \\   |   ___|  |     \\   |  |', 'Startup', 1);
    consoleLog.log('|  |__|  |     |  |     |  |   |  |  |  |   |  |  |  |___   |  |\\  \\  |  |', 'Startup', 1);
    consoleLog.log('|   __   |     |  |     |  |   |  |  |  |   |  |  |   ___|  |  | \\  \\ |  |', 'Startup', 1);
    consoleLog.log('|  |  |  |   __|  |__   |  |___|  |  |  |___|  |  |  |___   |  |  \\  \\|  |', 'Startup', 1);
    consoleLog.log('|__|  |__|  |________|  |________/   |________/   |______|  |__|   \\_____|', 'Startup', 1);
    consoleLog.log('', 'Startup', 1);
}
function parse(){
    //success pre variable
    var success = false;

    //parse default config
    var body_conf = fs.readFileSync(configlocation, 'utf8');

    //parse JSON
    var body_config = yml.parse(body_conf);

    if(debug) {
        consoleLog.log(messages['reload_config']['start'], 'Config', 2);
        consoleLog.log(body_config, 'Config', 2);
    }

    //get config version
    var confV = body_config['version'];

    //throw error when versions doesn't match
    if(configVersion != null && configVersion != confV) {
        consoleLog.log(messages['reload_config']['different_versions'], 'Config', 4);
        return success;
    } else{
        configVersion = confV;
        success = true;
    }

    //change config contents
    config = body_config;

    //debug enabled/disabled
    debug = config['debug']['enabled'];

    //inline edit config
    testMode();
    inlineInteractions();

    //messages and response files
    switch (true){
        case (config['language'] == null):
            consoleLog.log('Can\'t load messages file', 'MessagesFile', 4);
            process.exit(0);
        case (config['responses'] == null):
            consoleLog.log('Can\'t load response messages file', 'ResponsesFile', 4);
            process.exit(0);
    }   

    //parse messages and response files
    messages = yml.parse(fs.readFileSync(config['language'], 'utf-8'));
    messageResponseFile = yml.parse(fs.readFileSync(config['responses'], 'utf8'));

    //messages and reponse files version check
    switch (true){
        case (messages['version'] != config['version']):
            consoleLog.log('Config version doesn\'t match messages file version', 'MessagesFile', 4);
            process.exit(0);
        case (messageResponseFile['version'] != config['version']):
            consoleLog.log('Config version doesn\'t match response messages file version', 'ResponsesFile', 4);
            process.exit(0);
    }

    if(debug) consoleLog.log(messages['reload_config']['success'], 'Config', 1);

    if (config['player']['name'] == null || config['player']['name'] == ''){
        config['player']['enabled'] = false;
    } else if (config['discord']['token'] == null){
        config['discord']['enabled'] = false;
    }

    if(success){
        //restart all proccesses
        if(config['discord']['enabled']) DiscordBot(config['discord']['token']);
        if(config['player']['enabled']) newBot(config['player']['name'], config['server']['ip'], config['server']['port'], config['server']['version']);
    }
    return success;
}
function testMode(){
    if(!program.opts().testmode) return;
    if(debug) consoleLog.log('Test mode enabled', 'TestMode', 3);

    config['server']['ip'] = 'play.ourmcworld.ml';
    config['server']['port'] = 39703;
    config['player']['name']= 'HiddenPlayer';

    let timeout = 300000;

    switch (true) {
        case (program.opts().minecraftServerIp != null):
            config['server']['ip'] = program.opts().minecraftServerIp
            break;
        case (program.opts().minecraftServerPort != null):
            config['server']['port'] = program.opts().minecraftServerPort
            break;
        case (program.opts().minecraftPlayerName != null):
            config['player']['name'] = program.opts().minecraftPlayerName
            break;        
        case (program.opts().minecraftPlayerJoinMsg != null):
            config['player']['message'] = program.opts().minecraftPlayerJoinMsg
            break;
        case (program.opts().discord != null):
            config['discord']['token'] = program.opts().discord
            break;
        case (program.opts().testmodeTimeout != null):
            timeout = parseInt(program.opts().testmodeTimeout, 10)
            break;        
        default:
            break;
    }

    setTimeout(() => {
        if(debug) consoleLog.log('Test mode timeout', 'TestMode', 3);
        process.exit(0);
    }, timeout);
}
function inlineInteractions(){
    switch (true){
        case (config['player']['enabled'] && config['player']['name'] == null || config['player']['enabled'] && config['player']['name'] == ''):
            config['player']['name'] = prompt("Enter Player Name >>> ");    
            break;
        case (config['player']['enabled'] && config['server']['ip'] == null || config['player']['enabled'] && config['server']['ip'] == ''):
            config['server']['ip'] = prompt("Enter Server IP (Don't include Port) >>> ");
            break;
        case (config['player']['enabled'] && config['server']['port'] == null || config['player']['enabled'] && config['server']['port'] == ''):
            config['server']['port'] = prompt("Enter Server Port (Enter to use default) >>> ");
        
            if(!isNumber(parseInt(config['server']['port']))){
                config['server']['port'] = null;
            }
        break;
    }
}
function customResponse(message = null, get = true, source = "minecraft") {
    if(message == null) {return;}
    message = trimUnicode(message).toLowerCase();

    if(!Object.keys(messageResponseFile[source]).includes(message)) {return;}

    if(config['player']['name'] != null){
        message = replaceAll(message, config['player']['name'].toLowerCase(), "").trim();
    }

    if(messageResponseFile[source][message].isArray()) {
        if(get) {return true;}

        return messageResponseFile[source][message][Math.floor(Math.random() * Object.keys(messageResponseFile[source][message]).length)];
    } else if (typeof messageResponseFile[source][message] == 'string' || isNumber(parseInt(messageResponseFile[source][message]))) {
        if(get) {return true;}

        return messageResponseFile[source][message];
    }

    return false;
}
function loop(num = 0, str = ''){
    var returnVal = '';
    for (let i = 0; i < num; i++) {
        returnVal += str;
    }
    return returnVal;
}
function replaceAll(str, find, replace) {
    if(str == null) { return; }
    return str.toString().replace(new RegExp(escapeRegExp(find), 'g'), replace);
}
function randomInteger(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function limitText(text = null){
	if(text != null && text.length >= 100){
		text = text.substr(0,100) + "...";
	}
	return text;
}
function trimUnicode(text) {
    if(text == null) {return true;}
    text = text.trim();
    text = replaceAll(text,"'",'');
    text = replaceAll(text,".",'');
    text = replaceAll(text,"/",'');
    text = replaceAll(text,"\\",'');
    text = replaceAll(text,",",'');
    text = replaceAll(text,"  ",' ');
    text = replaceAll(text,"?",'');
    text = replaceAll(text,"!",'').trim();

    return text;
}
function escapeRegExp(string) {
    return string.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}
function isNumber(n){
    return !isNaN(parseFloat(n)) && isFinite(n);
}
function splitCommand(text = '', removeQuotations = false){
    let regex = new RegExp("(?<=^[^\"]*(?:\"[^\"]*\"[^\"]*)*) (?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)");

    text = text.trim();
    text = escapeRegExp(text);
    text = text.split(regex);

    if(removeQuotations){
        let newText = [];
        for (const value of text) {
            newText.push(replaceAll(replaceAll(value, '"', ''), "\\", ''));
        }
        text =newText;
    }

    return text;
}
function makeSentence(object = [], skip = 0) {
    if(typeof object === 'object' && Object.keys(object).length > 0) {
        let outputText = '';
        for (let i = 0; i < Object.keys(object).length; i++) {
            if(i < skip) { continue; }

            outputText += ' ' + object[Object.keys(object)[i]];
        }
        return outputText.trim();
    }
}
function Logger(){
    const object = {};

    object.log = function (text = "", logType = "Log", warnLevel = 0, logFile = true){
        if(warnLevel < 0 || warnLevel > 4) return false;

        var newText = text;

        switch (true){
            case (warnLevel === 1):
                newText = "[INFO - " + logType + "] " + newText;
                
                console.log('\x1b[36m%s\x1b[0m', newText);
                break;
            case (warnLevel === 2):
                newText = "[SUCCESS - " + logType + "] " + newText;
                
                console.log('\x1b[32m%s\x1b[0m', newText);
                break;
            case (warnLevel === 3):
                newText = "[WARN - " + logType + "] " + newText;
                
                console.warn('\x1b[33m%s\x1b[0m', newText);
                break;
            case (warnLevel === 4):
                newText = "[ERROR - " + logType + "] " + newText;
                
                console.log('\x1b[31m%s\x1b[0m', newText);
                break;
            default:
                newText = "[INFO - " + logType + "] " + newText;
                
                console.log(newText);
        }

        let logFileContent = newText;

        if(fs.existsSync(logPath + 'latest.log')) { 
            logFileContent = fs.readFileSync(logPath + 'latest.log') + "\n" + newText; 
        }
        logFileContent = logFileContent.trim();
        fs.writeFileSync(logPath + 'latest.log', logFileContent.toString());

        return true;
    }

    object.overwriteLatest = function (){
        if(typeof logPath + 'latest.log' === "undefined") return false;

        if(fs.existsSync(logPath + 'latest.log')) { 
            const contents = fs.readFileSync(logPath + 'latest.log', 'utf-8');
            let splitDate = contents.toString().trim().split("\n");
                splitDate = splitCommand(splitDate[0].toString(), true);

                if(contents.trim() == '' || splitDate == null) { return false; }

                fs.writeFileSync(logPath + 'latest.log', '');
                
                const dateLogMatch = /^([0-9]+(-[0-9]+)+):[0-9]+-[a-zA-Z]+\.[0-9]+$/si;
                splitDate = replaceAll(splitDate[3].toUpperCase(), "\\", '').trim();

                if(!dateLogMatch.test(splitDate)) { return false; }
                splitDate = replaceAll(replaceAll(splitDate, '.', '_'), ':', '_');
                let path = logPath + splitDate + '.log';

                fs.writeFileSync(path, contents);
        }
    }

    return object;
}

//Main Functions
function newBot(player = "", ip = '127.0.0.1', port = 25565, version = null){
    const consolePrefix = 'MinecraftBot';

    //movements
    let actions = ['forward', 'back', 'left', 'right'];
    var lasttime = -1;
    var moveinterval = 5;
    var maxrandom = 5;
    var moving = false;
    var jump = true;
    var onPVP = false;
    var lastaction = null;
    var deathCount = 0;
    let mcData = null;
    let defaultMove = null;

    //login
    let logged = false;
    let connected = false;

    //entities
    let entity = null;
    let target = null;

    //mcdata ready
    let mcDataEnabled = false;

    //parseint port
    port = parseInt(port, 10);

    if(debug) consoleLog.log(messages['minecraft_bot']['starting'], consolePrefix, 2);

    //get connected and logged status
    if(connected && logged) {
        if(debug) consoleLog.log(messages['minecraft_bot']['disconnected_bot'], consolePrefix, 2);

        //set all status to false
        connected = false;
        logged = false;

        //disconnect bot
        if(bot){
            bot.quit();
            bot.end();
        }
    }

    if(!config['player']['enabled']){
        if(debug) consoleLog.log(messages['minecraft_bot']['disabled'], consolePrefix, 3);
        return true;
    }

    if(debug) consoleLog.log(messages['minecraft_bot']['proccessing'], consolePrefix, 2);
    
    //set bot prefix and suffix
    if(debug && config['debug']['prefix'] != null || debug && config['debug']['suffix'] != null){
        //join prefix and suffix to name
        player = config['debug']['prefix'] + player + config['debug']['suffix'];
    
        if(debug) consoleLog.log(messages['minecraft_bot']['prefix_and_suffix_enabled'], consolePrefix, 1);
    
        //check name lenght
        if(player == '' || player == null || player.length > 16 || player.length < 4){
            consoleLog.log(messages['minecraft_bot']['invalid_name']+': '+player.length, consolePrefix, 4); 
            process.exit();
        }
    }

    //validate port
    if (!isNumber(port) || typeof port != 'undefined' && !isNumber(port) || port > 65535 || port < 1) { 
        consoleLog.log(messages['minecraft_bot']['invalid_port']+': '+port, consolePrefix, 4); 
        process.exit(0);        
    }

    //check if minecraft bot already connected
    if(BotUsed) {
        consoleLog.log(messages['minecraft_bot']['already_connected'], consolePrefix, 4);
        return true;
    }
    
    BotUsed = true;
    //summon bot
    var bot = mineflayer.createBot({
        host: ip,
        port: port,
        username: player,
        version: version
    });

    if(debug) consoleLog.log(ip+'; Port: '+port+'; PlayerName: '+player+'; Prefix: '+config['debug']['prefix']+'; suffix: '+config['debug']['suffix']+'; Version: '+config['player']['version'], consolePrefix);

    //load mineflayer plugins
    bot.loadPlugin(cmd);
    bot.loadPlugin(pathfinder);
    bot.loadPlugin(pvpBot);

    //check if death counts enabled
    if(config['player']['countdeaths']['enabled'] && fs.existsSync(config['player']['countdeaths']['src'])) {
        //read death count file
        deathCount = parseInt(fs.readFileSync(config['player']['countdeaths']['src'])) || 0;

        //check for valid number
        if(deathCount == null || typeof deathCount == 'undefined' || !isNumber(deathCount)){
            //set new number when invalid
            deathCount = 0;

            //write new valid number to the file
            fs.writeFileSync(config['player']['countdeaths']['src'], deathCount + '');
        }
    }

    //Check pvp
    if(debug && config['player']['pvp']['enabled']) consoleLog.log(messages['minecraft_bot']['pvp-enabled'], consolePrefix, 3);
    if(debug && !config['player']['pvp']['enabled']) consoleLog.log(messages['minecraft_bot']['pvp-disabled'], consolePrefix, 3);

    bot.on('chat', function (username, message){
        //set admin var
        let admin = false;

        //check if player is the bot
        if(username == player || username == 'you') { return true; }

        //check for admin perms
        if(config['player']['admin'].includes(username.toString())) { 
            admin = true; 
            consoleLog.log(username+' is an admin', consolePrefix, 1); 
        } else{ 
            consoleLog.log(username+' is not an admin', consolePrefix, 1); 
        }

        //check for commands in chat
        if(message.substr(0,1) == '!'){
            //split command and args
            let args = message.slice(1).trim().split(/ +/);
            let command = args.shift().toLowerCase().trim();

            if(debug) consoleLog.log(messages['minecraft_bot']['command_execute']+': '+command, consolePrefix, 1);
            
            //commands
            if(command == ''){
                //invalid command: null
                bot.chat(messages['minecraft_bot']['chats']['command_invalid']);
            } else if (admin && command == 'reloadconfig' && config['player']['commands']['reload'] || admin && command == 'reload' || admin && command == 'restartconfig' && config['player']['commands']['reload']){
                //reload config
                bot.chat("Reloading Bot Config");
                
                //reload function
                let reloadConfig = parse();

                //parse config
                if(reloadConfig){
                    //reload success
                    bot.chat(messages['reload_config']['success']);
                } else{
                    //reload failed
                    bot.chat(messages['reload_config']['failed']);
                }
            } else if (admin && command == 'restartbot' && config['player']['commands']['restart'] || admin && command == 'reloadbot'&& config['player']['commands']['restart']){
                //restart mineflayer bot
                bot.chat(messages['minecraft_bot']['chats']['command_restarting']);

                //quit and restart
                bot.quit();
                bot.end();
            } else if (command == 'deathcount' && config['player']['countdeaths']['enabled']) {
                bot.chat(`I died `+deathCount.toLocaleString()+` times`);
            }

        } else{
            if (debug && config['debug']['minecraft_chats']) consoleLog.log('Player chat received from '+username+' > '+message, consolePrefix);

            //reply var declaration
            let reply = null;

            //trim message
            message = trimUnicode(message);

            //message without bot's name
            var removeMensions = replaceAll(message,player,"").trim();

            //lowercase message
            var lmsg = message.toLowerCase();
            var lrmsg = removeMensions.toLowerCase();

            //bot reply
            if(lmsg == player.toLowerCase() + ' hi'|| lmsg == 'hi ' + player.toLowerCase() || lrmsg == 'hi guys' || lrmsg == 'hi bot' || lrmsg == 'bot hi'){
                reply = messages['minecraft_bot']['response']['hi'];
            } else if (lmsg == player.toLowerCase() + 'hello' || lmsg == 'hello ' + player.toLowerCase() || lrmsg == 'hello guys' || lmsg == player.toLowerCase()){
                reply = messages['minecraft_bot']['response']['hello'];
            } else if (lrmsg.replace('hello','').replace('hi','').trim() == 'im new' || lrmsg.replace('hello','').replace('hi','').trim() == 'im new here' || lrmsg.replace('hello','').replace('hi','').trim() == 'new here'){
                reply = messages['minecraft_bot']['response']['im_new'];
            } else if (lmsg.indexOf("who") > -1 && lmsg.indexOf("is") > -1 && lmsg.indexOf(player.toLowerCase()) > -1 || lmsg == 'whos '+player.toLowerCase() || lmsg == player.toLowerCase()+' who are you'){
                reply = messages['minecraft_bot']['response']['who'];
            } else if (lmsg.indexOf("what") > -1 && lmsg.indexOf("is") > -1 && lmsg.indexOf("bot") > -1 || lmsg.indexOf("what") > -1 && lmsg.indexOf("are") > -1 && lmsg.indexOf("bot") > -1){
                reply = messages['minecraft_bot']['response']['what'];
            } else if (lrmsg == 'a government spy' && lmsg.indexOf(player.toLowerCase()) > -1){
                reply = messages['minecraft_bot']['response']['spy'];
            } else if (lmsg.indexOf("kill "+player) > -1){
                reply = messages['minecraft_bot']['response']['kill'];
            } else if (customResponse(lmsg, false)){
                reply = customResponse(lmsg, true);
            }

            //reply placeholders
            reply = replaceAll(reply, "%player%", username);
            reply = replaceAll(reply, "%player_lowercase%", username.toLowerCase());
            reply = replaceAll(reply, "%player_uppercase%", username.toUpperCase());
            reply = replaceAll(reply, "%bot%", player);
            reply = replaceAll(reply, "%bot_lowercase%", player.toLowerCase());
            reply = replaceAll(reply, "%bot_uppercase%", player.toUpperCase());

            //summon reply
            if(reply != null) {
                //set chat delay
                setTimeout(() => {
                    //execute reply
                    bot.chat(reply);
                }, config['player']['chatDelay']);
            }
        }
    });

    bot.on('spawn', () => {
        if(debug) consoleLog.log(messages['minecraft_bot']['spawned'], consolePrefix);

        //check if connected and logged status is true
        if(!connected && !logged){
            if(debug) consoleLog.log(messages['minecraft_bot']['first_spawn'], consolePrefix, 2);

            if(config['player']['autosave']['enbled']){
                saveAll();
            }

            bot.chat(config['player']['message']);

            setTimeout(() => {
                connected = true;
                logged = true;
                mcDataEnabled = true;
                if(debug) consoleLog.log('connected = '+connected+'; logged = '+logged, consolePrefix, 2);
            }, 500);
        }

        //set all to default
        lasttime = -1;
        bot.pvp.stop();
        if (lastaction != null) bot.setControlState(lastaction,false);
        bot.deactivateItem();
        moving = false;
    });

    bot.on('death',function() {
        //emit respawn when died
        bot.emit("respawn");

        if(debug) consoleLog.log(messages['minecraft_bot']['died'], consolePrefix, 3);

        //count every deaths
        if(config['player']['countdeaths']['enabled']){
            deathCount++;
            fs.writeFileSync(config['player']['countdeaths']['src'], deathCount + '');
        }
    });

    bot.on('time',function (time){
        //check if bot has been disabled
        if(!config['player']['enabled']) {
            //disconnect bot
            bot.quit();
            bot.end();
            return true;
        }

        //check if bot was logged and connected
        if(!logged && !connected) { return true; }

        //get nearest entity
        entity = bot.nearestEntity();
        
        //filter entities
        if(entity != null && entity.position != null && entity.isValid && entity.type == 'mob' || entity != null && entity.position != null && entity.isValid && entity.type == 'player') bot.lookAt(entity.position.offset(0, 1.6, 0));

        //hit hostile mobs
        if(config['player']['pvp']['enabled']){
            //check entity type
            if(entity && entity.kind && entity.isValid && entity.type == 'mob' && entity.kind.toLowerCase() == 'hostile mobs'){
                onPVP = true;
                //atack entity
                bot.pvp.attack(entity);
                //change hotbar slot
                bot.setQuickBarSlot(1);
            } else {
                onPVP = false;
                //stop pvp
                bot.pvp.stop();
                //change hotbar slot
                bot.setQuickBarSlot(0);
            }
        }


        //on time movement
        if (lasttime < 0) {
            //set last time
            lasttime = bot.time.age;

            if(debug) consoleLog.log(messages['minecraft_bot']['set_last_time'], consolePrefix, 1);
        } else{
            let randomadd = Math.random() * maxrandom * 50;
            let interval = moveinterval * 20 + randomadd;

            //movements
            if (bot.time.age - lasttime > interval) {
                if (onPVP) { return true; }

                if (moving){
                    bot.setControlState(lastaction,false);
                    bot.deactivateItem();

                    moving = false;
                } else{
                    lastaction = actions[Math.floor(Math.random() * actions.length)];
                    bot.setControlState(lastaction,true);
                    bot.activateItem();
                    
                    moving = true;
                    lasttime = bot.time.age;
                }

                if(debug && config['debug']['movements']) consoleLog.log('age: '+bot.time.age+'; lasttime: '+lasttime+'; interval: '+interval+'; lastaction: '+lastaction+'; follow: '+config['player']['follow']['enabled']+'; moving: '+moving+'; pvp: '+onPVP, consolePrefix);
            }

            //bot jump
            if(jump){
                //enable jump
                bot.setControlState('jump', true);

                //disable jump
                bot.setControlState('jump', false);

                //set jump to false
                jump = false
            } else {
                //disable jump for a while
                bot.setControlState('jump', false);

                //set jump time out
                setTimeout(() => {
                    jump = true;
                }, 1000);
            }
        }
    });

    bot.on('disconnect',function (){
        if(debug) consoleLog.log(messages['minecraft_bot']['disconnected'], consolePrefix, 3);

        //end bot
        if (connected) { bot.quit(); bot.end(); }
    });
    bot.on('error', reason => {
        if(debug) consoleLog.log('Minecraft bot Error'+reason, consolePrefix, 3);

        //end bot
        if (connected) { bot.quit(); bot.end(); }
    });
    bot.on('banned', reason => {
        if(debug) consoleLog.log('Banned:'+reason, consolePrefix, 3);

        //end bot
        if (connected) { bot.quit(); bot.end(); }
    });
    bot.on('kicked', reason => {
        if(debug) consoleLog.log('kicked:'+reason, consolePrefix, 3);

        //end bot
        if (connected) { bot.quit(); bot.end(); }
    });

    bot.on('end', (reason) => {
        //reconnect timeout
        setTimeout(() => {
            //set status to false
            connected = false;
            logged = false;
            BotUsed = false;

            //check if minecraft player was enabled
            if(!config['player']['enabled']) { return true; }

            //request new bot
            newBot(player, ip, port, version);
            if(debug) consoleLog.log(messages['minecraft_bot']['bot_end']+': '+reason, consolePrefix, 4);
        }, config['server']['reconnectTimeout']);
    });

    //auto save interval
    function saveAll(){
        if (!bot) { return true; }
        if (!config['player']['enabled']) { return true; }

        if(debug) consoleLog.log(messages['minecraft_bot']['saved'], consolePrefix, 2);

        if(logged && connected) bot.chat(`/minecraft:save-all`);

        setTimeout(() => {
            saveAll();
        }, config['player']['autosave']['interval']);
    }
}
function DiscordBot(token = null){
    let consolePrefix = 'DiscordBot';
    //check if discord bot was connected
    if(discordConnected){
        //get client
        if(client){
            //destroy session
            client.destroy();
        }

        //set status to false
        discordConnected = false;
    }
    
    //check if discord bot is enabled
    if(!config['discord']['enabled']){
        if(debug) consoleLog.log(messages['discord_bot']['disabled'], consolePrefix, 3);

        //exit bot
        return true;
    }

    //set bot token
    client.login(token);
    
    if(debug) consoleLog.log(messages['discord_bot']['enabled'], consolePrefix, 2);

    //on bot ready
    client.once('ready', async () => {
        //set bot status to true
        discordConnected = true;
        if(debug) consoleLog.log(messages['discord_bot']['ready']+": "+client.user.tag+"; "+client.user.id, consolePrefix, 1);

        let inviteURL = 'Bot Invite Link: https://discord.com/api/oauth2/authorize?client_id='+client.user.id+'&permissions=8&scope=bot';

        consoleLog.log();
        consoleLog.log(loop(inviteURL.length, '='));
        consoleLog.log("\n"+inviteURL+"\n");
        consoleLog.log(loop(inviteURL.length, '='));
        consoleLog.log();

        if(config['discord']['presence']['enable']){
            await client.user.setPresence({
                status: config['discord']['presence']['status'],  //You can show online, idle....
                activities: [{
                    name: config['discord']['presence']['name'],  //The message shown
                    type: config['discord']['presence']['type'].toUpperCase(), //PLAYING: WATCHING: LISTENING: STREAMING:
                    url: config['discord']['presence']['url']
                }]
            });
        }
        
        //actions list
        let emotes = null;
        let reacts = null;
        let motivations = null;
        let factslist = null;

        //get action files content
        if(config['discord']['emotes']['enabled']){
            //get emotes json file
            emotes = fs.readFileSync(config['discord']['emotes']['src'], 'utf8');
            emotes = yml.parse(emotes);
        }

        if(config['discord']['react']['enabled']){
            //get react json file
            reacts = fs.readFileSync(config['discord']['react']['src'], 'utf8');
            reacts = yml.parse(reacts);
        }

        if(config['discord']['motivate']['enabled']){
            //get motivate json file
            motivations = fs.readFileSync(config['discord']['motivate']['src'], 'utf8');
            motivations = yml.parse(motivations);
        }

        if(config['discord']['facts']['enabled']){
            //get factslist json file
            factslist = fs.readFileSync(config['discord']['facts']['src'], 'utf8');
            factslist = yml.parse(factslist);
        }

        //on message
        client.on('message', function(message) {
            //disconnect if bot was disabled
            if(!config['discord']['enabled']){
                client.destroy();
                return true;
            }

            //Message varialbes
            //raw content
            let rawMessage = message.content;

            //trimmed and lowercase message
            let lowerMessage = trimUnicode(message.content.toLowerCase());


            //bot informations
            let botAvatar = client.user.displayAvatarURL();
            let botName = client.user.tag;
            let botUser_id = client.user.id;
            let userAvatar = message.author.displayAvatarURL({ format: 'png', dynamic: true });


            //message informations
            let taggedUser = message.mentions.users.first();
            let taggedUsername = null;
            let pinged = '<@!'+taggedUser+'>';
                //prevent user error: !message.mentions.users.size
                if (message.mentions.users.size) taggedUsername = taggedUser.username;

            let author = message.author.username;
            let user_id = message.author.id;

            let mension = '<@!'+user_id+'>';

            let channelName = message.channel.name;
            let channelID = message.channel.id;

            //Has admin permission
            let AdminPerms = false;
            if(message.member && message.member.permissions.has(Discord.Permissions.FLAGS.ADMINISTRATOR)) AdminPerms = true;
            
            //return if the author is bot
            if(author.bot || botUser_id == user_id) { return true; }

            //ignored channels
            var ignored_channels = config['discord']['ignored_channels'];
            var ignored_to_whitelist = config['discord']['ignored_to_whitelist'];

            //ignored users
            var ignored_users = config['discord']['ignored_users'];

            //Check discord ignore list
            if(ignored_to_whitelist && !ignored_channels.includes(channelID.toString()) || !ignored_to_whitelist && ignored_channels.includes(channelID.toString())){
                return true;
            }
            if(ignored_to_whitelist && !ignored_channels.includes(parseInt(channelID)) || !ignored_to_whitelist && ignored_channels.includes(parseInt(channelID))){
                return true;
            }

            //Check player ignore list
            if(ignored_users.includes(user_id.toString()) || ignored_users.includes(parseInt(user_id))) { return true; }

            //bot utility functions
            //find bot name in message
            function findName (string) {
                //return if null
                if(string == null) { return true; }

                //trim string
                string = trimUnicode(string.toLowerCase());

                //start finding
                for (let val of config.discord.prefix) {
                    if (string.indexOf(' '+val.toLowerCase()+' ') > -1 || string.startsWith(val.toLowerCase()+' ') || string.endsWith(' '+val.toLowerCase()) || val.toLowerCase() == string){
                        return true;
                    }
                }

                //return result
                return false;
            }
            //remove bot mensions
            function removeMensions (string) {
                //return if null
                if(string == null) { return true; }

                //make lowercase
                string = string.toLowerCase().trim();

                //start removing name
                for (let i=0; i < config.discord.prefix.length; i++) {
                    if (string.indexOf(' '+config['discord']['prefix'][i]+' ') > -1 || string.indexOf(config['discord']['prefix'][i]+' ') > -1 || string.indexOf(' '+config['discord']['prefix'][i]) > -1 || string.startsWith(config['discord']['prefix'][i]+' ')){
                        string = replaceAll(string,' '+config['discord']['prefix'][i]+' ','');
                        string = replaceAll(string,config['discord']['prefix'][i]+' ','');
                        string = replaceAll(string,' '+config['discord']['prefix'][i],'');
                        string = string.trim();
                    }
                }

                string = trimUnicode(string);

                //return string
                return string;
            }
            //find action command in message
            function actionFind (message = '', get = false){
                //return if null
                if(message == null) { return true; }

                //return if bot doesn't mensionned
                if(!findName(message)) { return true; }

                //get all emotes list
                let actions = Object.keys(emotes);

                //predeclare found var
                let found = null;

                //get action name is false
                if(!get) found = false;
                
                //check for action name
                for (let val of actions) {
                    if(removeMensions(message).toLowerCase().startsWith(val.toLowerCase())){
                        found = true;

                        if(get) return val.toLowerCase();
                    }
                }

                return found;
            }

            //random INT response
            var randomResponse = randomInteger(0, 5);

            //CMD or STRING check
            if (!rawMessage.startsWith(config['discord']['command-prefix'])){
                if(config['debug']['discord_chats']) consoleLog.log(messages['discord_bot']['message_sent']+": "+author, consolePrefix);
                //discord msg

                if (findName(rawMessage) && removeMensions(lowerMessage).substr(0, 9) == 'tp me to ') {
                    if(removeMensions(lowerMessage).substr(9) != ''){
                        if(taggedUser != client.user.id){
                            if(taggedUser != user_id){

                                if (!message.mentions.users.size)
                                    message.channel.send(removeMensions(lowerMessage).substr(9)+' Would you like me to tp '+mension+' to you in real life?');
                                else
                                    message.channel.send(pinged+' Would you like me to tp '+mension+' to you in real life?');
                    
                            } else{

                                if (randomResponse == 0)
                                    message.channel.send('I will not tp '+mension + ' to you because it\'s you :smirk:');
                                else if (randomResponse == 1)
                                    message.channel.send(mension + ' you\'re stupid sometimes');
                                else if (randomResponse == 2)
                                    message.channel.send('something is wrong with '+mension + '\'s head');
                                else
                                    message.channel.send(mension + ' are you ok?');

                            }
                        } else{

                            if (randomResponse == 0)
                                message.channel.send('It\'s me! but no :)');
                            else if (randomResponse == 1)
                                message.channel.send('I don\'t exist physicaly sad :anguished:');
                            else
                                message.channel.send('I don\'t want you to see me, I\'m just a hard drive :desktop:');
                            
                        }
                    } else{
                        message.channel.send('It\'s empty you know :confused:');
                    }
                } else if (findName(rawMessage) && actionFind(lowerMessage) && config['discord']['emotes']['enabled']) {
                    if(AdminPerms || !AdminPerms && !config['discord']['emotes']['admin-only']){
                        if(message.mentions.users.size){
                            let emoteName = actionFind(lowerMessage, true);
                            let emote = emotes[emoteName];

                            let selfPing = false;
                            if(taggedUser == user_id) selfPing = true;

                            let phrase = null;
                            let RandomImage = null;
                            
                            if(selfPing){
                                if(randomResponse == 0 && emote['selfAllow']){
                                    phrase = emote['sentences'][Math.floor(Math.random() * Object.keys(emote.sentences).length)];
                                } else{
                                    phrase = emote['selfPing'][Math.floor(Math.random() * Object.keys(emote.selfPing).length)];
                                }
                            } else{
                                phrase = emote['sentences'][Math.floor(Math.random() * Object.keys(emote.sentences).length)];
                            }

                            phrase = phrase.replace(/%author%/g, author).replace(/%victim%/g, taggedUsername);

                            if(!selfPing){
                                RandomImage = emote['sources'][Math.floor(Math.random() * Object.keys(emote.sources).length)];
                            }

                            if (RandomImage != null) {
                                var embed = new Discord.MessageEmbed()
                                    .setColor(config['discord']['embed']['color'])
                                    .setAuthor(phrase, userAvatar)
                                    .setImage(RandomImage);

                                message.channel.send({ embeds: [embed] });
                                return true;
                            }
                            message.channel.send(phrase);
                        } else{
                            message.reply(':no_entry_sign: Invalid arguments! type `>help` for help').then(sentMessage => {
                                setTimeout( () => sentMessage.delete(), 5000);
                            });
                        }
                    } else {
                        message.reply(messages['discord_bot']['chats']['command_no_perm']).then(sentMessage => {
                            try {
                                    sentMessage.delete(); 
                                    message.delete();
                            } catch {}
                        });
                    }
                } else if (findName(rawMessage) && removeMensions(lowerMessage).substr(0,8) == 'motivate' || findName(rawMessage) && removeMensions(lowerMessage).substr(0,11) == 'motivate me' || findName(rawMessage) && removeMensions(lowerMessage).substr(0,10) == 'motivation' || findName(rawMessage) && removeMensions(lowerMessage).substr(0,5) == 'quote' || removeMensions(lowerMessage).substr(0,11) == 'motivate me') {
                    if(config['discord']['motivate']['enabled']){
                        if(AdminPerms || !AdminPerms && !config['discord']['motivate']['admin-only']){
                            let randomKey = Math.floor(Math.random() * Object.keys(motivations).length);
                            
                            let msg = Object.keys(motivations)[randomKey];
                            let author = motivations[msg]['author'];

                            if(author == null && author == ''){
                                author = 'Unknown';
                            }

                            var embed = new Discord.MessageEmbed()
                                .setColor(config['discord']['embed']['color'])
                                .setTitle(`By: `+author)
                                .setDescription('> '+msg);
                            message.channel.send({ embeds: [embed] });
                        } else {
                            message.reply(messages['discord_bot']['chats']['command_no_perm']).then(sentMessage => {
                                try {
                                    sentMessage.delete(); 
                                    message.delete();
                                } catch {}
                            });
                        }
                    }
                } else if (findName(rawMessage) && removeMensions(lowerMessage).substr(0,11).replace('tell','').replace('me','').trim() == 'random fact') {
                    if(config['discord']['facts']['enabled']){
                        if(AdminPerms || !AdminPerms && !config['discord']['facts']['admin-only']){
                            let randomKey = Math.floor(Math.random() * Object.keys(factslist).length);

                            let msg = Object.keys(factslist)[randomKey];
                            let source = factslist[msg]['source'];

                            if(source == null || source == ''){
                                source = 'Unknown';
                            }

                            var embed = new Discord.MessageEmbed()
                                .setColor(config['discord']['embed']['color'])
                                .setTitle(msg)
                                .setDescription('`Source: '+source+'`');
                            message.channel.send({ embeds: [embed] });
                        } else {
                            message.reply(messages['discord_bot']['chats']['command_no_perm']).then(sentMessage => {
                                try {
                                    sentMessage.delete(); 
                                    message.delete();
                                } catch {}
                            });
                        }
                    }
                } else if (customResponse(rawMessage, false, "discord")) {
                    let reply = customResponse(rawMessage, true, "discord");

                    reply = replaceAll(reply, "%botname%", botName);
                    reply = replaceAll(reply, "%author%", author);
                    reply = replaceAll(reply, "%author_ping%", mension);

                    message.channel.send(reply);
                } else if(findName(rawMessage) || taggedUser == botUser_id) {
                    message.react('854320612565450762');
                }
            } else {
                //get command name and args
                let args = splitCommand(rawMessage.slice(config['discord']['command-prefix'].length).trim(), true);
                let command = args.shift().toLowerCase().trim();

                if(debug) consoleLog.log(messages['discord_bot']['command_execute']+": "+command+" by "+author, consolePrefix, 1);

                //commands
                if (command == 'help'){

                    message.channel.send("Help not available")
                    
                } else if (command == 'version' && config['discord']['version-command']['enabled']) {
                    if(AdminPerms || !AdminPerms && !config['discord']['version-command']['admin-only']){
                        var embed = new Discord.MessageEmbed()
                            .setColor(config['discord']['embed']['color'])
                            .setAuthor(botName, botAvatar)
                            .setTitle('Version')
                            .setDescription(config['version'])
                            .setTimestamp();
                        message.reply({ embeds: [embed] });
                    } else{
                        message.reply(messages['discord_bot']['chats']['command_no_perm']).then(sentMessage => {
                            try {
                                sentMessage.delete(); 
                                message.delete();
                            } catch {}
                        });
                    }
                } else if (command == 'me') {
                    var embed = new Discord.MessageEmbed()
                        .setColor(config['discord']['embed']['color'])
                        .setAuthor(author)
                        .setImage(avatar);
                    message.channel.send({ embeds: [embed] });
                } else if (command == 'deathcount' && config['discord']['deathcount']['enabled'] && fs.existsSync(config['player']['countdeaths']['src'])) {
                    if(AdminPerms || !AdminPerms && !config['discord']['deathcount']['admin-only']){
                        let readDeathcountFile = parseInt(fs.readFileSync(config['player']['countdeaths']['src']));
                        let count = 0;
                        if(typeof readDeathcountFile == 'null' || typeof readDeathcountFile == 'undefined' || !isNumber(readDeathcountFile)){
                            fs.writeFileSync(config['player']['countdeaths']['src'], '0');
                        } else {
                            count = readDeathcountFile.toLocaleString();
                        }
                    } else{
                        message.reply(messages['discord_bot']['chats']['command_no_perm']).then(sentMessage => {
                            try {
                                sentMessage.delete(); 
                                message.delete();
                            } catch {}
                        });
                    }

                    consoleLog.log(readDeathcountFile);

                    message.channel.send(replaceAll(messages['discord_bot']['deathcount'], "%count%", count));
                } else if (command == 'embed' && config['discord']['embed']['enabled']) {
                    if(AdminPerms || !AdminPerms && !config['discord']['embed']['admin-only']) {
                        try { message.delete(); } catch {}

                        let title = args[Object.keys(args)[0]];
                        let content = makeSentence(args, 1);

                        var embed = new Discord.MessageEmbed()
                            .setColor(config['discord']['embed']['color'])
                            .setTitle(title)
                            .setAuthor('HiddenPlayer', botAvatar)
                            .setDescription(content)
                            .setTimestamp()
                        message.channel.send({ embeds: [embed] });
                    } else {
                        message.reply(messages['discord_bot']['chats']['command_no_perm']).then(sentMessage => {
                            try {
                                sentMessage.delete(); 
                                message.delete();
                            } catch {}
                        });
                    }
                } else if (command == 'send' && config['discord']['send-command']['enabled']) {
                    if(AdminPerms || !AdminPerms && !config['discord']['send-command']['admin-only']) {
                        try { message.delete(); } catch {}
                        message.channel.send(rawMessage.slice(config['discord']['command-prefix'].length).substr(command.length + 1).trim());
                    } else {
                        message.reply(messages['discord_bot']['chats']['command_no_perm']).then(sentMessage => {
                            try {
                                sentMessage.delete(); 
                                message.delete();
                            } catch {}
                        });
                    }
                } else if (command == 'spam' && config['discord']['spam']['enabled']) {
                    
                    let count = 10;
                    let msg = '';

                    if(AdminPerms || !AdminPerms && !config['discord']['spam']['admin-only']){
                        for (const value of args) {
                            msg += ' ' + value;
                        }

                        if(args.length > 1 && isNumber(parseInt(args[0]))){
                            msg = '';
                            count = parseInt(args[0]);
                            for (let i = 1; i < args.length; i++) {
                                msg += ' '+args[i];
                            }
                        }

                        msg = msg.toString().trim();
                        let disabled_channels = config.discord.spam.disabled_channels;

                        switch (true){
                            case (count <= 0 && count > config['discord']['spam']['max']):
                                message.reply(messages['discord_bot']['spam']['invalid_lenght']).then(sentMessage => {
                                    setTimeout(() => { sentMessage.delete(); message.delete() }, 5000);
                                });
                                break;
                            case (disabled_channels.includes(channelID.toString())):
                                message.reply(messages['discord_bot']['command_disabled']).then(sentMessage => {
                                    setTimeout(() => { sentMessage.delete(); message.delete() }, 5000);
                                });
                                break;
                            case (msg == ''):
                                message.reply(messages['discord_bot']['spam']['empty']).then(sentMessage => {
                                    setTimeout(() => { sentMessage.delete(); message.delete() }, 5000);
                                });
                                break;
                            default:
                                if(!config['discord']['spam']['player_ping'] && !message.mentions.users.size > 0 && !message.mentions.roles.size > 0 && !message.mentions.everyone || config['discord']['spam']['player_ping']){
                                    for (let i = 0; i < count; i++){
                                        message.channel.send(messages['discord_bot']['spam']['prefix'] + msg);
                                    }
                                } else {
                                    message.reply(messages['discord_bot']['spam']['no_ping']).then(sentMessage => {
                                        setTimeout(() => { sentMessage.delete(); message.delete() }, 5000);
                                    });
                                }
                        }
                    } else {
                        message.reply(messages['discord_bot']['chats']['command_no_perm']).then(sentMessage => {
                            try {
                                sentMessage.delete(); 
                                message.delete();
                            } catch {}
                        });
                    }

                } else if (command == 'smap') {
                    message.reply("Did you mean `>spam` :thinking:");
                } else if (command == 'exembed') {
                    if(AdminPerms || !AdminPerms && !config['discord']['embed']['admin-only']) {
                        var embed = new Discord.MessageEmbed()
                            .setColor(config['discord']['embed']['color'])
                            .setTitle('Some title')
                            .setURL('https://discord.js.org/')
                            .setAuthor('Some name', 'https://i.imgur.com/wSTFkRM.png', 'https://discord.js.org')
                            .setDescription('Some description here')
                            .setThumbnail('https://i.imgur.com/wSTFkRM.png')
                            .addFields(
                                { name: 'Regular field title', value: 'Some value here' },
                                { name: '\u200B', value: '\u200B' },
                                { name: 'Inline field title', value: 'Some value here', inline: true },
                                { name: 'Inline field title', value: 'Some value here', inline: true },
                            )
                            .addField('Inline field title', 'Some value here', true)
                            .setImage('https://i.imgur.com/wSTFkRM.png')
                            .setTimestamp()
                            .setFooter('Some footer text here', 'https://i.imgur.com/wSTFkRM.png');
                        message.channel.send({ embeds: [embed] });
                    } else {
                        message.reply(messages['discord_bot']['chats']['command_no_perm']).then(sentMessage => {
                            try {
                                sentMessage.delete(); 
                                message.delete();
                            } catch {}
                        });
                    }
                } else if (command == 'reloadall' || command == 'reloadassets') {
                    if(AdminPerms) {
                        message.reply(`Reloading assets`);
                        if(config['discord']['emotes']['enabled']){
                            emotes = fs.readFileSync(config['discord']['emotes']['src'], 'utf8');
                            emotes = yml.parse(emotes);

                            if(debug) consoleLog.log(messages['discord_bot']['reload_complete']+': Emotes', consolePrefix, 2);
                        }
                
                        if(config['discord']['react']['enabled']){
                            reacts = fs.readFileSync(config['discord']['react']['src'], 'utf8');
                            reacts = yml.parse(reacts);

                            if(debug) consoleLog.log(messages['discord_bot']['reload_complete']+': Reacts', consolePrefix, 2);
                        }
                
                        if(config['discord']['motivate']['enabled']){
                            motivations = fs.readFileSync(config['discord']['motivate']['src'], 'utf8');
                            motivations = yml.parse(motivations);

                            if(debug) consoleLog.log(messages['discord_bot']['reload_complete']+': Motivations', consolePrefix, 2);
                        }
                        message.channel.send(messages['discord_bot']['reload_complete']+': Assets');
                    } else {
                        message.reply(messages['discord_bot']['chats']['command_no_perm']).then(sentMessage => {
                            try {
                                sentMessage.delete(); 
                                message.delete();
                            } catch {}
                        });
                    }
                } else if (command == 'reload') {
                    if(AdminPerms) {
                        message.reply(messages['discord_bot']['reloading']);
                        let reload = parse();
                        if(reload){
                            message.reply(messages['reload_config']['success']);
                        } else {
                            message.reply(messages['reload_config']['failed']);
                        }
                    } else {
                        message.reply(messages['discord_bot']['chats']['command_no_perm']).then(sentMessage => {
                            try {
                                sentMessage.delete(); 
                                message.delete();
                            } catch {}
                        });
                    }
                }
            }

            if(config['debug']['discord_chats']) {
                consoleLog.log(messages['discord_bot']['message_received']+": "+limitText(message.content), consolePrefix);
            }
        });
    });
}