$(document).ready(function(){
  $(".show").click(function(){
    $("#update").fadeIn();
    
  });

  $(".nonshow").click(function(){
    $("#update").fadeOut();
    
  });

}); 



function showtext(text, id){
    document.getElementById(id).innerHTML = text;
}

function hidetext(id){
    document.getElementById(id).innerHTML = '';
}


// Nach 1 Sekunde nichts mehr tun soll gecheckt werden
var timeout;
function setTimer(func){
    clearTimeout(timeout);
    timeout = setTimeout(func, 1000);
}

function clearTimer(){
    clearTimeout(timeout);
}


function normalizeString(str){
    
    str += '';
    
    while(str.indexOf(', ') >= 0){
        str = str.replace(', ', ',');
    }
    
    return str;
    
}

// Die Länge der Namen checken
function checkLength(){
    var str = document.getElementById('blood').value;
    str = normalizeString(str);
    
    var array = str.split(',');
    
    for(i in array){
        if(array[i].length > 20){
            document.getElementById('check').innerHTML = 'A name musn\'t contain more than 20 characters.';
            return false;
        }
    }
    
    return true;
    
}

function validateForm(){
    if(!checkLength()){
        return false;
    }else{
        return true;
    }
}

