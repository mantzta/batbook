/****************Auf Tastendruck reagieren und checken, ob Username schon vergeben ist***************/


// Nach 1 Sekunde nichts mehr tun soll gecheckt werden
var timeout;
function setTimer(func){
    clearTimeout(timeout);
    timeout = setTimeout(func, 1000);
}

function clearTimer(){
    clearTimeout(timeout);
}

var usernameFilled;

function setUsernameFilledTrue(){
    usernameFilled = true;
}

// AJAX sendet Username an Server, der checkt, ob der Username in der Datenbank vergeben ist
function checkUsername(){
    clearTimeout(timeout);
    var typedUsername = document.getElementById('username').value;
    
    if(typedUsername != ''){
        var xhttp = new XMLHttpRequest();

        xhttp.onreadystatechange = function() {
            if (xhttp.readyState == 4 && xhttp.status == 200) {
                
                if(xhttp.responseText != 'tooLong'){
                
                    var userlist = JSON.parse(xhttp.responseText);
                    var content = '';
                    usernameFilled = true;

                    for (var user in userlist){
                        
                        if(userlist[user] == 'notexist'){
                            content += user + ' does not exist. ';
                            usernameFilled = false;
                        }else if(userlist[user] == 'self'){
                            content += user + ' is your own name. You can\'t write to yourself. ';
                            usernameFilled = false;
                        }
                    }
                    
                    if(content == ''){
                        content = 'The users all exist in the database! Keep on writing. ';
                    }

                    document.getElementById('pmessage').innerHTML = content;
                
                }else{
                    document.getElementById('pmessage').innerHTML = 'You can not write to everyone in the world! Limit the amount of usernames.';
                }
                
            }
        };

        xhttp.open('POST', '/messages/checkUsername', true);
        xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        xhttp.send('checkUsername=' + typedUsername);
        
    }else{
        document.getElementById('pmessage').innerHTML = '';
    }
    
}



/*************Checkt, ob Formularfelder leer sind**************/

function validateForm(){
    var user = document.forms['form']['username'].value;
    var text = document.forms['form']['mestext'].value;
    
    if ((user == null || user == '') || (text == null || text == '') || !usernameFilled) {
        document.getElementById('pmessage').innerHTML = 'Still empty fields!';
        return false;
    }
}

function validateForm2(){
    var user = document.forms['form2']['username'].value;
    var text = document.forms['form2']['mestext'].value;
    
    if ((user == null || user == '') || (text == null || text == '')) {
        document.getElementById('pmessage').innerHTML = 'Still empty fields!';
        return false;
    }
}

var d = $('#scrollable');
d.scrollTop(d.prop("scrollHeight"));
