const mongoose = require('mongoose');

let user = new mongoose.Schema({
		name: String,
		lineId: String
});

let userStateSchema = new mongoose.Schema({
		uid: {type: String, required: true, unique: true},
		place_id: {type: String, default: ""},
		location:{
				lat: {
						type:Number,
						default:23
				},
				lng: {
						type: Number,
						default: 121
				}
		},
		state: {
				type: String,
				enum: ["", "waitNearBy", "editComment"],
				default: ""
		}
});

let userFavoritePlaceSchema = new mongoose.Schema({
		uid: {type: String, required: true},
		place_id: {type:String, required: true},
		comment: {type:String, default: ""},
		pictures: {type: Array, default: []}
},  { toJSON: { virtuals: true } });
userFavoritePlaceSchema.index({uid:1, place_id:1}, {unique: true});
userFavoritePlaceSchema.virtual('favoritePlace',{
		ref: "Place",
		localField: "place_id",
		foreignField: "place_id",
		justOne: true
});

let userTemporaryPlaceSchema = new mongoose.Schema({
		uid: {type: String, required: true, unique: true},
		geometry: {
				location: {
						lat: {type: Number, default: 0},
						lng: {type: Number, default: 0}
				}
		},
		storeName: {type: String, default:""},
		describe: {type: String, default:""},
		photos: [{
				url:{type: String, required: true},
				date: {type: Date, default: Date.now}
		}]
});

let placeSchema = new mongoose.Schema({
		__v: { type: Number, select: false},
		_updateTime: {type: Date, default: Date.now},
		place_id: {type: String, required: true, index: true},
		reference: {type: String, default: ""},
		geometry: {
				location: {
						lat: {type: Number, default: 0},
						lng: {type: Number, default: 0}
				}
		},
		adr_address: {type: String, default: ''},
		formatted_address: {type: String, default: ''},
		formatted_phone_number: {type: String, default: ''},
		name: {type: String, default: ''},
		photos: [{
				height: {type: Number, default: 0},
				width: {type: Number, default: 0},
				html_attributions: {type: String, default: ''}
		}],
		rating: {type: Number, default: 0},
		reviews: [{
				author_name: {type: String, default: ''},
				author_url: {type: String, default: ''},
				language: {type: String, default: ''},
				profile_photo_url: {type: String, default: ''},
				rating: {type: Number, default: 0},
				relative_time_description: {type: String, default: ''},
				text: {type: String, default: ''},
				time: {type: Date, default: Date.now}
		}],
		scope: {type: String, default: ''},
		types: [{type: String, default: ''}],
		url: {type: String, default: ''},
		html_attributions: {type: String, default: ''}
});



let Place = mongoose.model("Place", placeSchema);
let UserFavoritePlace = mongoose.model("UserFavoritePlace", userFavoritePlaceSchema);
let UserTemporaryPlace = mongoose.model("UserTemporaryPlace", userTemporaryPlaceSchema);
let UserState = mongoose.model("UserState", userStateSchema);

module.exports = {
		Place,
		UserFavoritePlace,
		UserTemporaryPlace,
		UserState
}
