import jsPDF from 'jspdf';

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

/**
 * Build the A4 PDF and either:
 *  - on touch devices that support it, open the native share sheet
 *    (iOS/Android) so the user can send it straight to WhatsApp, Mail, etc.
 *  - otherwise fall back to a classic file download (desktop behaviour).
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
  const blob = pdf.output('blob');
  const file = new File([blob], safeName, { type: 'application/pdf' });

  // Use the native share sheet on touch devices (lets you send to WhatsApp).
  // Keep the classic download on desktop, where that's the expected behaviour.
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
      // User dismissed the share sheet — don't also trigger a download
      if ((e as Error).name === 'AbortError') return;
      // Any other failure: fall through to download
    }
  }

  pdf.save(safeName);
}
