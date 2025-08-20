const form = document.getElementById('streamForm');
const status = document.getElementById('status');
const processBtn = document.getElementById('processBtn');
const btnText = document.getElementById('btnText');

form.addEventListener('submit', async function (e) {
    e.preventDefault();
    const url1 = document.getElementById('url1').value.trim();
    const url2 = document.getElementById('url2').value.trim();
    
    if (!url1 || !url2) {
        showStatus('Please enter both stream URLs', 'error');
        return;
    }
    
    // Show loading state
    processBtn.disabled = true;
    btnText.innerHTML = '<span class="spinner"></span>Processing...';
    showStatus('Analyzing streams...', 'info');
    
    try {
        // Detect stream types
        const videoUrl = await detectStreamType(url1, url2);
        const audioUrl = videoUrl === url1 ? url2 : url1;
        
        showStatus('Creating combined playlist...', 'info');
        
        // Create combined M3U8
        const playlist = createCombinedM3U8(videoUrl, audioUrl);
        
        // Create download
        const blob = new Blob([playlist], { type: 'application/vnd.apple.mpegurl' });
        const url = URL.createObjectURL(blob);
        
        // Create download link
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = 'coupang_stream.m3u8';
        downloadLink.className = 'download-link';
        downloadLink.textContent = 'Download Stream Playlist';
        
        // Use the new success function instead of the old approach
        showSuccessWithDownload('Stream playlist created successfully!', downloadLink);
        
        // Auto-trigger download on mobile/desktop
        if (isMobile()) {
            setTimeout(() => downloadLink.click(), 1000);
        } else {
            setTimeout(() => downloadLink.click(), 500);
        }
        
    } catch (error) {
        console.error('Error:', error);
        showStatus('❌ Error processing streams: ' + error.message, 'error');
    } finally {
        // Reset button
        processBtn.disabled = false;
        btnText.innerHTML = '🚀 Create Stream';
    }
});

function showSuccessWithDownload(message, downloadLink) {
    // First show the success message
    showStatus(message, 'success');
    
    // Create success container for the download button
    const successContainer = document.createElement('div');
    successContainer.className = 'success-container';
    successContainer.appendChild(downloadLink);
    
    // Insert after status with a slight delay for better UX
    setTimeout(() => {
        status.parentNode.insertBefore(successContainer, status.nextSibling);
    }, 300);
}

function showStatus(message, type) {
    status.textContent = message;
    status.className = `status ${type} show`;
    
    // Clear any existing download containers (not just links in status)
    const existingContainers = document.querySelectorAll('.success-container');
    existingContainers.forEach(container => container.remove());
    
    // Clear any existing download links in status
    const existingLinks = status.querySelectorAll('.download-link');
    existingLinks.forEach(link => link.remove());
}

async function detectStreamType(url1, url2) {
    try {
        showStatus('Fetching and analyzing manifests...', 'info');
        
        // Fetch both manifests
        const [type1, type2] = await Promise.all([
            analyzeStreamType(url1),
            analyzeStreamType(url2)
        ]);
        
        console.log(`Stream 1: ${type1}`);
        console.log(`Stream 2: ${type2}`);
        
        if (type1 === "video" && type2 === "audio") {
            return url1; // First URL is video
        } else if (type1 === "audio" && type2 === "video") {
            return url2; // Second URL is video
        } else {
            console.log("Could not determine stream types, using first as video");
            showStatus('Could not auto-detect stream types, assuming first URL is video', 'warning');
            return url1;
        }
    } catch (error) {
        console.error('Error detecting stream types:', error);
        showStatus('Error analyzing streams, assuming first URL is video', 'warning');
        return url1;
    }
}

async function analyzeStreamType(manifestUrl) {
    try {
        // Set up headers to match the Python implementation
        const response = await fetch(manifestUrl, {
            // headers: {
            //     'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
            //     'Accept': '*/*',
            //     'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
            //     'Accept-Encoding': 'gzip, deflate, br, zstd',
            //     'Origin': 'https://www.coupangplay.com',
            //     'Referer': 'https://www.coupangplay.com/',
            //     'Sec-Ch-Ua': '"Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"',
            //     'Sec-Ch-Ua-Mobile': '?0',
            //     'Sec-Ch-Ua-Platform': '"Windows"',
            //     'Sec-Fetch-Dest': 'empty',
            //     'Sec-Fetch-Mode': 'cors',
            //     'Sec-Fetch-Site': 'cross-site'
            // }
        });
        
        if (!response.ok) {
            console.error(`Failed to fetch manifest: ${response.status}`);
            return "unknown";
        }
        
        const manifest = await response.text();
        const manifestLower = manifest.toLowerCase();
        
        // Check for audio-specific indicators
        const audioIndicators = ['audio'];
        
        // Check for video-specific indicators  
        const videoIndicators = ['video'];
        
        const audioScore = audioIndicators.filter(indicator => 
            manifestLower.includes(indicator)).length;
        const videoScore = videoIndicators.filter(indicator => 
            manifestLower.includes(indicator)).length;
        
        if (audioScore > videoScore) {
            return "audio";
        } else if (videoScore > audioScore) {
            return "video";
        } else {
            return "unknown";
        }
        
    } catch (error) {
        console.error(`Error fetching manifest: ${error}`);
        return "unknown";
    }
}
function createCombinedM3U8(videoUrl, audioUrl) {
    return `#EXTM3U
#EXT-X-VERSION:6
#EXT-X-INDEPENDENT-SEGMENTS
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",NAME="Korean",DEFAULT=YES,AUTOSELECT=YES,LANGUAGE="ko",URI="${audioUrl}"
#EXT-X-STREAM-INF:BANDWIDTH=1500000,RESOLUTION=1280x720,AUDIO="audio"
${videoUrl}
`;
}

function clearForm() {
    document.getElementById('url1').value = '';
    document.getElementById('url2').value = '';
    status.className = 'status';
    status.textContent = '';
    
    // Also clear success containers
    const existingContainers = document.querySelectorAll('.success-container');
    existingContainers.forEach(container => container.remove());
}

function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Auto-focus first input on desktop
if (!isMobile()) {
    document.getElementById('url1').focus();
}