import jsPDF from 'jspdf';

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

export async function exportCanvasToPDF(dataURL: string, filename = 'nortaxigo'): Promise<void> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  pdf.addImage(dataURL, 'PNG', 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM);
  pdf.save(`${filename}.pdf`);
}
