"use strict";
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const http = require('http');
// const https = require('https');
// let privateKey = fs.readFileSync('./cert/key.pem', 'utf8');
// let certificate = fs.readFileSync('./cert/cert.pem', 'utf8');
// let fullchain = fs.readFileSync('./cert/fullchain.pem', 'utf8');
// let chain = fs.readFileSync('./cert/chain.pem', 'utf8');
// let credentials = {
// 		key: privateKey,
// 		cert: certificate,
// 		ca: [
// 				fullchain,
// 				chain
// 		]
// };
let foodMapRouter = require("./food-map");

let app = express();
app.use(cors());
app.use(express.static('/var/www/html'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

app.use("/food-map", foodMapRouter);


var httpServer = http.createServer(app);
// var httpsServer = https.createServer(credentials, app);
httpServer.listen(8080);
// httpsServer.listen(1443);
