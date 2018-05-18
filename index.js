const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const Sequelize = require('sequelize');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const db = new Sequelize('game','root','',{
    host: 'localhost',
    dialect: 'mysql'
});

const COOKIE_SECRET = 'cookie secret';

const User = db.define('user', {
    firstname : { type: Sequelize.STRING } ,
    lastname : { type: Sequelize.STRING } ,
    email : { type: Sequelize.STRING } ,
    password : { type: Sequelize.STRING }
});

const Review = db.define('review', {
    title: { type: Sequelize.STRING },
    game: { type: Sequelize.STRING },
    content: { type: Sequelize.STRING },
    note: { type: Sequelize.STRING },

});

const Comment = db.define('comment', {
    commentaire: { type: Sequelize.STRING },
});

const Like = db.define('like', {
    action: {
        type: Sequelize.ENUM('like')
    }
});

const Dislike = db.define('dislike', {
    action: {
        type: Sequelize.ENUM('dislike')
    }
});

db.sync().then(r => {
    console.log("DB SYNCED");
}).catch(e => {
    console.error(e);
});

app.set('view engine', 'pug');
app.use(bodyParser.urlencoded());

passport.use(new LocalStrategy((email, password, done) => {
    User
        .findOne({
            where: {email, password}
        }).then(function (user) {
        if (user) {
            return done(null, user)
        } else {
            return done(null, false, {
                message: 'Invalid credentials'
            });
        }
    })

        .catch(done);
}));


passport.serializeUser((user, cookieBuilder) => {
    cookieBuilder(null, user.email);
});

passport.deserializeUser((email, cb) => {
    console.log("AUTH ATTEMPT",email);

    User.findOne({
        where : { email }
    }).then(r => {
        if(r) return cb(null, r);
        else return cb(new Error("No user corresponding to the cookie's email address"));
    });
});

app.use(cookieParser(COOKIE_SECRET));

app.use(bodyParser.urlencoded({ extended: true }));

// Keep track of user sessions
app.use(session({
    secret: COOKIE_SECRET,
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

app.get('/',(req,res) => {
    Review
        .sync()
        .then(() => {
            Review
                .findAll({include:[Like, Dislike,  {model: Comment,include:[User]}, ]})
                .then((reviews) => {
                    console.log(reviews);
                    res.render( 'home', { reviews, user : req.user});
                })
        })

});

app.get('/review',(req,res) => {
    res.render('review');
});

app.post('/review', (req, res) => {
    const { title, game, content, note } = req.body;
    Review
        .sync()
        .then(() => Review.create({ title, game, content, note }))
        .then(() => res.redirect('/'));
});


app.get('/login', (req, res) => {
    // Render the login page
    res.render('login');
});

app.post('/login',
    // Authenticate user when the login form is submitted
    passport.authenticate('local', {
        // If authentication succeeded, redirect to the home page
        successRedirect: '/',
        // If authentication failed, redirect to the login page
        failureRedirect: '/login'
    })
);

app.get('/auth',(req,res) => {
    res.render('inscription');
});

app.post('/auth', (req, res) => {
    const { firstname, lastname, email, password } = req.body;
    User
        .sync()
        .then(() => User.create({ firstname, lastname, email, password  }))
        .then(() => res.redirect('/'));
});


app.post('/comment/:reviewId', (req, res) => {
    const { commentaire } = req.body;
    Comment
        .sync()
        .then(() => Comment.create({ commentaire, reviewId: req.params.reviewId, userId: req.user.id }))
        .then(() => res.redirect('/'));
});

app.post('/review/:reviewId/like', (req, res) => {
    Like
        .sync()
        .then(() => Like.create({ action: 'like', reviewId: req.params.reviewId }))
        .then(()=> res.redirect('/'));
});

app.post('/review/:reviewId/dislike', (req, res) => {
    Dislike
        .sync()
        .then(() => Dislike.create({ action: 'dislike', reviewId: req.params.reviewId }))
        .then(()=> res.redirect('/'));
});

Review.hasMany(Like);
Like.belongsTo(Review);

Review.hasMany(Dislike);
Dislike.belongsTo(Review);

Review.hasMany(Comment);
Comment.belongsTo(Review);

User.hasMany(Comment);
Comment.belongsTo(User);

app.listen(3000);