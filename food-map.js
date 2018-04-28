const URL = require("url");
const util = require('util');

const morgan = require("morgan");
const express = require("express");
const expressJWT = require("express-jwt");
const rp = require('request-promise');
const jsonwebtoken = require('jsonwebtoken');

require("./dbConnect.js");
const mongooseModel = require("./model.js");
const UserFavoritePlace = require('./proxy').UserFavoritePlace;
const Tokens = require("./privateToken");

const lineToken = Tokens.lineTokens;
const loginCallbackUrl = "https%3A%2F%2Ftan.csie.io%2Ffood-map%2Fline-login-callback%2F";
let router = express.Router();
let authRouter = express.Router();
let lineMessage = require("./lineMessage.js");

router.use(morgan('dev'));
router.use(express.static('./public'));
router.use("/auth", authRouter);
const jwtVerify = util.promisify(jsonwebtoken.verify);

authRouter.use(expressJWT({
		    secret: lineToken.clientSecret
}).unless({
		useOriginalUrl: false,
		path: ['/login', '/getToken', "/line-login-callback/", '/test/', '/test']
}));
router.use(function (err, req, res, next) {
		console.log(err)
		if (err.name === 'UnauthorizedError') {   
				if(err.message == "jwt expired"){
						res.redirect(401, "/login");
				} else{
						res.status(401).send('invalid token...');
						console.log(err)
				}
		}else{
				next(err);
		}
});

router.get("/test/", function(req, res){
		var str;
		mongooseModel.UserFavoritePlace.find({uid:"U954995ddefc6da0de55617e4884a5a07"}).populate('favoritePlace').exec(function(err, places){
				if(err){
						console.error(err);
						console.error("err");
						res.send(err);
						return;
				}
				console.log(JSON.stringify(places))
				console.log(str = JSON.stringify(places.map(place=>place.favoritePlace)));
				res.send(places.map(place=>place.favoritePlace));
		})
})

router.get('/login', function(req, res){
		res.redirect(`https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${lineToken.clientId}&redirect_uri=${loginCallbackUrl}&state=12345abcde&scope=openid%20profile&bot_prompt=aggressive`);
})

router.get("/line-login-callback/",function(req, res, next){
		let error = req.query.error;
		let error_description = req.query.error_description;
		let state = req.query.state;
		let code = req.query.code;
		let friendship_status_changed = req.query.friendship_status_changed;

		if(error){
				console.error(error, error_description);
				res.end();
				return;
		}

		let options = {
				method: 'POST',
				uri: 'https://api.line.me/oauth2/v2.1/token',
				form: {
						grant_type: "authorization_code",
						code: code,
						redirect_uri: "https://tan.csie.io/food-map/line-login-callback/",
						client_id: lineToken.clientId,
						client_secret: lineToken.clientSecret

				},
		};
		rp(options).then(function(body){
				let result = JSON.parse(body);
				console.log(body);
				return jwtVerify(result.id_token, lineToken.clientSecret).then(function(decoded) {
						console.log(JSON.stringify(decoded,4,4));
						console.log(body);
						const redirectTargetUrl = "https://tan.csie.io/food-map/map.html";
						let setJWTAndRedirectHtml = `<!doctype html><html><body><script>localStorage.setItem('jwt', "${result.id_token}");window.location.replace("${redirectTargetUrl}")</script></body>></html>`;
						res.send(setJWTAndRedirectHtml);
				});
		}).catch(err=>{
				console.error(err);
				res.send(err);
		})
});


authRouter.get("/favoritePlace/:userId/", function(req, res){
		console.log(req.params);
		mongooseModel.UserFavoritePlace.find({uid: req.params.userId}).populate('favoritePlace').exec(function(err, places){
				if(err){
						console.error(err);
						console.error("err");
						res.send(err);
						return;
				}
				res.send({
						userId: req.params.userId,
						userFavoritePlaces : places
				});
		});

});
authRouter.post("/favoritePlace/:userId/:placeId", function(req, res){
		console.log(JSON.stringify(req.body))

		UserFavoritePlace.favoritePlace(req.params.userId, req.body.place_id);

		return mongooseModel.Place.findOneAndUpdate({place_id: req.body.place_id}, req.body, {upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true}).then(function(doc){
				return res.send(doc);
		}).catch(err=>{
				console.error(err);
				return res.status(500).send({ error: err });
		});
		let newPlace = new mongooseModel.Place(req.body)
		console.log(newPlace.place_id);
		//res.end();

});


authRouter.post("/comment/:userId/:placeId", function(req, res){
		let userId = req.params.userId;
		let place_id = req.body.place_id;
		let comment = req.body.comment;
		UserFavoritePlace.updateComment(userId, place_id, comment).then(function(doc){
				res.end();
		}).catch(e=>res.status(500).send(e.toString()));
});


router.post('/webhook', function(req, res){
		console.log("food-map/webhook");
		console.log(JSON.stringify(req.body, 4, 4));
		var event = req.body;
		lineMessage.handle(event);

		res.end();
});


module.exports = router;
