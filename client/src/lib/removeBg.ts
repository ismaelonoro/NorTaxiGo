import { removeBackground, type Config } from '@imgly/background-removal';

function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
    reader.readAsDataURL(blob);
  });
}

// Use WebGPU only if there's a real, usable adapter (not just the API present)
async function pickDevice(): Promise<'gpu' | 'cpu'> {
  try {
    const gpu = (navigator as unknown as { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
    if (gpu?.requestAdapter) {
      const adapter = await gpu.requestAdapter();
      if (adapter) return 'gpu';
    }
  } catch {
    /* fall through to cpu */
  }
  return 'cpu';
}

/**
 * Remove the background of an image (runs entirely in the browser). Returns a
 * transparent PNG data URL plus the device actually used. Model assets download
 * once and are cached afterwards.
 */
export async function removeImageBackground(src: string): Promise<{ dataURL: string; device: 'gpu' | 'cpu' }> {
  const device = await pickDevice();
  console.log(`[NorTaxiGo] Quitar fondo → dispositivo: ${device}`);
  const config: Config = {
    device,
    model: 'isnet_fp16',
    output: { format: 'image/png' },
  };
  const blob = await removeBackground(src, config);
  const dataURL = await blobToDataURL(blob);
  return { dataURL, device };
}
