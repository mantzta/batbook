var express = require('express');
var router = express.Router();

var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var bcrypt   = require('bcrypt-nodejs');


//-------------Datenbank nutzen-------------
var nano = require('nano')('http://localhost:5984');
var database;
var async = require('async');

async.series([
    function(callback){
        
        // Verbindung herstellen. Wenn es noch keine Datenbank gibt, dann erzeuge diese.
        nano.db.get('batbook', function(err, body) {
            if (!err) {
                database = nano.use('batbook');
            }else{
                nano.db.create('batbook', function(err, body) {
                    if (!err) {
                        
                        console.log('There was no batbook database, so we created a database for you!');
                    }
                });
      
            database = nano.use('batbook');
                
            }
            
            callback();
            
        });
        
        
    },
    function(callback){
        
        // Such-View erzeugen, wenn es noch keine gibt.
        database.get('_design/search_stuff', function(err, body){
            
            if(err){
                console.log(err);
                database.insert(
                    { "views": 
                        { "username": 
                            { "map": function(doc) { if(doc.username){emit(doc.username, doc);} } },
                          "message": 
                            { "map": function (doc) {if(doc._id.indexOf('mes_') >= 0 ){ emit(doc._id, doc); } } },
                          "news": 
                            {"map": function (doc) { if(doc.newsdate){ emit(doc.newsdate, doc); } } }
                        }
                    }, '_design/search_stuff', function (error, response) {
                        console.log('Search View could not be found. New Search Views are now inserted into the batbook database.');
                
                    callback();
                    
                });
            
            }else{
                callback();
            }

            
        });
        
    }
],
function(err, results){
    console.log("Database connected and View loaded.");
});


//--------------Login und Registrierung--------------

// Registration
passport.use('local-signup', new LocalStrategy({
        usernameField : 'email',
        passwordField : 'password',
        passReqToCallback : true // alle Felder des Formulars zurückgeben
    },
    function(req, email, password, done) {
        var username = req.body.username;
        username.toLowerCase;
    
        process.nextTick(function() {
            
          // Gibt es schon jemanden mit der E-Mail?
          database.head(email, function(err, _,headers) {
              if (!err) { 
                  return done(null, false, req.flash('messageReg', 'This Email is already taken.'));
              }
              
              var array = [];
              
              password = generateHash(password);
              var user = {_id: email,
                          password: password,
                          username: username,
                          messages: null,
                          notread: array,
                          favfood: [],
                          favblood: [],
                          profilepic: null,
                          vampire: false
                          }
              
              database.insert(user, function(err, body) {
                if (!err)
                  console.log("Registered a new User!");
              });
              
              console.log(user);
              return done(null, user);
          });  

        });

    }));


// Login
passport.use('local-login', new LocalStrategy(
    {
        usernameField : 'email',
        passwordField : 'password',
        passReqToCallback : true 
    }, function(req, email, password, done){
        
        process.nextTick(function() {

            database.get(email, function(err, user) {
                
              if (err) { 
                  return done(null, false, req.flash('message', 'That email does not exist in the Database.'));
                       }
              if (!bcrypt.compareSync(password, user.password)) {
                return done(null, false, req.flash('message', 'Password is wrong. Just try again.')); }
                return done(null, user);
            });
            
        });


    }
                                              
));



// Sessions erzeugen
passport.serializeUser(function(user, done) {
  done(null, user._id);
});

passport.deserializeUser(function(id, done) {
    database.get(id, function (err, user) {
    if (err) { return done(err); }
    done(null, user);
  });
});


//--------------POST und GET Anfragen behandeln---------------

/* GET home page. */
router.get('/', function(req, res, next) {
    
    if(req.session.passport){
        res.redirect('/newsfeed');
    }else{
        res.render('index', { title: 'Batbook', message: req.flash('message'), messageReg: req.flash('messageReg')});
    }
    
  
});

// Loginformular einlesen
router.post('/', passport.authenticate('local-login', {
  successRedirect : '/newsfeed',
  failureRedirect : '/',
  failureFlash : true
}));

// Registrierungsformular einlesen
router.post('/signup', passport.authenticate('local-signup', {
  successRedirect : '/newsfeed',
  failureRedirect : '/',
  failureFlash : true
}));

// Ausloggen
router.get('/logout', function(req, res, next) {
  req.session.destroy(function(err){});
  req.logout();
  res.redirect('/');
});

//Checkt ob Username schon existiert in der Datenbank
router.post('/checkUsername', function(req, res, next) {
    
    var toBeChecked = req.body.checkUsername;
    toBeChecked.toLowerCase();
    
    var posAnswer = 'notTaken';
    var negAnswer = 'taken';
    
    // Checkt, ob String nur aus Zahlen und Buchstaben besteht
    var regExp = /^[a-z0-9]+$/;
    
    if( !(regExp.test(toBeChecked)) || toBeChecked.length > 50){
        res.send('notValid');
    }else{
        database.view('search_stuff', 'username', { keys: [toBeChecked] }, function(err, body) {
    
        
            if (!err) {
                if(body.rows.length > 0){
                    res.send(negAnswer);
                }else{
                    res.send(posAnswer);
                }

            }else{
                console.log(err);  
            }

        });
    }
    
});


//-----------Helfer Funktionen------------

// Passwort verschluesseln
function generateHash(password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};


module.exports = router;
