const mongoose = require("mongoose");;
mongoose.connect(
	'mongodb+srv://user:user@cluster0-jha0z.mongodb.net/test?retryWrites=true&w=majority',
	{ autoIndex: false }
);
// mongoose.connect('mongodb://localhost/test');

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));

db.on('connected', (...args)=>console.log("mongoose connected", ...args));
db.on('disconnected', (...args)=>console.log("mongoose disconnected"));


