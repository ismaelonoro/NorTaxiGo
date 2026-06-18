import QRCode from 'qrcode';

export async function generateQRDataURL(
  url: string,
  size = 300,
  darkColor = '#000000',
  lightColor = '#ffffff'
): Promise<string> {
  return QRCode.toDataURL(url, {
    width: size,
    margin: 1,
    color: { dark: darkColor, light: lightColor },
    errorCorrectionLevel: 'H',
  });
}
