/*************Registerbox erscheinen*************/

$(document).ready(function(){
  $(".show").click(function(){
    $("#register").fadeIn();
    $("#white").fadeIn();
    
    emailGood = false;
    pwGood = false;
    
  });

  $("#white").click(function(){
    $("#register").fadeOut();
    $("#white").fadeOut();
      
    emailGood = false;
    pwGood = false;  
    
  });

}); 



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

var usernameFilled = false;

// AJAX sendet Username an Server, der checkt, ob der Username in der Datenbank vergeben ist
function checkUsername(){
    clearTimeout(timeout);
    var typedUsername = document.getElementById('username').value;
    
    if(typedUsername != ''){
        var xhttp = new XMLHttpRequest();

        xhttp.onreadystatechange = function() {
            if (xhttp.readyState == 4 && xhttp.status == 200) {
                
                if(xhttp.responseText == 'notTaken'){
                    usernameFilled = true;
                    document.getElementById('checked').innerHTML = 'Great. Take it!';
                }else if(xhttp.responseText == 'taken'){
                    usernameFilled = false;
                    document.getElementById('checked').innerHTML = 'Is already taken.';  
                }else{
                    usernameFilled = false;
                    document.getElementById('checked').innerHTML = 'This isn\'t valid.';
                }
            }
        };

        xhttp.open('POST', '/checkUsername', true);
        xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        xhttp.send('checkUsername=' + typedUsername);
        
    }else{
        document.getElementById('checked').innerHTML = 'Still free?';
    }
    
}



/*************Checkt, ob Formularfelder leer sind**************/

function validateForm(){
    var email = document.forms['form']['email'].value;
    var password = document.forms['form']['password'].value;
    
    if ((email == null || email == "") || (password == null || password == "")) {
        document.getElementById('messageLog').innerHTML = 'Still empty fields!';
        return false;
    }
}


function validateRegisterForm(){
    var email = document.forms['form2']['email'].value;
    var password = document.forms['form2']['password'].value;
    
    document.getElementById('pwcheck').innerHTML = '';
    document.getElementById('emailcheck').innerHTML = '';
    document.getElementById('messageReg').innerHTML = '';
    
    var passwordOk = true;
    var emailOk = true;
    var notEmpty = true;
    
    var mailformat = /^([0-9a-zA-Z]([-_\\.]*[0-9a-zA-Z]+)*)@([0-9a-zA-Z]([-_\\.]*[0-9a-zA-Z]+)*)[\\.]([a-zA-Z]{2,9})$/;
    
    if(password.length < 6){
        passwordOk = false;
        document.getElementById('pwcheck').innerHTML = 'At least 6 needed!';
    }
    
    if(!mailformat.test(email)){
        emailOk = false;
        document.getElementById('emailcheck').innerHTML = 'Not valid.';
    }
    
    if((email == null || email == '') || (password == null || password == '') || !usernameFilled){
        notEmpty = false;
        document.getElementById('messageReg').innerHTML = 'You still need to fill out!';
    }
    
    if (!notEmpty || !emailOk || !passwordOk) {
        return false;
    }
    
}