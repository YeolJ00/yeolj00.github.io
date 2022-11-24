$(window).on('load', function () {
    $('#search-btn').on('click', function () {
        var div = document.getElementById("pbar");
        var table = document.getElementById("search-table");
        for (let i = 0; i < 100; i++) {
            div.style.width = i+"%";
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
                        }
                    }
                    ).catch(
                        
                    );
            }

        }
        div.style.width = "100%";
    });
});

