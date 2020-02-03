var express = require('express');
var router = express.Router();
var async = require('async');

var session;

var NEWSFEED = '#newsfeed';
var newslist = [];

var fs = require('fs')
  , gm = require('gm').subClass({imageMagick: true});


var multer  = require('multer');

//var username;
var upload = multer({ dest: 'public/images/_newspics'});


var nano = require('nano')('http://localhost:5984');
var database = nano.db.use('batbook');



/****************GET und POST******************/

/* GET newsfeed */
router.get('/', isLoggedIn, function(req, res, next) {
    session = req.session;
    req.session.lastPoint = 10;
    req.session.toLoad = 10;
    
    req.session.passport.user;
    
  
  // Daten des eingeloggten Users aus der DB holen
  database.get(req.session.passport.user, function(err, user){
      if(!err){
          req.session.userallinfo = user;
          username = req.session.userallinfo.username;
          
          getNews(res, 10, false, 0, req);
          console.log('Load first news.');
          
      }
      
  });
  
  
  
  
  
});


/********************Wenn News hochgeladen werden********************/


// POST Upload einer neuen News
router.post('/', upload.array('newspic', 5), function (req, res, next) {
  // req.files ist das Array mit den Bildern 
  // req.body enthält den Text
    
    var newstext = null;
    
    // Wenn Text geschrieben wurde, soll dieser gespeichert werden
    if(!(req.body.newstext == '')){
        newstext = req.body.newstext;
    }
    
    var picarray = null;
    // Wenn kein Bild hochgeladen wurde
    if(req.files){
        
        picarray = req.files;
        
        for(i in picarray){
            picarray[i].thumbnail = 'images/_newspics/_thumbnails/th_' + picarray[i].filename;
        }
        
    }
    
        newNews = {newstext: newstext,
                   newspics: picarray,
                   user: req.session.userallinfo.username,
                   newsdate: new Date()};
        
        database.insert(newNews, function(err, body){
            if(err){
                console.log(err);
            }else{
                
                
                // Newsfeed muss wieder geupdatet werden, weil eine neue News hinzu kommt
                async.series([function(callback){
                    
                    newslist = [];
                    req.session.toLoad = 10;
                    req.session.lastPoint = 10;
                    
                    database.view('search_stuff', 'news', {descending : "true", limit: 10}, function(err, nlist){
                        if(!err){

                            for(index in nlist.rows){
                                
                                    newslist.push(nlist.rows[index].value);
                            }
                            
                            callback();
                        }
                        
                    });
                }, function(callback){
                    
                            // Fotos werden skaliert und bekommen weißen Hintergrund, sofern eines hochgeladen wurde
                            var stillHaveToCall = true;
                    
                            if(req.files){
                                stillHaveToCall = false;
                                
                                
                                // jedes einzelne Bild, das hochgeladen wurde, muss bearbeitet werden
                                async.eachSeries(picarray, function(pic, callb) {
                                    
                                    // Pfad des normalen Bildes
                                    var picPath = pic.path;
                                    // Pfad des skalierten Bildes mit weißem Hintergrund
                                    var thumbPath = 'public/' + pic.thumbnail;
                                
                                    // Breite und Höhe des Bildes ermitteln
                                    gm(picPath).size(function (err, size) {
                                        if (!err){

                                            var widthSpace = 0;

                                            // Falls die Breite kleiner als 800px ist, muss der weiße Rand größer werden, damit alle Thumbnail-Bilder 800px breit sind.
                                            if(size.width < 800){
                                                if(size.width >= 400){
                                                    widthSpace = (size.width - 400)/2;
                                                }else{
                                                    widthSpace = (400 - size.width)/2;
                                                }

                                            }

                                            var geo = '+' + widthSpace + '+' + 50;
                                            
                
                                            
                                           gm('public/images/_layout/whitec.png')
                                           .montage('public/images/_layout/whitec.png')
                                           .geometry(geo)
                                           .montage(picPath)
                                           .geometry(geo)
                                           .write(thumbPath, function(err) {
                                            if(!err){
                                                
                                                callb();

                                            }else{
    
                                                console.log(err);
                                            }
                                           }); 

                                        }else{
                                           console.log(err);
                                        }
                                   });
                                    
                                    
                                }, function(err){
                                    if(!err){
                                        callback();
                                    }
                                });

                                
                            }
                            
                            // Falls es kein Bild gab zum Speichern, soll der Callback hier aufgerufen werden.
                            if(stillHaveToCall){
                                callback();
                            }
                    
                                                           
                     }, function(callback){
                         

                         res.render('newsfeed', { title: 'Newsfeed', message: 'Upload was successful!', newslist: newslist, loggeduser: req.session.userallinfo.username}); 

                         callback();
                         
                     }]);
            }
        });
        
    
});


/******************Die nächsten News mit Ajax nachladen********************/

router.post('/loadNextNews', function (req, res, next) {
    
    req.session.toLoad += 5;
    getNews(res, req.session.toLoad, true, req.session.lastPoint, req);
    
    
});

/*************Helfer Funktionen**************/

function isLoggedIn(req, res, next) {

    // Wenn User eingeloggt ist
    if (req.isAuthenticated())
        return next();

    // Wenn User nicht eingeloggt ist
    res.redirect('/');
}



function getNews(res, lim, loadingMoreNews, last, req){
    database.view('search_stuff', 'news', {descending : "true", limit: lim}, function(err, nlist){
        if(!err){
            
            if(loadingMoreNews){
                
                var nextPartNewslist = [];
                for(var i = last; i< nlist.rows.length; i++){
                    nextPartNewslist.push(nlist.rows[i]);
                }
                
                req.session.lastPoint = lim;
                res.send(nextPartNewslist);
            }else{
                newslist = [];
                
                for(var i = 0; i< nlist.rows.length; i++){

                    newslist.push(nlist.rows[i].value);

                }

                res.render('newsfeed', { title: 'Newsfeed', message: '', newslist: newslist, loggeduser: req.session.userallinfo.username});
            }
            
            



        }

    });
}




module.exports = router;
