import jsPDF from 'jspdf';

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

/**
 * Build the A4 PDF ONCE, then either:
 *  - on touch devices that support it, open the native share sheet
 *    (iOS/Android) so the user can send it to WhatsApp, Mail, Files…
 *  - otherwise download it (desktop behaviour).
 *
 * The PDF is generated a single time and the resulting blob is reused for
 * both paths — generating it twice (output + save) was the cause of the slow
 * export.
 */
export async function exportCanvasToPDF(dataURL: string, filename = 'nortaxigo'): Promise<void> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  pdf.addImage(dataURL, 'PNG', 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM);

  const safeName = `${filename}.pdf`;
  const blob = pdf.output('blob'); // generate once
  const file = new File([blob], safeName, { type: 'application/pdf' });

  // Native share sheet on touch devices (lets you send to WhatsApp, etc.)
  const isTouch = typeof window !== 'undefined'
    && window.matchMedia?.('(pointer: coarse)').matches;
  const canShareFile = typeof navigator !== 'undefined'
    && !!navigator.canShare
    && navigator.canShare({ files: [file] });

  if (isTouch && canShareFile) {
    try {
      await navigator.share({ files: [file], title: filename });
      return;
    } catch (e) {
      if ((e as Error).name === 'AbortError') return; // user dismissed
      // otherwise fall through to download
    }
  }

  // Download the already-generated blob (no second generation)
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = safeName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
