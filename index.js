const axios = require('axios');
const fs = require('fs');
const TelegramBot = require('node-telegram-bot-api');

const token = '6461252280:AAGx_Jld3gLvoqhkj_HIh16SRt9apP51RB4';
const bot = new TelegramBot(token, { polling: true });

let targets = {}; // Initialize an empty targets object
// Define an array to store processed battle IDs
const processedBattleIds = [];


// Function to read targets from the "target.json" file
function readTargetsFromFile() {
    fs.readFile('target.json', 'utf8', (err, jsonData) => {
        if (!err) {
            try {
                targets = JSON.parse(jsonData);
            } catch (parseError) {
                console.error('Error parsing JSON:', parseError);
            }
        }
    });
}

// Read targets from the file initially
readTargetsFromFile();

// Function to send a message to a specific chat ID
function sendMessageToChat(chatId, message) {
    bot.sendMessage(chatId, message);
}

// Function to fetch and process data from the API
function fetchDataFromApi() {
    const apiUrl = 'https://service.erepublik.tools/api/v2/battle';

    axios.get(apiUrl)
        .then((response) => {
            // Process the API response data here
            const data = response.data;

            // Read the targets from the "target.json" file
            const targetsJson = fs.readFileSync('target.json', 'utf8');
            const targets = JSON.parse(targetsJson);

            // Iterate through each target in "target.json"
            for (const targetId in targets) {
                if (targets.hasOwnProperty(targetId)) {
                    // Filter battles matching the targetId
                    const matchingBattles = data.battleZones.filter((zone) => {
                        return (
                            (zone.inv_bh_id && zone.inv_bh_id.toString() === targetId) ||
                            (zone.def_bh_id && zone.def_bh_id.toString() === targetId)
                        );
                    });

                    // If matching battles are found, send a message to each chat ID in the target
                    if (matchingBattles.length > 0) {
                        const chatIds = targets[targetId];
                        matchingBattles.forEach((battle, battleIndex) => {
                            // Check if the battle ID is already in the processed array
                            if (!processedBattleIds.includes(battle.id)) {
                                const battleId = battle.battle_id;
                                const zoneId = battle.id;
                                const inv = battle.inv_bh_id;
                                const def = battle.def_bh_id;
                                const inv_damage = battle.inv_bh_damage;
                                const def_damage = battle.def_bh_damage;
                                const inv_dom = battle.inv_domination;
                                const def_dom = battle.def_domination;
                                const inv_bar = battle.inv_bar;
                                const def_bar = battle.def_bar;
                                const division = battle.division;
                                const round = battle.zone_id;
                                const battleUrl = `https://www.erepublik.com/en/military/battlefield/${battleId}/${zoneId}`;
                                // Define the message format
const message = `
*FOUND TARGET on battle*
Target:  ${targetId}
Division: ${division || 'empty'}
Round:  ${round || 'empty'}
                                
Attacker
CitizenId:  ${inv || 'empty'}
Top Damage: ${inv_damage || 'empty'}
                                
Defender
CitizenId:  ${def || 'empty'}
Top Damage: ${def_damage || 'empty'}
                                
Bar & Domination (Atk : Def)
${inv_dom || 'empty'} : ${def_dom || 'empty'}
${inv_bar || 'empty'} : ${def_bar || 'empty'}
                                
Battle URL: ${battleUrl}
`;                                
                                // Send the message with a 1-second delay for each chatId
                                chatIds.forEach((chatId, chatIndex) => {
                                    setTimeout(() => {
                                        sendMessageToChat(chatId, message);
                                    }, (battleIndex * chatIds.length + chatIndex) * 5000);
                                });
                    
                                // Add the battle ID to the processed array
                                processedBattleIds.push(battle.id);
                            }
                        });
                    }
                    
                }
            }
        })
        .catch((error) => {
            console.error('Error fetching data from the API:', error);
        });
}

// Command to add a new chat ID (positive or negative) to a target
bot.onText(/\/addChat_(\w+):(-?\w+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const targetId = match[1];
    const chatIdToAdd = match[2];

    // Check if the target exists
    if (!targets[targetId]) {
        targets[targetId] = [];
    }

    // Add the chat ID to the target's array
    targets[targetId].push(chatIdToAdd);

    // Write updated targets to the "target.json" file
    fs.writeFile('target.json', JSON.stringify(targets), (err) => {
        if (err) {
            console.error('Error writing to JSON file:', err);
        } else {
            bot.sendMessage(chatId, `Added Chat ID: ${chatIdToAdd} to Target: ${targetId}`);
        }
    });
});

// Command to remove a chat ID from a target
bot.onText(/\/removeChat_(\w+):(-?\w+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const targetId = match[1];
    const chatIdToRemove = match[2];

    // Check if the target exists
    if (targets[targetId]) {
        // Find the index of the chat ID to remove
        const indexToRemove = targets[targetId].indexOf(chatIdToRemove);

        if (indexToRemove !== -1) {
            // Remove the chat ID from the target's array
            targets[targetId].splice(indexToRemove, 1);

            // Write updated targets to the "target.json" file
            fs.writeFile('target.json', JSON.stringify(targets), (err) => {
                if (err) {
                    console.error('Error writing to JSON file:', err);
                } else {
                    bot.sendMessage(chatId, `Removed Chat ID: ${chatIdToRemove} from Target: ${targetId}`);
                }
            });
        } else {
            bot.sendMessage(chatId, `Chat ID: ${chatIdToRemove} not found in Target: ${targetId}`);
        }
    } else {
        bot.sendMessage(chatId, `Target: ${targetId} not found`);
    }
});

// Command to show all chat IDs for a target
bot.onText(/\/showChatId_(\w+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const targetId = match[1];

    // Check if the target exists
    if (targets[targetId]) {
        const chatIds = targets[targetId].join(', ');

        // Send a message with all chat IDs for the target
        bot.sendMessage(chatId, `Chat IDs for Target ${targetId}: ${chatIds}`);
    } else {
        bot.sendMessage(chatId, `Target: ${targetId} not found`);
    }
});

// Command to remove a target and its associated chat IDs
bot.onText(/\/removeTarget_(\w+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const targetIdToRemove = match[1];

    // Check if the target exists
    if (targets[targetIdToRemove]) {
        // Delete the target from the targets object
        delete targets[targetIdToRemove];

        // Write updated targets to the "target.json" file
        fs.writeFile('target.json', JSON.stringify(targets), (err) => {
            if (err) {
                console.error('Error writing to JSON file:', err);
            } else {
                bot.sendMessage(chatId, `Removed Target: ${targetIdToRemove} and all associated Chat IDs`);
            }
        });
    } else {
        bot.sendMessage(chatId, `Target: ${targetIdToRemove} not found`);
    }
});

// Command to list all targets stored in the "target.json" file
bot.onText(/\/listTarget/, (msg) => {
    const chatId = msg.chat.id;

    // Read the targets from the "target.json" file
    let targetList = '';

    try {
        const targetsData = fs.readFileSync('target.json', 'utf-8');
        const targets = JSON.parse(targetsData);

        // Create a list of targets
        for (const targetId in targets) {
            if (targets.hasOwnProperty(targetId)) {
                targetList += `Target ID: ${targetId}\n`;
            }
        }

        // Send the list of targets as a message
        if (targetList) {
            bot.sendMessage(chatId, 'List of Targets:\n' + targetList);
        } else {
            bot.sendMessage(chatId, 'No targets found.');
        }
    } catch (err) {
        console.error('Error reading targets:', err);
        bot.sendMessage(chatId, 'An error occurred while reading targets.');
    }
});





// Fetch data from the API every minute
setInterval(fetchDataFromApi, 20000); // Adjust the interval as needed (in milliseconds)

// Function to send "BOT IS OKAY" message to chat ID 776257704 every hour
function sendBotStatusMessage() {
    const chatId = 776257704;
    const message = "BOT IS OKAY";

    sendMessageToChat(chatId, message);
}

// Schedule the function to run every hour (3600000 milliseconds)
setInterval(sendBotStatusMessage, 3600000);
