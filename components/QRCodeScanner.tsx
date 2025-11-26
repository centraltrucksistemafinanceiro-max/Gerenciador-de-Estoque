import React, { useEffect, useRef, useState } from 'react';

interface QRCodeScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

const QRCodeScanner: React.FC<QRCodeScannerProps> = ({ onScan, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let animationFrameId: number | null = null;

    const startScan = async () => {
      // BarcodeDetector is not available in all browsers and might not be typed in TypeScript's default libs
      if (!('BarcodeDetector' in window)) {
        setError('A leitura de QR code não é suportada neste navegador.');
        return;
      }
      const BarcodeDetector = (window as any).BarcodeDetector;

      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();

          const barcodeDetector = new BarcodeDetector({ formats: ['qr_code'] });

          const detect = async () => {
            if (videoRef.current && videoRef.current.readyState === 4) { // HAVE_ENOUGH_DATA
              const barcodes = await barcodeDetector.detect(videoRef.current);
              if (barcodes.length > 0) {
                // Stop scanning once a code is found
                if (stream) {
                    stream.getTracks().forEach(track => track.stop());
                }
                if(animationFrameId) {
                    cancelAnimationFrame(animationFrameId);
                }
                onScan(barcodes[0].rawValue);
              } else {
                 animationFrameId = requestAnimationFrame(detect);
              }
            } else {
                animationFrameId = requestAnimationFrame(detect);
            }
          };
          detect();
        }
      } catch (err) {
        console.error("Camera Error:", err);
        if (err instanceof DOMException && err.name === 'NotAllowedError') {
            setError('Permissão para acessar a câmera foi negada. Por favor, habilite nas configurações do seu navegador.');
        } else {
            setError('Não foi possível acessar a câmera. Verifique se ela não está sendo usada por outro aplicativo.');
        }
      }
    };

    startScan();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center animate-fade-in">
        <video ref={videoRef} className="absolute top-0 left-0 w-full h-full object-cover"></video>
        
        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center z-10 pointer-events-none">
            <div className="w-3/4 max-w-xs aspect-square border-4 border-dashed border-white/50 rounded-lg"></div>
        </div>

        <div className="absolute top-5 right-5 z-20">
            <button onClick={onClose} className="bg-white/20 text-white rounded-full p-3 hover:bg-white/30 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>

        <div className="absolute bottom-0 left-0 w-full p-4 bg-black/50 text-center z-10">
            {error ? (
                <p className="text-red-400 font-semibold">{error}</p>
            ) : (
                <p className="text-white">Aponte a câmera para o QR Code</p>
            )}
        </div>
    </div>
  );
};

export default QRCodeScanner;
