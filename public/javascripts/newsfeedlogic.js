

// Weitere 5 News werden beim Runterscrollen nachgeladen
window.onscroll = function(ev) {  
    
      if ( (window.innerHeight + window.scrollY) == document.body.scrollHeight) {
          
          var xhttp = new XMLHttpRequest();

            xhttp.onreadystatechange = function() {
                if (xhttp.readyState == 4 && xhttp.status == 200) {
                    
                    if(xhttp.responseText != null){
                        
                        var newslist = JSON.parse(xhttp.responseText);

                        var content = "";

                        for (var index in newslist){

                            var pic = "";
                            if(newslist[index].newspics != null){
                                
                                for(i in newslist[index].newspics){
                                    var source = newslist[index].newspics[i];
                                    
                                    var img = '"images/_newspics/' + source.filename + '"';
                                pic = "<div class='imgbox'> <img src='" + source.thumbnail + "' onclick='openPic(" + img + ")'/></div>";
                                }
                                
                                
                            }

                            var text = "";
                            if(newslist[index].value.newstext != null){
                                text = "<div class='textbox'><p>" + newslist[index].value.newstext + "</p></div>";
                            }
                            
                            var info = "<div class='infobox'><span><a href='/profile?user=" + newslist[index].value.user + "'>" + newslist[index].value.user + "</a> wrote something</span></div>";

                            content += "<div class='newsbox'>" + pic + text + "</div>" + info;


                        }

                        if(newslist.length > 0){
                            document.getElementById('content').innerHTML += content;
                        }
                        

                    }
                    
                }
            };

            xhttp.open('POST', '/newsfeed/loadNextNews', true);
            xhttp.send();
      }
  }

function openPic(img){
    var image = "<img src=" + img + " />";
    document.getElementById('bigPic').innerHTML= image;
    
    $(document).ready(function(){
        $(".imgbox").click(function(){
            $("#bigPic").fadeIn(300);
            $("#bg").fadeIn(300);
        });
        
    });
}

function closePic(){
    document.getElementById('bigPic').innerHTML= '';
    
    $(document).ready(function(){
        
        $("#bg").click(function(){
            $("#bigPic").fadeOut(100);
            $("#bg").fadeOut(100);
        });
        
    });
}

function validateForm(){
    var text = document.forms['form']['newstext'].value;
    var pic = document.forms['form']['newspic'].files;
    
    if(pic.length > 5){
        document.getElementById('pmessage').innerHTML = 'It\'s not possible to upload more than 5 pictures.';
        return false;
    }
    
    var emptyPic = false;
    if(pic.length == 0){
        emptyPic = true;
    }
    
    if ((text == null || text == '') && emptyPic) {
        document.getElementById('pmessage').innerHTML = 'No field is filled.';
        return false;
    }
}

