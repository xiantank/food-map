const mongooseModel = require('../model');

const UserFavoritePlace = mongooseModel.UserFavoritePlace;

exports.updateComment = function(userId, place_id, comment){
		return UserFavoritePlace.findOne({uid: userId, place_id: place_id}).exec().then(function(doc){
				if(!doc){
						doc = new UserFavoritePlace({uid: userId, place_id: place_id});
				}
				doc.comment = comment;
				return doc.save();
		});
};

exports.favoritePlace = function(userId, place_id){
		let favorite = new UserFavoritePlace({uid: userId, place_id: place_id});
		return favorite.save().then(function(favorite){
				console.log(JSON.stringify(favorite,4,4));
		}).catch(function(err){
				if(err.code === 11000){ //expect error for exist: {uid, place_id};
						return;
				}
				throw err;
		}).catch(err=>{
				console.error(err);
				console.error(err.code)
		});
};

exports.addPicture = function(userId, place_id, photoLink){
		if(!photoLink){
				return;
		}
		return UserFavoritePlace.findOne({uid: userId, place_id: place_id}).exec().then(function(doc){
				if(!doc){
						doc = new UserFavoritePlace({uid: userId, place_id: place_id, pictures:[photoLink]});
				}else{
						doc.pictures.push(photoLink);
				}
				return doc.save();
		});
};
