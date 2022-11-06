$(window).on('load', function () {
    $('#m3u8-placeholder')[0].value = localStorage.getItem('m3u8-link') || '';
    $('#search-placeholder')[0].value = localStorage.getItem('invitation-code') || '';
    $('#play-btn').on('click', function () {
        localStorage.setItem('m3u8-link', $('#m3u8-placeholder')[0].value);
        window.location.href = './player' + '#' + $('#m3u8-placeholder')[0].value;
    });
    $('#login-btn').on('click', function () {
        localStorage.setItem('invidation-code', $('#search-placeholder')[0].value);
        if ($('#search-placeholder')[0].value != ''){ // Change to code
            var div = document.getElementsByName("authenticate")[0];
            div.submit();
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