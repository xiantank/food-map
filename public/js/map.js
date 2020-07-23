"use strict";
let map;
let placeMap = new Map();
let userPlaceMap = new Map();
let user = {};
init();


function init(){
		loginCheck();
		fetchFavoritePlace().then(function(res){
				let userFavoritePlaces = res.userFavoritePlaces;
				userFavoritePlaces.forEach(function(userFavoritePlace){
						placeMap.set(userFavoritePlace.place_id, userFavoritePlace.favoritePlace);
				});
				markMarkers(userFavoritePlaces.map(place=>place.favoritePlace));
				buildFavoriteList(userFavoritePlaces);
		});
		listenUpdateCommentBtn();
}
function listenUpdateCommentBtn(){
		let updateCommentBtn = document.querySelector("#updateCommentBtn");
		updateCommentBtn.addEventListener("click", function(e){
				e.stopPropagation();
				e.preventDefault();
				let placeId = document.querySelector("#slideMenu").dataset.placeId;
				let comment = document.querySelector("#edit_comment").value;
				updateComment(placeId, comment);
		});
}
function rebuildFavoriteList(){
		fetchFavoritePlace().then(function(res){
				let mapsContainer = document.querySelector("#mapsContainer");
				mapsContainer.classList.add("hidden");
				let listContainer = document.querySelector("#listContainer");
				listContainer.classList.remove("hidden");
				buildFavoriteList(res.userFavoritePlaces);
		})
}

function rebuildMapMarker(){
		fetchFavoritePlace().then(function(res){
				let mapsContainer = document.querySelector("#mapsContainer");
				mapsContainer.classList.remove("hidden");
				let listContainer = document.querySelector("#listContainer");
				listContainer.classList.add("hidden");
				markMarkers(res.userFavoritePlaces.map(place=>place.favoritePlace));
		})
}
function toggleMapList(){
		let mapsContainer = document.querySelector("#mapsContainer");
		mapsContainer.classList.toggle("hidden");
		let listContainer = document.querySelector("#listContainer");
		listContainer.classList.toggle("hidden");
}

function buildFavoriteList(list){
		let listContainer = document.querySelector("#listContainer");
		listContainer.innerHTML = "";
		list.forEach(function(item){
				let itemContainer = document.createElement("div");
				itemContainer.classList.add("card");
				itemContainer.innerHTML = `<span class="title"><a href="${item.favoritePlace.url}">${item.favoritePlace.name}</a></span><span>${item.favoritePlace.formatted_address}</span><pre>${item.comment}</pre>`;
				if(item.pictures){
						let picStr = "";
						item.pictures.map(photoUrl=>{
								picStr += `<img src="${photoUrl}" style="width: 20vw;">`;
						});
						itemContainer.innerHTML += `<div style="overflow:scroll;">${picStr}</div>`
				}
				listContainer.appendChild(itemContainer);
		});

}

function markMarkers(places, markers=[]){
		var TAIWAN_BOUNDS = (places && places.length) ? undefined : {
			  north: 25.31,
			  south: 21.75,
			  west: 115.28,
			  east: 123.81
		};

		let bounds = new google.maps.LatLngBounds(TAIWAN_BOUNDS);
		places.forEach(function (place) {
				if (!place) return;
				if (!place.geometry) {
						console.log("Returned place contains no geometry");
						return;
				}
				if(!placeMap.has(place.place_id)){
						placeMap.set(place.place_id, place);
				}
				console.log(place.geometry);

				let marker = new google.maps.Marker({
						map: map,
						title: place.name,
						position: place.geometry.location
				});
				if(place.icon){
						let icon = {
								url: place.icon,
								size: new google.maps.Size(71, 71),
								origin: new google.maps.Point(0, 0),
								anchor: new google.maps.Point(17, 34),
								scaledSize: new google.maps.Size(25, 25)
						};
						marker.icon = icon;
				}
				let contentTitle = `<h2>${place.name} (${place.rating})</h2>`;
				let contentAddress = `<div>${place.formatted_address}</div>`;
				let contentEditBtn = `<input type="button" value="edit" onclick="openSlideMenu('${place.place_id}')" />`;
				let contentFavoriteBtn = `<input type="button" value="favorite" onclick="favoritePlace('${place.place_id}')" />`;
				let contentString = `${contentTitle}${contentAddress}${contentEditBtn}${contentFavoriteBtn}`;
				let infowindow = new google.maps.InfoWindow({
						content: contentString
				});
				marker.addListener('click', function (event) {
						console.log(event);

						// move to center
						//map.setZoom(17);
						map.setCenter(marker.getPosition());

						// open infowindow
						infowindow.open(map, marker);

				});
				marker.addListener('rightclick', function (...arg) {
						console.log(place, ...arg);
				});
				markers.push(marker);

				if (place.geometry.viewport) {
						// Only geocodes have viewport.
						bounds.union(place.geometry.viewport);
				} else {
						bounds.extend(place.geometry.location);
				}
		});
		map.fitBounds(bounds);
		return markers;

}

function removeMarkersFromMap(markers=[]){
		markers.forEach(function (marker) {
				marker.setMap(null);
		});
}

function initMap() {
		map = new google.maps.Map(document.getElementById('map'), {
				center: {lat: 23.9036873, lng: 121.07937049999998},
				zoom: 8
		});
		initAutocomplete();
}

function initAutocomplete() {
		let input = document.getElementById('pac-input');
		let searchBox = new google.maps.places.SearchBox(input);
		map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);
		map.addListener('bounds_changed', function () {
				searchBox.setBounds(map.getBounds());
		});
		let markers = [];
		searchBox.addListener('places_changed', function () {
				let places = searchBox.getPlaces();

				if (places.length === 0) {
						return;
				}

				removeMarkersFromMap(markers);

				markers = [];
				markMarkers(places, markers);

		});
}

function setLeftQuarter(map, targetPosition) {
		let center = targetPosition;
		let offsetX = 0.25;
		let offsetY = 0.5;

		let span = map.getBounds().toSpan();
		let newCenter = {
				lat: center.lat() + span.lat() * offsetY,
				lng: center.lng() + span.lng() * offsetX
		};

		map.setCenter(newCenter);
}

function openSlideMenu(placeId="") {
		let userFavoritePlace = userPlaceMap.get(placeId);
		let slideMenu = document.querySelector("#slideMenu");
		slideMenu.classList.remove("hidden");
		slideMenu.dataset.placeId=placeId;
		let title = document.querySelector("#edit_title");
		title.innerText = userFavoritePlace.favoritePlace.name;
		let comment = document.querySelector("#edit_comment");
		comment.value = userFavoritePlace.comment;

		let photos = document.querySelector("#edit_photo");

		if(userFavoritePlace.pictures){
				let picStr = "";
				userFavoritePlace.pictures.map(photoUrl=>{
						picStr += `<img src="${photoUrl}" style="width: 20vw;">`;
				});
				photos.innerHTML = `<div style="overflow:scroll;">${picStr}</div>`
		}
}

function closeSlideMenu() {
		let slideMenu = document.querySelector("#slideMenu");
		slideMenu.classList.add("hidden");
}

function updateComment(placeId, comment=""){
		authAjax({
				method: "POST",
				url: `./auth/comment/${user.userId}/${placeId}`,
				headers: {"Content-Type": "application/json"},
				data:JSON.stringify({
						place_id: placeId,
						comment: comment
				})
		})
}

function favoritePlace(placeId){
		let place = placeMap.get(placeId);
		console.log(place);
		authAjax({
				method: "POST",
				url: `./auth/favoritePlace/${user.userId}/${placeId}`,
				headers: {"Content-Type": "application/json"},
				data:JSON.stringify(place)
		})
}

function fetchFavoritePlace(){
		return authAjax({
				method: "GET",
				url: `./auth/favoritePlace/${user.userId}`,
		}).then(function(res){
				let userFavoritePlaces = res.userFavoritePlaces;
				userFavoritePlaces.forEach(function(userFavoritePlace){
						userPlaceMap.set(userFavoritePlace.place_id, userFavoritePlace);
						placeMap.set(userFavoritePlace.place_id, userFavoritePlace.favoritePlace);
				});
				return res;
		});
}

function relogin(){
		document.location.href="https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=1557334654&redirect_uri=https%3A%2F%2Ftan-foodmap.csie.io%2Fline-login-callback%2F&state=12345abcde&scope=openid%20profile&bot_prompt=aggressive";
}

function loginCheck(){
		let loginJWT = localStorage.getItem('jwt');
		if(loginJWT){
				let payload = loginJWT.split(".")[1];
				payload = JSON.parse(atob(payload));
				let [name, picture, expired] = [payload.name, payload.picture, payload.exp]
				user = {
						name: payload.name,
						picture: payload.picture,
						exp: payload.exp,
						userId: payload.sub
				}
				if(expired*1000<Date.now()){
						console.log("out of date");
						logout();
						relogin();

						return;

				}

				let loginInfoBox = document.querySelector("#loginInfoBox")
				while (loginInfoBox.lastChild) { // remove all child
						loginInfoBox.removeChild(loginInfoBox.lastChild);
				}
				let userInfoBox = document.createElement("div");
				userInfoBox.classList.add( "btn", "btn-radius");
				if(picture){
						let pictureBox = document.createElement("img");`<img class="thumb" src="${picture}">`
						pictureBox.src = picture;
						pictureBox.classList.add("thumb");
						userInfoBox.appendChild(pictureBox);
				} else{
						userInfoBox.innerText = name;
						userInfoBox.classList.add("btn-color")
				}
				let logoutBox = document.createElement("div");
				logoutBox.classList.add("float-right");
				logoutBox.innerText = "logout";
				logoutBox.addEventListener("click",function(e){
						e.stopPropagation();
						logout();
				});


				loginInfoBox.appendChild(logoutBox);
				loginInfoBox.appendChild(userInfoBox);
		} else{
				// redirect to login
		}

}

function logout(){
		let parent = document.querySelector("#loginInfoBox");
		parent.innerHTML = `<div id="loginBtn" class="btn btn-radius btn-color"><a class="reset-anchor" href="https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=1557334654&redirect_uri=https%3A%2F%2Ftan-foodmap.csie.io%2Fline-login-callback%2F&state=12345abcde&scope=openid%20profile&bot_prompt=aggressive">Login in</a></div>`
		localStorage.removeItem("jwt");
}

function authAjax(options){
		let token = localStorage.getItem("jwt");
		if(!token){
				throw "no jwt token";
		}
		options.headers = options.headers || {};
		Object.assign(options.headers, { "Authorization": 'Bearer ' + token });
		return $.ajax(options).catch(function(error){
				if(error.status === 401){
						return relogin();
				}
				console.error(error)
		});
}

function hiddenParent(){
		this.parentNode.classList.toggle("hidden");
}
