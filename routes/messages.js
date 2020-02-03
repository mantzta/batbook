var express = require('express');
var router = express.Router();

var nano = require('nano')('http://localhost:5984');
var database = nano.db.use('batbook');
var async = require('async');


/* GET users messages. */
router.get('/', isLoggedIn, function(req, res, next) {
    req.session.passport.user;
    req.session.allMessages = null;
    req.session.firstload = true;
    
    // Falls man auf den Link im Userprofil geklickt hat, wird hier gespeichert an wen die Nachricht geht
    var to = null;
    var setWindow = true;
    
    
    // Welche Nachricht wurde angeklickt: wird in currentlyActive gespeichert (das ist der Linkname)
    if(req.query.user){
        req.session.currentlyActive = req.query.user; 
    // Standardwert, falls man zum ersten Mal Messages öffnet
    }else{
        req.session.currentlyActive = '#new';
        messageObj = null;
    }
    
    
    async.series([function(callb){
        database.get(req.session.passport.user, function(err, user){


            // Herausfinden, welche Nachrichten noch ungelesen sind
            if(!err){
                req.session.notread = user.notread;
                req.session.userallinfo.messages = user.messages;
            }


            // Falls es ungelesene Nachrichten gibt
            if(req.session.notread.length > 0){

                var userarray = req.session.currentlyActive.split(', ');
                userarray.push(req.session.userallinfo.username);
                userarray.sort();
                var currentlyMesname = 'mes';
                for(i in userarray){
                    currentlyMesname += '_' + userarray[i];
                }

                // Falls man auf der entsprechenden Message Seite ist, wird sie aus der notread Liste gelöscht
                if(user.notread.indexOf(currentlyMesname) >= 0){
                    var index = user.notread.indexOf(currentlyMesname);
                    user.notread.splice(index, 1);

                    req.session.notread = user.notread;

                    database.insert(user, function(err){
                        if(err){
                           console.log(err);
                        }
                    });


                }

            }


            callb();
        });
    }, function(callb){


          req.session.allMessages = {};

          // Für jede einzelne Message-Referenz des Users nach den Messages-Dokumenten nachschauen
          async.eachSeries(req.session.userallinfo.messages, function(toBeChecked, callback){

              // Suche nach dem Nachrichten Dokument des Users in der DB
              database.view('search_stuff', 'mes', { keys: [toBeChecked] }, function(err, body) {
                 if (!err) {

                     // Wenn welche gefunden wurden, werden sie hinzugefügt
                     if(body.rows.length > 0){

                         body.rows.forEach(function(doc) {

                             // Enthält alle Usernamen: String wird als Linknamen benutzt
                             var linkName = '';
                             var firstone = true;


                             // Gehe alle Usernamen, die an diesem Gespräch beteiligt sind, durch
                             for(index in doc.value.user){

                                 // Der eigene Username soll nicht im Link angezeigt werden
                                 if(doc.value.user[index] != req.session.userallinfo.username){
                                     if(firstone){
                                         linkName += doc.value.user[index];
                                         firstone = false;
                                     }else{
                                         linkName +=', ' + doc.value.user[index];
                                     }

                                 }

                             }


                             // Hier kommt man nur rein, wenn man auf den Link im Userprofil geklickt hat, es speichert den Linknamen der Nachricht zum User
                             if(req.query.to){
                                 
                                 if(linkName == req.query.to){
                                     req.session.currentlyActive = req.query.to;
                                     setWindow = false;
                                 }

                             }

                             // Zur Liste der Nachrichten hinzufügen, die auf der Nachrichtenseite des Users angezeigt werden soll
                             req.session.allMessages[linkName] = doc.value;
                             req.session.allMessages[linkName]['linkname'] = linkName;

                             // markieren, welche Nachrichten man noch nicht gelesen hat
                             if(req.session.notread.indexOf(toBeChecked) >= 0){
                                 req.session.allMessages[linkName]['notread'] = true;
                             }else{
                                 req.session.allMessages[linkName]['notread'] = false;
                             }


                         });
                     }


                 }else{
                     console.log(err);  
                 }
                  
                  callback();

              });

              
              
              
          }, function(err){
              
              
              callb();
              
          });




    }, function(callb){
        
        if(setWindow){
            to = req.query.to;
        }
        
        res.render('messages', { title: 'Messages', allMessages: req.session.allMessages, loggeduser: req.session.userallinfo.username, currentlyActive: req.session.currentlyActive, to: to});

        callb();
        
        
    }]);
    
       



        
    
        
});


/********************Nachricht empfangen über POST***********************/

// Wenn eine neue Nachricht über das Formalar geschickt wird
router.post('/', function(req, res, next) {
    
    // Alle beteiligten Usernamen in ein Array speichern
    var normalized = normalizeUserstring(req.body.username);
    var userarray = normalized.split(",");
    
    // Löscht leere Elemente
    for(i in userarray){
        if(/^\s*$/.test(userarray[i])){
            userarray.splice(i, 1);
        }
    }
    
    var userarrayWithoutSelf = normalized.split(",");
    userarray.push(req.session.userallinfo.username);
    
    // Usernamen Alphabetisch sortieren
    userarray.sort();
    
    var text = req.body.mestext;
    
    // Name des Messages-Dokuments und LinkNamen generieren
    var mesname = 'mes';
    var userLink = '';
    var firstone = true;
    for(index in userarray){
        mesname += '_' + userarray[index];
        if(userarray[index] != req.session.userallinfo.username){
            if(firstone){
                userLink += userarray[index];
                firstone = false;
            }else{
                userLink += ', ' + userarray[index];
            }
            
        }
        
    }
    
    // Damit man nach Abschicken der Nachricht sofort auf die Seite mit den Nachrichten kommt
    req.session.currentlyActive = userLink;
    
    // Checken, ob es schon eine Nachricht an diese User gibt
    database.view('search_stuff', 'mes', { keys: [mesname] }, function(err, body) {
         if (!err) {
             
             // Wenn ja, wird diese aktualisiert
             if(body.rows.length > 0){
                 
                 console.log('Message already exists.');
                 
                 var mesExists = body.rows[0].value;
                 
                 var message = {
                     "text": text,
                     "by": req.session.userallinfo.username
                 };
                 
                 mesExists.messages.push(message);
                 
                 // Nur die letzten 20 Einträge anzeigen
                 mesExists.messages = onlyLast(mesExists.messages);
                 
                 req.session.allMessages[userLink] = mesExists;
                 req.session.allMessages[userLink]['linkname'] = userLink;
                 
                 // Für den Fall, dass es die Nachricht schon gibt und sie ungelesen ist, wird sie auf gelesen gesetzt, da man zur Nachricht geleitet wird
                 if(req.session.notread.indexOf(mesname) >= 0){
                     req.session.allMessages[userLink]['notread'] = false;
                 }
                 
                 // Bei allen anderen Usern muss nun die Nachricht auf ungelesen gesetzt werden
                 for(i in userarrayWithoutSelf){
                     console.log(userarrayWithoutSelf[i]);
                     
                     database.view('search_stuff', 'username', { keys: [userarrayWithoutSelf[i]] }, function(err, body) {
         
                         
                         if(body.rows.length > 0){
         
                             var userid = body.rows[0].value._id;
                             
                             console.log(userid);
                             
                             database.get(userid, function(err, user){
                                 if(!err){
                                     
                                     if(user.notread.indexOf(mesname) < 0){
                                         
                                         user.notread.push(mesname);
                                         
                                         database.insert(user, function(err){
                                             if(err){
                                                 console.log(err);
                                             }
                                         });
                                         
                                     }
             
                                     
                                 }else{
                                     console.log(err);
                                 }
                             });
                             
                         }
                         
                     });
                         
                     
                     
                 }
                 
                 // Message in der DB aktualisieren
                 database.insert(mesExists, function(err){
                     if(err){
                         console.log(err);
                     }
                 })
                 
                 res.render('messages', { title: 'Messages', allMessages: req.session.allMessages, loggeduser: req.session.userallinfo.username, currentlyActive: req.session.currentlyActive});
                 console.log('Message was updated.');

                 
             // Wenn nein, wird eine neue Message angelegt
             }else{
                 var mesArray = [{
                     "text": text,
                     "by": req.session.userallinfo.username
                 }]
                 
                 var newMessage = {
                     _id: mesname,
                     user: userarray,
                     messages: mesArray
                 }
                 
                 if(req.session.allMessages == null){
                     req.session.allMessages = {};
                 }
                 
                 req.session.allMessages[userLink] = newMessage;
                 req.session.allMessages[userLink]['linkname'] = userLink;
                 
                 // neue Message als Dokument in DB einfügen
                 database.insert(newMessage, function(err){
                     if(err){
                         console.log(err);
                     }else{
                        
                         // Referenz in jedem User-Dokument anlegen, der am Gespräch beteiligt ist
                         async.each(userarray, function(name, callback){
                             
                             // Benutzer suchen mit diesem Usernamen
                             database.view('search_stuff', 'username', { keys: [name] }, function(err, body) {
                                 
                                 // Wenn einer gefunden wurde
                                 if(body.rows.length > 0){
                                     var userid = body.rows[0].value._id;
                                     
                                     // Die Referenz zur Message wird im Messages Array des Users gespeichert
                                     database.get(userid, function(err, user){
                                         
                                         // Falls es noch gar keine Referenzen gibt, muss ein Array erstmals erstellt werden
                                         if(user.messages != null){
                                             user.messages.push(mesname);
                                         }else{
                                             var newMesArray = [mesname];
                                             user.messages = newMesArray;
                                         }
                                         
                                         // Bei alle anderen Usern muss die Nachricht als ungelesen angezeigt werden
                                         if(name != req.session.userallinfo.username){
                                             user.notread.push(mesname);
                                         }
                                         
                                         // User updaten
                                         database.insert(user, function(err){
                                             if(err){
                                                 console.log(err);
                                             }
                                             
                                             console.log("reference saved");
                                             callback();
                                         });
                                     });
                                     
                                 }

                                 
                             });
                             
                         });
                         
                         console.log('New Message was successfully sent.');
                         res.render('messages', { title: 'Messages', allMessages: req.session.allMessages, loggeduser: req.session.userallinfo.username, currentlyActive: req.session.currentlyActive});
                         
                     }
                 });
             }
             
             }else{
             console.log(err);  
             }
         
         });
    
    
    
    
    
    
    
});


/*************Usernamen Check**************/

//Checkt ob Usernamen existieren in der Datenbank
router.post('/checkUsername', function(req, res, next) {
    
    // Beschränkung mit wie vielen Usern man schreiben kann (da die Usernamen per GET übertragen werden, gibt es eine Zeichenbeschränkung)
    if(req.body.checkUsername.length > 1900){
        res.send('tooLong');
    }else{
    
        var normalized = normalizeUserstring(req.body.checkUsername);

        // mehrere Usernamen können eingegeben werden
        var toBeCheckedArray = normalized.split(',');
        
        // Löscht leere Elemente
        for(i in toBeCheckedArray){
            if(/^\s*$/.test(toBeCheckedArray[i])){
                toBeCheckedArray.splice(i, 1);
            }
        }

        // Hier wird für jeden Benutzernamen gespeichert, ob er in der DB existiert oder nicht
        var answerObj = {};

        // für alle Usernamen im Array checken, ob sie existieren
        async.eachSeries(toBeCheckedArray, function(username, callback){

            // Benutzerdokument mit dem Usernamen holen
            database.view('search_stuff', 'username', { keys: [username] }, function(err, body) {

                if (!err) {
                    // Wenn ein Benutzerdokument gefunden wurde
                    if(body.rows.length > 0){
                        answerObj[username] = 'exist';
                        
                        if(username == req.session.userallinfo.username){
                            answerObj[username] = 'self';
                        }
                        
                    // Wenn keines gefunden wurde
                    }else{
                        answerObj[username] = 'notexist';
                    }
                    
                }else{
                    console.log(err);  
                }

                callback();

            });

        }, function(err){
            if(!err){
                res.send(answerObj);
            }
        });
    
    
    }
        
    
});

/******************Helfer Funktionen*******************/

// checken, ob User eingeloggt ist
function isLoggedIn(req, res, next) {

    // Wenn User eingeloggt ist
    if (req.isAuthenticated())
        return next();

    // Wenn User nicht eingeloggt ist
    res.redirect('/');
}

// Ersetzt jedes Vorkommen eines Strings in einem String mit einem anderen String
function replaceAll(str, find, replace) {
  return str.replace(new RegExp(find, 'g'), replace);
}

// Nur die letzten 40 Nachrichten sollen geladen werden
function onlyLast(mesArray){
    if(mesArray.length > 40){
        mesArray = mesArray.slice(mesArray.length-40, mesArray.length);
    }
    return mesArray;
}

// Für den Fall, dass der User ', ' als Trennzeichen eingibt statt nur einem Komma
function normalizeUserstring(userstr){
    userstr.toLowerCase();
    
    while(userstr.indexOf(', ') >= 0){
        userstr = userstr.replace(', ', ',');
    }
    
    return userstr;
}

module.exports = router;
