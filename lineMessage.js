const line = require('@line/bot-sdk');
const request = require('request-promise');

const mongooseModel = require("./model.js");

const linePush = require("./pushMessage.js");

const Tokens = require("./privateToken");
const lineClient = new line.Client({
		channelAccessToken: Tokens.lineTokens.channelAccessToken
});

const GoogleMap = require("./googleMap").GoogleMap;
let googleMapApi = new GoogleMap({
		apiKey: Tokens.googleMapApiKey
})

const UserFavoritePlace = require('./proxy').UserFavoritePlace;
const userState = require('./proxy').UserState;


function getImage(messageId){
		return new Promise(function(resolve, reject){
				var data = "";
				var bufs = []

				lineClient.getMessageContent(messageId).then(function(stream){
						stream.on('data', (chunk) => {
								bufs.push(chunk);
								console.log(chunk.length);
						});
						stream.on('error', (err) => {
								// error handling
								console.error("[error@getImage]",err);
						});
						stream.on('end', (...args) => {
								console.log("[end]", ...args);
								request({
										method: "POST",
										url: 'https://api.imgur.com/3/image',
										headers: {
												Authorization: "Client-ID "+ Tokens.imgurClientId,
												'User-Agent': 'request'
										},
										formData: {
												image: Buffer.concat(bufs).toString('base64'),
												type: "base64",
												name: "test"+(+(new Date())),
												title: "test"+(+(new Date()))
										}
								}).then(function (body) {
										console.log('Upload successful!  Server responded with:');
										console.log(JSON.stringify(JSON.parse(body),4,4));
										return resolve(JSON.parse(body));
								}).catch(function(err){
										console.error('upload failed:', err);
										return reject(err);
								});

								//resolve(data);
						});
				});
		});
}

function lineReply(replyToken, msg){
		if(replyToken === "ffffffffffffffffffffffffffffffff"){
				console.log("[just test]");
				return;
		}
		var message;
		if(!msg){
				message = {
						type: 'text',
						text: "default reply"
				};
		} else if(typeof msg === "string"){
				message = {
						type: 'text',
						text: msg
				};
		} else {
				message = msg;
		}
		return lineClient.replyMessage(replyToken, message)
		.then((...args) => {
				console.log(...args);
		});
}

function userRename(userId, replyToken, value){
		console.log("rename");
}

function commandHandler(userId, replyToken, text){
		let [ _, command, value] = text.match(/^\/([^ ]+) ?(.*)?/);
		switch(command){
				case 'name':
						userRename(userId, replyToken, value);
				break;
				case 'nearBy':
						userState.updateState(userId, "waitNearBy").then(function(){
						lineReply(replyToken, "please share location and input restaurant keyword to search!");
				});
						break;
				default:
						console.log("unknown command:",command, value);

		}
}

function textHandler(event){
		let text = event.message.text;
		let userId = event.source.userId;
		let replyToken = event.replyToken;
		if(text[0] === "/" && text.length > 1){
				commandHandler(userId, replyToken, text);
		}else{
				userState.getState(userId).then(function(userInfo){
						switch(userInfo.state){
								case '':
										break;
								case 'waitNearBy':
										googleMapApi.fetchSearchRestaurant(userInfo.location, text).then(function(places){
										replyRestaurant(replyToken, places);
								}).catch(error=>{
										console.error(error);
										console.log("waitNearBy")
								});

										break;
								case 'editComment':
										if(userInfo.place_id){
										UserFavoritePlace.updateComment(userId, userInfo.place_id, text).then(function(){
												userState.updateState(userId, "");
										});
								}

										break;

						}
				})
				console.log("text handler:\n", text);
		}
}
async function replyRestaurant(replyToken, places){
		let columns = await Promise.all(
				places.map(async function(place){
						let favoriteAction = {
								type: "postback",
								label: "favorite this",
								data: JSON.stringify({
										action: "favoriteRestaurant",
										place_id: place.place_id,
								}).slice(0,200)
						};
						let chooseAction = {
								type: "postback",
								label: "choose and edit",
								data: JSON.stringify({
										action: "chooseRestaurant",
										place_id: place.place_id,
								}).slice(0,300)
						};
						let result = {
								title: place.name,
								thumbnailImageUrl: place.photo || place.defaultPictureUrl,
								text: place.vicinity || place.formatted_address || "no address",
								actions: [favoriteAction, chooseAction]
						};
						result.title = result.title.slice(0,39);
						result.text = result.text.slice(0,59);

						mongooseModel.Place.findOneAndUpdate({place_id: place.place_id}, place, {upsert: true, runValidators: true, setDefaultsOnInsert: true}).catch(err=>{
								console.error(err);
						});
						return result;
				})
		);
		let message = {
				type: "template",
				altText: "this is a carousel template",
				template: {
						type: "carousel",
						columns: columns,
				}
		};
		return lineReply(replyToken, message).then(function(){
		}).catch(err=>{
				console.log(err.message)
				console.log(JSON.stringify(columns))
		});
}
function messageHandler(event){
		let userId = event.source.userId;
		let replyToken = event.replyToken;
		switch(event.message.type){
				case 'image':
						userState.getState(userId).then(function(userInfo){
						if(userInfo.place_id && userInfo.state==="editComment"){
								getImage(event.message.id).then(function(image){
										console.log(image.length);
										//console.log("[head]",image.slice(0,50));
										UserFavoritePlace.addPicture(userId, userInfo.place_id, image.data.link).then(function(doc){
												userState.updateState(userId, "");
												console.log(JSON.stringify(doc));
										}).catch(function(error){
												console.log(error);
												lineReply(event.replyToken, ""+image.status);
										});
								});
						}
				});
				break;
				case 'text':
						textHandler(event);
				break;
				case 'location':
						let location = {
						lat: event.message.latitude,
						lng: event.message.longitude
				};

				userState.updateLocation(userId, location);
			   lineReply(event.replyToken, "please enter text to search near resaurant!")
				break;
				default:
						console.log("event.message.type don't know")
				break;
		}
}

function followHandle(event){
		console.log(event.type);
		console.log(event.replyToken);
		console.log(event.timestamp);
		console.log(event.source.userId);
		console.log(event.source.type);
}

function postbackHandle(event){
		console.log(JSON.stringify(event,4,4));
		let userId = event.source.userId;
		let data;
		try{
				data = JSON.parse(event.postback.data);
		}catch(err){
				console.error(err);
				data = {};
		}
		lineReply(event.replyToken, ""+data.action);
		switch(data.action){
				case 'favoriteRestaurant':
						console.log(userId, "favoriteRestaurant", data.place_id);
						let favorite = new mongooseModel.UserFavoritePlace({uid: userId, place_id: data.place_id});
						favorite.save().then(function(favorite){
						}).catch(function(err){
								if(err.code === 11000){ //expect error for exist: {uid, place_id};
										return;
								}
								throw err;
						}).catch(err=>{
								console.error(err);
						});
				break;
				case 'chooseRestaurant':
						console.log(userId, "chooseRestaurant", data.place_id);
						userState.updatePlace(userId, data.place_id).then(function(userInfo){
								// TODO reply [edit name or upload photo or comment] choose menu to line;
								console.log(JSON.stringify(userInfo,4,4))
								return userState.updateState(userId, "editComment")
						}).catch(error=>{
								console.log(error);
								console.log("chooseRestaurant fail");

						});
						break;
				default:
						console.log(JSON.stringify(data,4,4))
		}
}

function eventsHandler(events){
		events.events.forEach(function(event){
				switch(event.type){
						case 'message':
								messageHandler(event);
						break;
						case 'follow':
								followHandle(event);
						break;
						case 'postback':
								postbackHandle(event);
						break;
						default:
								console.log("unknown event type:", event.type);
						console.log(JSON.stringify(event,4,4));
				}
		});
}



module.exports = {
		handle: eventsHandler,
		linePush
};
