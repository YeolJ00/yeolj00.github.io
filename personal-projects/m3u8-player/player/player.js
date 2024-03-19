var video = document.getElementById('video');

function playM3u8(url){
  if(Hls.isSupported()) {
      video.volume = 0.3;
      var hls = new Hls();
      var m3u8Url = decodeURIComponent(url)

      const customHeaders = {
        "Accept": "*/*",
        "Accept-Language": "ko-KR,ko;q=0.8,en-US;q=0.5,en;q=0.3",
        "Accept-Encoding": "gzip, deflate, br",
        "Origin": "https://www.spotvnow.co.kr",
        "DNT": "1",
        "Connection": "keep-alive",
        "Cookie": localStorage.getItem('cookie-values'),
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-site",
        "TE": "trailers"
        };
        console.log(localStorage.getItem('cookie-values'));

        // Set up hls.js to use custom headers
        hls.config.xhrSetup = function (xhr, url) {
            for (const header in customHeaders) {
                xhr.setRequestHeader(header, customHeaders[header]);
            }
        };

      hls.loadSource(m3u8Url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED,function() {
        video.play();
      });
      document.title = url
    }
	else if (video.canPlayType('application/vnd.apple.mpegurl')) {
		video.src = url;
		video.addEventListener('canplay',function() {
		  video.play();
		});
		video.volume = 0.3;
		document.title = url;
  	}
}

function playPause() {
    video.paused?video.play():video.pause();
}

function volumeUp() {
    if(video.volume <= 0.9) video.volume+=0.1;
}

function volumeDown() {
    if(video.volume >= 0.1) video.volume-=0.1;
}

function seekRight() {
    video.currentTime+=5;
}

function seekLeft() {
    video.currentTime-=5;
}

function vidFullscreen() {
    if (video.requestFullscreen) {
      video.requestFullscreen();
  } else if (video.mozRequestFullScreen) {
      video.mozRequestFullScreen();
  } else if (video.webkitRequestFullscreen) {
      video.webkitRequestFullscreen();
    }
}

playM3u8(window.location.href.split("#")[1])
$(window).on('load', function () {
    $('#video').on('click', function(){this.paused?this.play():this.pause();});
    Mousetrap.bind('space', playPause);
    Mousetrap.bind('up', volumeUp);
    Mousetrap.bind('down', volumeDown);
    Mousetrap.bind('right', seekRight);
    Mousetrap.bind('left', seekLeft);
    Mousetrap.bind('f', vidFullscreen);
});
