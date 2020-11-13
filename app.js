//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const ejs = require("ejs");
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const findOrCreate = require('mongoose-findorcreate');



const app = express();
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view-engine", "ejs");
app.use(session({
    secret: "thisismybeautifulsecret",
    resave: false,
    saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session());

mongoose.Promise = global.Promise;
mongoose.set("useCreateIndex", true);

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
    password: String,
    googleId: String,
    facebookId: String,
    // secret: String
    secret: {
        type: Array,
        "default": []
    }
});
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function (user, done) {
    done(null, user.id);
});

passport.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
        done(err, user);
    });
});

passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets"
},
    function (accessToken, refreshToken, profile, cb) {
        User.findOrCreate({ facebookId: profile.id }, function (err, user) {
            return cb(err, user);
        });
    }
));


passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
},
    function (accessToken, refreshToken, profile, cb) {
        User.findOrCreate({ googleId: profile.id }, function (err, user) {
            return cb(err, user);
        });
    }
));



app.get("/", function (req, res) {
    res.render("home.ejs");
});

app.route("/secrets").get(function (req, res) {
    User.find({ "secret": { $ne: null } }, function (err, foundUsers) {
        if (err) {
            console.log(err);
        } else {
            res.render("secrets.ejs", { usersWithSecrets: foundUsers });
        }
    });
});




app.route("/register").get(function (req, res) {
    res.render("register.ejs");
}).post(function (req, res) {
    const username = req.body.username;
    const password = req.body.password;


    User.register({ username: username }, password, function (err, user) {
        if (err) {
            console.log(err);
            res.redirect("/register");
        } else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("/secrets");
            });
        }
    });

});



app.route("/login").get(function (req, res) {
    res.render("login.ejs");
}).post(function (req, res) {
    const user = new User({
        username: req.body.username,
        password: req.body.passport,
    });
    req.login(user, function (err) {
        if (err) {
            console.log(err);
        } else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("/secrets");
            });
        }
    });
});


app.get("/auth/google",
    passport.authenticate("google", { scope: ["profile"] }));


app.get('/auth/google/secrets',
    passport.authenticate('google', { failureRedirect: "/login" }),
    function (req, res) {
        res.redirect("/secrets");
    });



app.get('/auth/facebook',
    passport.authenticate('facebook'));

app.get('/auth/facebook/secrets',
    passport.authenticate('facebook', { failureRedirect: '/login' }),
    function (req, res) {
        res.redirect('/secrets');
    });

app.route("/submit").get(function (req, res) {
    if (req.isAuthenticated()) {
        res.render("submit.ejs");
    } else {
        res.redirect("/login");
    }
}).post(function (req, res) {
    const submittedSecret = req.body.secret;
    console.log(req.user.id);
    User.findById(req.user.id, function (err, foundUser) {
        if (err) {
            console.log(err);
        } else {
            foundUser.secret.push(submittedSecret);
            foundUser.save(function () {

                res.redirect("/secrets");

            });
        }
    });

});


app.get("/logout", function (req, res) {
    req.logout();
    res.redirect("/");
});









app.listen(3000, function () {
    console.log("Listening to prt 3000");
});