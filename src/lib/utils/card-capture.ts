/**
 * Client-side HTML-to-image capture utility.
 * Uses html2canvas (dynamically imported) to render a DOM element as a PNG.
 */

export interface CaptureResult {
  blob: Blob;
  dataUrl: string;
}

export interface CaptureOptions {
  width?: number;
  height?: number;
  scale?: number;
  backgroundColor?: string;
}

const DEFAULTS: Required<CaptureOptions> = {
  width: 1200,
  height: 630,
  scale: 2,
  backgroundColor: '#1A1A2E',
};

/**
 * Capture a DOM element as a PNG image.
 * html2canvas is dynamically imported so it never enters the main bundle.
 */
export async function captureElementAsImage(
  element: HTMLElement,
  options?: CaptureOptions
): Promise<CaptureResult> {
  const { default: html2canvas } = await import('html2canvas');

  const width = options?.width ?? DEFAULTS.width;
  const height = options?.height ?? DEFAULTS.height;
  const scale = options?.scale ?? DEFAULTS.scale;
  const backgroundColor = options?.backgroundColor ?? DEFAULTS.backgroundColor;

  const canvas = await html2canvas(element, {
    width,
    height,
    scale,
    backgroundColor,
    useCORS: false,
    logging: false,
  });

  const dataUrl = canvas.toDataURL('image/png');

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Canvas toBlob returned null'))),
      'image/png'
    );
  });

  return { blob, dataUrl };
}

/** Trigger a browser download for a Blob. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  // Cleanup after a tick so the browser can start the download
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}
