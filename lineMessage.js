const line = require("@line/bot-sdk");
const request = require("request-promise");

const mongooseModel = require("./model.js");

const linePush = require("./pushMessage.js");

const config = require("./config");
const lineClient = new line.Client({
	channelAccessToken: config.lineTokens.channelAccessToken
});

const GoogleMap = require("./googleMap").GoogleMap;
let googleMapApi = new GoogleMap({
	apiKey: config.googleMapApiKey
});

const UserFavoritePlace = require("./proxy").UserFavoritePlace;
const userState = require("./proxy").UserState;


function getImage(messageId){
	return new Promise(function(resolve, reject){
		var bufs = [];

		lineClient.getMessageContent(messageId).then(function(stream){
			stream.on("data", (chunk) => {
				bufs.push(chunk);
			});
			stream.on("error", (err) => {
				// error handling
				console.error("[error@getImage]",err);
			});
			stream.on("end", () => {
				request({
					method: "POST",
					url: "https://api.imgur.com/3/image",
					headers: {
						Authorization: "Client-ID "+ config.imgurClientId,
						"User-Agent": "request"
					},
					formData: {
						image: Buffer.concat(bufs).toString("base64"),
						type: "base64",
						name: "test"+(+(new Date())),
						title: "test"+(+(new Date()))
					}
				}).then(function (body) {
					return resolve(JSON.parse(body));
				}).catch(function(err){
					console.error("upload failed:", err);
					return reject(err);
				});
			});
		});
	});
}

function lineReply(replyToken, msg){
	if(replyToken === "ffffffffffffffffffffffffffffffff"){
		console.log("[test]");
		return;
	}
	var message;
	if(!msg){
		message = {
			type: "text",
			text: "default reply"
		};
	} else if(typeof msg === "string"){
		message = {
			type: "text",
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
	// TODO:
}

function commandHandler(userId, replyToken, text){
	let [ , command, value] = text.match(/^\/([^ ]+) ?(.*)?/);
	switch(command){
	case "name":
		userRename(userId, replyToken, value);
		break;
	case "搜尋餐廳":
		userState.updateState(userId, "waitNearBy").then(function(){
			lineReply(replyToken, "請分享地點座標或輸入關鍵字查詢");
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
			case "":
				break;
			case "waitNearBy":
				googleMapApi.fetchSearchRestaurant(userInfo.location, text).then(function(places){
					replyRestaurant(replyToken, places);
				}).catch(error=>{
					console.error(error);
					console.log("waitNearBy");
				});

				break;
			case "editComment":
				if(userInfo.place_id){
					UserFavoritePlace.updateComment(userId, userInfo.place_id, text).then(function(){
						userState.updateState(userId, "");
						lineReply(replyToken, "筆記紀錄完成");
					});
				}

				break;

			}
		});
		console.log("text handler:\n", text);
	}
}
async function replyRestaurant(replyToken, places){
	let columns = await Promise.all(
		places.map(async function(place){
			let favoriteAction = {
				type: "postback",
				label: "收藏",
				data: JSON.stringify({
					action: "favoriteRestaurant",
					place_id: place.place_id,
				}).slice(0,200)
			};
			let chooseAction = {
				type: "postback",
				label: "隨手筆記",
				data: JSON.stringify({
					action: "chooseRestaurant",
					reply: "你已經可以開始撰寫該地點的筆記",
					place_id: place.place_id,
				}).slice(0,300)
			};
			let chooseActionPicture = {
				type: "postback",
				label: "上傳照片",
				data: JSON.stringify({
					action: "chooseRestaurant",
					reply: "你已經可以開始上傳該地點的照片",
					place_id: place.place_id,
				}).slice(0,300)
			};
			let result = {
				title: place.name,
				thumbnailImageUrl: place.photo || place.defaultPictureUrl,
				text: place.vicinity || place.formatted_address || "no address",
				actions: [favoriteAction, chooseAction, chooseActionPicture]
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
		console.log(err.message);
		console.log(JSON.stringify(columns));
	});
}
function messageHandler(event){
	let userId = event.source.userId;
	let replyToken = event.replyToken;
	switch(event.message.type){
	case "image":
		userState.getState(userId).then(function(userInfo){
			if(userInfo.place_id && userInfo.state==="editComment"){
				getImage(event.message.id).then(function(image){
					console.log(image.length);
					UserFavoritePlace.addPicture(userId, userInfo.place_id, image.data.link).then(function(doc){
						userState.updateState(userId, "");
						console.log(JSON.stringify(doc));
						lineReply(event.replyToken, "照片上傳成功");
					}).catch(function(error){
						console.log(error);
						lineReply(event.replyToken, "fail: "+image.status);
					});
				});
			}
		});
		break;
	case "text":
		textHandler(event);
		break;
	case "location":
	{
		let location = {
			lat: event.message.latitude,
			lng: event.message.longitude
		};
		googleMapApi.fetchNearRestaurant(location).then(function(places){
			replyRestaurant(replyToken, places).then(function(){
				lineReply(event.replyToken, "你可以輸入關鍵字進行精確搜尋");
			});
		}).catch(error=>{
			console.error(error);
			console.log("waitNearBy");
		});

		userState.updateLocation(userId, location);
		break;
	}
	default:
		console.log("event.message.type don't know");
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
	switch(data.action){
	case "favoriteRestaurant":
		console.log(userId, "favoriteRestaurant", data.place_id);
		let favorite = new mongooseModel.UserFavoritePlace({uid: userId, place_id: data.place_id});
		favorite.save().then(function(favorite){

			lineReply(event.replyToken, "你已收藏成功");
		}).catch(function(err){
			if(err.code === 11000){ //expect error for exist: {uid, place_id};
				lineReply(event.replyToken, "你已收藏過啦");
				return;
			}
			throw err;
		}).catch(err=>{
			console.error(err);
		});
		break;
	case "chooseRestaurant":
		console.log(userId, "chooseRestaurant", data.place_id, JSON.stringify(data,4,4));
		lineReply(event.replyToken, data.reply || "你已經可以開始撰寫該地點的筆記或上傳照片");
		userState.updatePlace(userId, data.place_id).then(function(userInfo){
			return userState.updateState(userId, "editComment");
		}).catch(error=>{
			console.log(error);
			console.log("chooseRestaurant fail");

		});
		break;
	default:
		console.log(JSON.stringify(data,4,4));
	}
}

function eventsHandler(events){
	events.events.forEach(function(event){
		switch(event.type){
		case "message":
			messageHandler(event);
			break;
		case "follow":
			followHandle(event);
			break;
		case "postback":
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
