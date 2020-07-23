const rp = require("request-promise");
const chardet = require("chardet");

class GoogleMap {
	constructor(options={}){
		if(options.apiKey){
			this.apiKey = options.apiKey;
		}
		if(options.clientId){
			this.clientId = options.clientId;
		}
		this.radius = options.radius || 500;
	}
	fetchNearRestaurant(location){
		return rp(`https://maps.googleapis.com/maps/api/place/nearbysearch/json?key=${this.apiKey}&location=${location.lat},${location.lng}&radius=${this.radius}&type=restaurant`).then(function(result){
			result = JSON.parse(result);
			return result.results;
		}).then(async (places)=>{
			places.forEach(place=>{
				place.defaultPictureUrl = "https://i.imgur.com/2wlfWdX.png";
			});
			places = places.slice(0,8);
			for(let i in places){
				let photo = places[i].photos && places[i].photos[0].photo_reference || "";
				places[i].photo = await this.fetchGoogleMapPicture(photo);
				await this.wait(300);
			}
			return places;
		});
	}

	fetchSearchRestaurant(location, name){
		console.log(name);
		console.log(chardet.detect(new Buffer(name)));
		name = JSON.parse( JSON.stringify( name) );
		console.log(chardet.detect(new Buffer(name)));
		let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?key=${this.apiKey}&location=${location.lat},${location.lng}&radius=${this.radius}&query="${encodeURIComponent(name)}"&type=restaurant`;
		return rp(url).then(function(result){
			result = JSON.parse(result);
			return result.results;
		}).then(async (places)=>{
			places.forEach(place=>{
				place.defaultPictureUrl = "https://i.imgur.com/2wlfWdX.png";
			});
			places = places.slice(0,8);
			for(let i in places){
				let photo = places[i].photos && places[i].photos[0].photo_reference || "";
				places[i].photo = await this.fetchGoogleMapPicture(photo);
				await this.wait(300);
			}
			return places;
		}).catch(function(error){
			console.error(error);
			console.log(url);
			console.log(chardet.detect(new Buffer(name)));

		});

	}
	fetchGoogleMapPicture(reference){
		let url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${reference}&key=${this.apiKey}`;
		console.log(url);
		return rp({
			resolveWithFullResponse: true,
			uri: url,
			followRedirect: false,
			method: "GET"

		}).catch(function(error ){
			if(error.statusCode === 302){
				return error.response.headers.location;
			} else{
				//throw error;
				console.log(error);
				console.log(error.statusCode);
				return "";
			}
		});
	}

	wait(time=300){
		return new Promise(function(resolve){
			setTimeout(()=>resolve(), time);
		});
	}

}

module.exports = {
	GoogleMap
};
