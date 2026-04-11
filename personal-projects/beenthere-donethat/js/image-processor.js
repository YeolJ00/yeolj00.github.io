// ========================================
// Image Processing: client-side resize + WebP/JPEG encode
// ========================================

const FULL_MAX_DIM = 1200;
const FULL_QUALITY = 0.80;
const THUMB_MAX_DIM = 400;
const THUMB_QUALITY = 0.80;
const JPEG_QUALITY_FALLBACK = 0.82;

let _webpSupport = null;
function supportsWebP() {
    if (_webpSupport !== null) return _webpSupport;
    try {
        const c = document.createElement('canvas');
        c.width = 1;
        c.height = 1;
        _webpSupport = c.toDataURL('image/webp').startsWith('data:image/webp');
    } catch {
        _webpSupport = false;
    }
    return _webpSupport;
}

async function decodeImage(file) {
    // createImageBitmap honors EXIF orientation with `imageOrientation: 'from-image'`.
    // Falls back to <img> for browsers that don't support the option (older Safari).
    try {
        return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
        return await new Promise((resolve, reject) => {
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
            img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
            img.src = url;
        });
    }
}

function sourceDimensions(src) {
    if (src instanceof ImageBitmap) return { w: src.width, h: src.height };
    return { w: src.naturalWidth, h: src.naturalHeight };
}

function drawResized(src, maxDim) {
    const { w, h } = sourceDimensions(src);
    const scale = Math.min(1, maxDim / Math.max(w, h));
    const dw = Math.round(w * scale);
    const dh = Math.round(h * scale);
    const canvas = document.createElement('canvas');
    canvas.width = dw;
    canvas.height = dh;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(src, 0, 0, dw, dh);
    if (src instanceof ImageBitmap) src.close();
    return canvas;
}

function canvasToBlob(canvas, mime, quality) {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => blob ? resolve(blob) : reject(new Error('toBlob returned null')),
            mime,
            quality
        );
    });
}

async function encode(canvas, quality) {
    if (supportsWebP()) {
        const blob = await canvasToBlob(canvas, 'image/webp', quality);
        return { blob, ext: 'webp' };
    }
    const blob = await canvasToBlob(canvas, 'image/jpeg', JPEG_QUALITY_FALLBACK);
    return { blob, ext: 'jpg' };
}

export async function makeFullSize(file) {
    const src = await decodeImage(file);
    const canvas = drawResized(src, FULL_MAX_DIM);
    return encode(canvas, FULL_QUALITY);
}

export async function makeThumbnail(file) {
    const src = await decodeImage(file);
    const canvas = drawResized(src, THUMB_MAX_DIM);
    return encode(canvas, THUMB_QUALITY);
}

export function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

export async function dataUrlToBlob(dataUrl) {
    const res = await fetch(dataUrl);
    return res.blob();
}
