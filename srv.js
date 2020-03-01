"use strict";
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const http = require('http');
let foodMapRouter = require("./food-map");

let app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

app.use("/food-map", foodMapRouter);


var httpServer = http.createServer(app);
httpServer.listen(8080);
