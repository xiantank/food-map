const line = require("@line/bot-sdk");

const config = require("./config");

const client = new line.Client({
	channelAccessToken: config.lineTokens.channelAccessToken
});

module.exports = function (userId, message){
	// TODO use promise
	if(userId === undefined){
		console.error("no user id");
		return;

	}
	if(!Array.isArray(userId)){
		userId = [userId];
	}
	for(let id of userId){
		client.pushMessage(id, message).then((...args) => {
			console.log(...args);
		}).catch((err) => {
			// error handling
			console.error("[error]",err);
		});
	}
};
