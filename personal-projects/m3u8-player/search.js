$(window).on('load', function () {
    $('#search-placeholder')[0].value = localStorage.getItem('invitation-code') || '';

    $('#search-btn').on('click', function () {
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