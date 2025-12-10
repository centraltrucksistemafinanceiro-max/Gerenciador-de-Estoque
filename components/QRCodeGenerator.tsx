import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface QRCodeGeneratorProps {
  value: string;
  style?: React.CSSProperties;
  className?: string;
}

const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({ value, style, className }) => {
  const [src, setSrc] = useState('');

  useEffect(() => {
    if (!value) {
        setSrc('');
        return;
    }
    // Generate QR code as Data URL with high quality
    QRCode.toDataURL(value, { margin: 0, width: 500, errorCorrectionLevel: 'M' })
      .then(setSrc)
      .catch(err => {
          console.error("Error generating QR code", err);
          setSrc('');
      });
  }, [value]);

  if (!src) return null;
  
  return <img src={src} style={style} className={className} alt={`QR Code ${value}`} />;
};

export default QRCodeGenerator;