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
    // Simple heuristic - assume first URL is video for now
    // In a real implementation, you'd fetch and analyze the manifests
    showStatus('Auto-detecting stream types...', 'info');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate processing
    return url1; // Assume first is video
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