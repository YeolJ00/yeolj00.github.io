$(window).on('load', function () {
    var auth = getCookie("from-btn");
    if (auth == ""){
        window.location.href = './index.html';
    }
});


$(window).on('load', function () {
    $('#search-btn').on('click', function () {
        var div = document.getElementById("pbar");
        var table = document.getElementById("search-table");
        div.className = "progress-bar";
        div.style.width = "0%";
        table.innerHTML = "";
        for (let i = 0; i < 100; i++) {
            div.style.width = String(i)+"%";
            channel = String(i).padStart(2,'0');
            var header_list = ["ch","spt"];
            var length = header_list.length;
            for (var j = 0; j < length; j++) {
                const url = 'https://ch'+channel+'-livecdn.spotvnow.co.kr/ch'+channel
                +'/'+header_list[j]+''+channel+'.smil/chunklist_b3692000.m3u8';
                fetch(url)
                .then(function(r){
                    if(r.status =="200"){
                        ch = url.split('/')[-2]
                        var row = table.insertRow(-1);
                        row.className = "table-default"
                        row.innerHTML = "<br><a href="+'https://yeolj00.github.io/personal-projects/m3u8-player/player#'+url+">"+url+"</a>";
                    }else{
                    }
                }
                ).catch(
                );
            }
                
        }
        div.style.width = "100%";
        div.className = "progress-bar bg-success";
            
    });
});


function setCookie(cname, cvalue, exdays) {
    const d = new Date();
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    let expires = "expires="+ d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getCookie(cname) {
    let name = cname + "=";
    let decodedCookie = decodeURIComponent(document.cookie);
    let ca = decodedCookie.split(';');
    for(let i = 0; i <ca.length; i++){
        let c = ca[i];
        while (c.charAt(0) == ' '){
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0){
            return c.substring(name.length, c.length);
        }
    }
    return "";
}