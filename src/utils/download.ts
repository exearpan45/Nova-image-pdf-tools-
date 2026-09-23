import JSZip from 'jszip';

export function triggerDownload(url: string, filename: string): void {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  triggerDownload(url, filename);
  // Revoke object URL after browser starts downloading
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 15000);
}

export async function downloadFilesAsZip(
  files: Array<{ name: string; blob: Blob }>,
  zipFilename: string,
  onProgress?: (percent: number) => void,
): Promise<void> {
  const zip = new JSZip();

  files.forEach((file, index) => {
    // Prevent name collisions
    const safeName = file.name || `file_${index + 1}`;
    zip.file(safeName, file.blob);
  });

  const zipBlob = await zip.generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    },
    (metadata) => {
      if (onProgress) {
        onProgress(Math.round(metadata.percent));
      }
    },
  );

  downloadBlob(zipBlob, zipFilename.endsWith('.zip') ? zipFilename : `${zipFilename}.zip`);
}
