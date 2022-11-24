$(window).on('load', function () {
    $('#m3u8-placeholder')[0].value = localStorage.getItem('m3u8-link') || '';
    $('#search-placeholder')[0].value = localStorage.getItem('invitation-code') || '';
    $('#play-btn').on('click', function () {
        localStorage.setItem('m3u8-link', $('#m3u8-placeholder')[0].value);
        window.location.href = './player' + '#' + $('#m3u8-placeholder')[0].value;
    });
    $('#login-btn').on('click', function () {
        localStorage.setItem('invitation-code', $('#search-placeholder')[0].value);
        if ($('#search-placeholder')[0].value != ''){
            setCookie('device-id', getMachineId(), 1)
            setCookie('from-btn', 'True', 1)
            // var div = document.getElementsByName("authenticate")[0];
            // div.submit();
            alert(getCookie('device-id'))
            window.location.href = './authenticate.php'
        }else{
            div = document.getElementsByClassName("alert")[0];
            div.style.opacity = "1";
            fadeout(div);
        }
    });
});


function fadeout(el){
    var start = 0
    let timer = setInterval(function(){
        // el.style.opacity -= 0.05;
        start += 1/100
        el.style.opacity -= swing(start);
        if (el.style.opacity < 0){
            clearInterval(timer);
            el.style.opacity = 0;
        }
    }, 100);
}

function swing(progress) {
    return 0.5 - Math.cos(progress * Math.PI) / 2;
}

function getMachineId() {
    
    let machineId = localStorage.getItem('MachineId');
    
    if (!machineId) {
        machineId = crypto.randomUUID();
        localStorage.setItem('MachineId', machineId);
    }

    return machineId;
}

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