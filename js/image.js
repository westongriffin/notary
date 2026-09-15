// Client-side image preparation. Firebase Storage needs the paid Blaze plan,
// so images are stored in Firestore as JPEG data URLs, shrunk to fit the
// 1 MiB document limit with room to spare.

export const IMAGE_MAX_CHARS = 900000;

export async function fileToJpegDataUrl(file, { maxSide = 1600, maxChars = IMAGE_MAX_CHARS } = {}) {
  if (!file) throw new Error('Choose an image file.');
  if (file.type && !file.type.startsWith('image/')) {
    throw new Error('Choose an image file (JPG, PNG, or a photo). PDFs are not supported; take a photo or screenshot instead.');
  }
  const img = await loadImage(file);
  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;
  if (!srcW || !srcH) throw new Error('That file does not look like a readable image.');

  let scale = Math.min(1, maxSide / Math.max(srcW, srcH));
  let quality = 0.85;
  for (let attempt = 0; attempt < 10; attempt++) {
    const width = Math.max(1, Math.round(srcW * scale));
    const height = Math.max(1, Math.round(srcH * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff'; // flatten transparency (PNG) onto white
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    if (dataUrl.length <= maxChars) return { dataUrl, width, height };
    if (quality > 0.6) quality -= 0.1;
    else scale *= 0.8;
  }
  throw new Error('Could not shrink the image enough. Try a smaller or lower-resolution photo.');
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read that image. Try a JPG or PNG.')); };
    img.src = url;
  });
}
