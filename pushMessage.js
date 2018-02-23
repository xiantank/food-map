const line = require('@line/bot-sdk');

const Tokens = require("./privateToken");

const client = new line.Client({
		channelAccessToken: Tokens.lineTokens.channelAccessToken
});

/*const message = {
		type: 'text',
		text: 'Hello World!'
};
*/
module.exports = function (userId, message){
		// TODO use promise
		if(userId === undefined){
				console.error("no user id")
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
}
