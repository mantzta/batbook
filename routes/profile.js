var express = require('express');
var router = express.Router();
var async = require('async');

var fs = require('fs')
  , gm = require('gm').subClass({imageMagick: true});

var multer  = require('multer');

var storage = multer.diskStorage({
            destination: function (req, file, cb) {
            cb(null, 'public/images/_profilepics');
          },
          filename: function (req, file, cb) {
            cb(null, req.session.profilepicName);
          },

          });
          
var upload = multer({ storage: storage });

var nano = require('nano')('http://localhost:5984');
var database = nano.db.use('batbook');



/****************GET******************/

/* GET profile */
router.get('/', isLoggedIn, function(req, res, next) {
    
    // Welcher User wird auf dem Profil angeschaut:
    if(req.query.user == req.session.userallinfo.username){
        
        // Wenn es das eigene Profil ist, kann man es bearbeiten und braucht einen Namen für das Profilbild
        req.session.profilepicName = req.session.userallinfo.username + '.png';
        
        res.render('profile', { title: 'Profile', user: req.session.userallinfo, loggeduser: req.session.userallinfo.username});
        
    }else{
        
        // Wenn ein anderer User angeschaut wird, wird nach seinen Daten in der DB gesucht
        database.view('search_stuff', 'username', { keys: [req.query.user] }, function(err, body) {
            if(body.rows.length > 0){
                
                res.render('profile', { title: 'Profile', user: body.rows[0].value, loggeduser: req.session.userallinfo.username});
            }
        });
        
    }
    
});


/********************Wenn Userdaten bearbeitet werden********************/


// POST Update des eigenen Profils
router.post('/', upload.single('profilepic'), function (req, res, next) {
  // req.file ist das Bild
  // req.body enthält den Text
    
    if(req.body.food){
        req.session.userallinfo.favfood = req.body.food;
    }else{
        req.session.userallinfo.favfood = [];
    }
    
    if(req.body.blood){
        req.session.userallinfo.favblood = normalizeUserstring(req.body.blood).split(',');
        
        // Löscht leere Elemente
        for(i in req.session.userallinfo.favblood){
            if(/^\s*$/.test(req.session.userallinfo.favblood[i])){
                req.session.userallinfo.favblood.splice(i, 1);
            }
        }
        
    }else{
        req.session.userallinfo.favblood = [];
    }
    
    if(req.body.vampire == 'yes'){
        req.session.userallinfo.vampire = true;
    }else if(req.body.vampire == 'no'){
        req.session.userallinfo.vampire = false;
    }
    
    if(req.body.deletepic == 'yes' && !req.file){
        req.session.profilepicName = null;
    }
    
    async.series([function(callback){
        
        // Fotos werden skaliert und bekommen weißen Hintergrund, sofern eines hochgeladen wurde
        var stillHaveToCall = true;
        if(req.file){
            stillHaveToCall = false;

            // Pfad des Profilbildes
            var profilepicPath = 'public/images/_profilepics/' + req.session.profilepicName;

            // Breite und Höhe des Bildes ermitteln
            gm(profilepicPath).size(function (err, size) {
                if (!err){


                    // Landscape Bild wird bearbeitet
                    if(size.width > size.height){
                        
                        landResizeCropDraw(size.width, size.height, profilepicPath, callback);

                    // Portrait Bild wird bearbeitet
                    }else if(size.width < size.height){
                        
                        portraitResizeCropDraw(size.width, size.height, profilepicPath, callback);
                      
                    // Quadratisches Bild wird bearbeitet
                    }else{
                        
                        squareResizeDraw(profilepicPath, callback);
                        
                    }


                }else{
                   console.log(err);
                }
           });
        }

        // Falls es kein Bild gab zum Speichern, soll der Callback hier aufgerufen werden.
        if(stillHaveToCall){
            callback();
        }

    }, function(callback){
        
        
        database.get(req.session.passport.user, function(err, user){
        
            if(!err){
                user.favfood = req.session.userallinfo.favfood;
                user.favblood = req.session.userallinfo.favblood;
                user.vampire = req.session.userallinfo.vampire;

                if(req.session.profilepicName != null && req.file){
                    user.profilepic = '/images/_profilepics/' + req.session.profilepicName; 
                }else if(req.session.profilepicName == null){
                    user.profilepic = null;
                }

                req.session.userallinfo.profilepic = user.profilepic;

                database.insert(user, function(err){
                    if(err){
                        console.log(err);
                    }else{

                        req.session.profilepicName = req.session.userallinfo.username + '.png';

                        res.render('profile', { title: 'Profile', user: req.session.userallinfo, loggeduser: req.session.userallinfo.username});
                        
                        callback();
                    }
                });
            }else{
                console.log(err);
            }

        });
        
        
    }])
    
    
});

/*************Helfer Funktionen**************/

function isLoggedIn(req, res, next) {

    // Wenn User eingeloggt ist
    if (req.isAuthenticated())
        return next();

    // Wenn User nicht eingeloggt ist
    res.redirect('/');
}

// Für den Fall, dass der User ', ' als Trennzeichen eingibt statt nur einem Komma
function normalizeUserstring(userstr){
    
    while(userstr.indexOf(', ') >= 0){
        userstr = userstr.replace(', ', ',');
    }
    
    return userstr;
}


function landResizeCropDraw(width, height, path, callback){
    
    // Damit man den Ausschnitt aus der Mitte entnimmt
    var x = 0;
    var scale;
    if(width > 302){
        scale = height/301;
        x = width/scale;
        x = (x/2) - 150;
    }else if(width < 298){
        scale = 301/height;
        x = width*scale;
        x = (x/2) - 150;
    }
    
    
    gm(path)
    .resize(null, 301)
    .crop(301, 301, x, 0)
    .write(path, function(err){
        if(!err){
            
            var putPicOnPic = 'image Over 504,49 0,0 ' + path;
    
            gm('public/images/_layout/battrans.png').draw([putPicOnPic]).draw(['image Over 0,0 0,0 public/images/_layout/battrans.png']).write(path, function(err){
                if (err){
                    return console.dir(arguments);
                }else{
                    console.log("Profilepic is ready.");
                    callback();
                }
    
    
            });
        }
        
    });
}


function portraitResizeCropDraw(width, height, path, callback){
    
    // Damit man den Ausschnitt aus der Mitte entnimmt
    var y = 0;
    var scale;
    if(height > 302){
        scale = width/301;
        y = height/scale;
        y = (y/2) - 150;
    }else if(height < 298){
        scale = 301/width;
        y = height*scale;
        y = (y/2) - 150;
    }
    
    gm(path)
    .resize(301)
    .crop(301, 301, 0, y)
    .write(path, function(err){
        if(!err){
            
            var putPicOnPic = 'image Over 504,49 0,0 ' + path;
    
            gm('public/images/_layout/battrans.png').draw([putPicOnPic]).draw(['image Over 0,0 0,0 public/images/_layout/battrans.png']).write(path, function(err){
                if (err){
                    return console.dir(arguments);
                }else{
                    console.log("Profilepic is ready.");
                    callback();
                }
    
    
            });
        }
        
    });
}

function squareResizeDraw(path, callback){
    
    gm(path)
    .resize(301)
    .write(path, function(err){
        if(!err){
            
            var putPicOnPic = 'image Over 504,49 0,0 ' + path;
    
            gm('public/images/_layout/battrans.png').draw([putPicOnPic]).draw(['image Over 0,0 0,0 public/images/_layout/battrans.png']).write(path, function(err){
                if (err){
                    return console.dir(arguments);
                }else{
                    console.log("Profilepic is ready.");
                    callback();
                }
    
    
            });
        }
        
    });
}





module.exports = router;
