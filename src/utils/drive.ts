export function getGoogleDriveImageUrl(url: string): string {
  if (!url) return url;

  // If already a direct image URL, return unchanged
  if (url.includes('/uc?export=view&id=')) return url;

  let fileId: string | null = null;

  try {
    // 1. https://drive.google.com/file/d/FILE_ID/view
    const fileDMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileDMatch) {
      fileId = fileDMatch[1];
    } else {
      // 2, 3, 4. Handle query parameters (open?id=..., uc?id=..., uc?export=view&id=...)
      const urlObj = new URL(url);
      fileId = urlObj.searchParams.get('id');
    }
  } catch (e) {
    // If URL parsing fails, it might be a raw FILE_ID
    if (/^[a-zA-Z0-9_-]+$/.test(url)) {
      fileId = url;
    }
  }

  if (fileId) {
    return `https://drive.google.com/uc?export=view&id=${fileId}`;
  }

  return url;
}
