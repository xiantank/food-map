const mongooseModel = require("../model.js");

function getState(userId){
		return mongooseModel.UserState.findOne({uid:userId}).exec().then(function(doc){
				if(!doc){
						doc = new mongooseModel.UserState({uid: userId});
				}
				return doc;
		});
}

function updateState(userId, state){
		return mongooseModel.UserState.findOne({uid:userId}).exec().then(function(doc){
				if(!doc){
						doc = new mongooseModel.UserState({uid: userId, state: state})
				} else{
						console.log(`${userId} state: ${state} ==> ${doc.state}`)
						doc.state = state;
				}
				return doc.save();
		})
}

function updatePlace(userId, place_id){
		return mongooseModel.UserState.findOne({uid:userId}).exec().then(function(doc){
				if(!doc){
						doc = new mongooseModel.UserState({uid: userId, place_id: place_id})
				} else{
						console.log(`${userId} [doc.state: ==> ${doc.state}] [place_id: ${place_id}]`)
						doc.place_id = place_id;
				}
				return doc.save();
		})
}

function updateLocation(userId, location){
		let lat = location.lat || location.latitude;
		let lng = location.lng || location.longitude;
		return mongooseModel.UserState.findOne({uid:userId}).exec().then(function(doc){
				if(!doc){
						doc = new mongooseModel.UserState({uid: userId, location: { lat, lng } })
				} else{
						console.log(`${userId} [doc.state: ==> ${doc.state}] [location: ${lat}, ${lng}]`)
						doc.location = {lat, lng};
				}
				return doc.save();
		});
}

module.exports = {
		getState,
		updateState,
		updatePlace,
		updateLocation
}
