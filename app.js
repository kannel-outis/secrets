//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const ejs = require("ejs");
const encrypt = require("mongoose-encryption");
const app = express();

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view-engine", "ejs");

mongoose.Promise = global.Promise;

// Connect MongoDB at default port 27017.
mongoose.connect('mongodb://localhost:27017/userDB', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}, (err) => {
    if (!err) {
        console.log('MongoDB Connection Succeeded.');
    } else {
        console.log('Error in DB connection: ' + err);
    }
});

const userSchema = new mongoose.Schema({
    email: String,
    password: String
});
const secret = process.env.SECRET;
userSchema.plugin(encrypt, { secret: secret, encryptedFields: ['password'] });
const User = mongoose.model("User", userSchema);



app.get("/", function (req, res) {
    res.render("home.ejs");
});


app.route("/login").get(function (req, res) {
    res.render("login.ejs");
}).post(function (req, res) {
    const username = req.body.username;
    const password = req.body.password;
    User.findOne({ email: username }, function (err, result) {
        if (err) {
            console.log(err + "nothing");
        } else {
            if (result) {
                if (result.password === password) {
                    res.render("secrets.ejs");
                } else {
                    console.log("incorrect password");
                }
            }
        }
    });
});


app.route("/register").get(function (req, res) {
    res.render("register.ejs");
}).post(function (req, res) {
    const createUser = new User({
        email: req.body.username,
        password: req.body.password
    });
    createUser.save((err) => {
        if (err) {
            console.log(err);
        } else {
            res.render("secrets.ejs");
        }
    });
});







app.listen(3000, function () {
    console.log("Listening to prt 3000");
});