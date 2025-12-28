
import React, { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

declare global {
  interface Window {
    jsQR: any;
  }
}

const QRScanner: React.FC<QRScannerProps> = ({ onScan, onClose }) => {
  const { t } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  const [status, setStatus] = useState('READY');

  useEffect(() => {
    let stream: MediaStream | null = null;
    let animationFrameId: number;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute("playsinline", "true");
          videoRef.current.play();
          setStatus('CALIBRATING');
          setTimeout(() => setStatus('SCANNING'), 1000);
          requestAnimationFrame(tick);
        }
      } catch (err) {
        console.error("Camera access error:", err);
        setError(t('cameraPermissionError'));
      }
    };

    const tick = () => {
      if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA && canvasRef.current) {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          
          if (window.jsQR) {
            const code = window.jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: "dontInvert",
            });

            if (code) {
              setStatus('LOCKED');
              setTimeout(() => {
                onScan(code.data);
                setIsScanning(false);
              }, 600);
              return;
            }
          }
        }
      }
      if (isScanning) {
        animationFrameId = requestAnimationFrame(tick);
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      cancelAnimationFrame(animationFrameId);
    };
  }, [onScan, t, isScanning]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-brand-dark/95 backdrop-blur-xl p-4 animate-fade-in overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-20">
         <div className="absolute top-10 left-10 w-20 h-20 border-t-2 border-l-2 border-brand-primary"></div>
         <div className="absolute top-10 right-10 w-20 h-20 border-t-2 border-r-2 border-brand-primary"></div>
         <div className="absolute bottom-10 left-10 w-20 h-20 border-b-2 border-l-2 border-brand-primary"></div>
         <div className="absolute bottom-10 right-10 w-20 h-20 border-b-2 border-r-2 border-brand-primary"></div>
      </div>

      <div className="relative w-full max-w-2xl bg-black rounded-[40px] overflow-hidden shadow-[0_0_100px_rgba(45,137,229,0.2)] border border-white/10 group">
        <div className="p-8 bg-brand-dark/80 backdrop-blur-md text-white flex justify-between items-center border-b border-white/5 relative z-10">
          <div className="flex items-center gap-6">
             <div className="relative">
                <div className={`w-14 h-14 rounded-2xl bg-brand-primary/20 border border-brand-primary flex items-center justify-center shadow-[0_0_20px_rgba(45,137,229,0.4)] ${status === 'SCANNING' ? 'animate-pulse' : ''}`}>
                   <svg className="w-8 h-8 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1l-3 3h2v5h2V8h2l-3-3V4zM4 12v7a2 2 0 002 2h12a2 2 0 002-2v-7" />
                   </svg>
                </div>
             </div>
             <div>
                <h3 className="font-heading font-black text-2xl tracking-tight uppercase">{t('scanQR')}</h3>
                <div className="flex items-center gap-2 mt-1">
                   <span className="text-[10px] font-mono text-brand-primary font-bold uppercase tracking-[0.2em]">System Status:</span>
                   <span className={`text-[10px] font-mono font-black uppercase tracking-[0.2em] ${status === 'LOCKED' ? 'text-green-500' : 'text-slate-400'}`}>{status}</span>
                </div>
             </div>
          </div>
          <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/10 text-slate-400 hover:text-white group">
            <svg className="w-6 h-6 group-hover:rotate-90 transition-transform duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="relative aspect-video bg-black overflow-hidden group">
          {error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center text-white">
               <div className="w-20 h-20 bg-red-500/20 border border-red-500 rounded-full flex items-center justify-center mb-6 text-4xl animate-bounce">⚠️</div>
               <p className="font-bold text-xl uppercase tracking-widest">{error}</p>
               <button onClick={onClose} className="mt-8 px-8 py-3 bg-white/10 border border-white/20 rounded-xl font-bold uppercase text-xs">Acknowledge</button>
            </div>
          ) : (
            <>
              <video ref={videoRef} className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${status === 'READY' ? 'opacity-0' : 'opacity-60'}`} />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute inset-0 pointer-events-none">
                 <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-72 h-72 relative">
                        <div className={`absolute -top-4 -left-4 w-12 h-12 border-t-4 border-l-4 rounded-tl-3xl transition-all duration-500 ${status === 'LOCKED' ? 'border-green-500 scale-110 shadow-[0_0_20px_#22c55e]' : 'border-brand-primary'}`}></div>
                        <div className={`absolute -top-4 -right-4 w-12 h-12 border-t-4 border-r-4 rounded-tr-3xl transition-all duration-500 ${status === 'LOCKED' ? 'border-green-500 scale-110 shadow-[0_0_20px_#22c55e]' : 'border-brand-primary'}`}></div>
                        <div className={`absolute -bottom-4 -left-4 w-12 h-12 border-b-4 border-l-4 rounded-bl-3xl transition-all duration-500 ${status === 'LOCKED' ? 'border-green-500 scale-110 shadow-[0_0_20px_#22c55e]' : 'border-brand-primary'}`}></div>
                        <div className={`absolute -bottom-4 -right-4 w-12 h-12 border-b-4 border-r-4 rounded-br-3xl transition-all duration-500 ${status === 'LOCKED' ? 'border-green-500 scale-110 shadow-[0_0_20px_#22c55e]' : 'border-brand-primary'}`}></div>
                        <div className={`absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-brand-primary to-transparent shadow-[0_0_20px_#2d89e5] ${status === 'SCANNING' ? 'animate-[scan-move_2.5s_ease-in-out_infinite]' : 'hidden'}`}></div>
                    </div>
                 </div>
              </div>
            </>
          )}
        </div>

        <div className="p-8 bg-brand-dark/95 border-t border-white/10 flex items-center justify-center">
           <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">{t('pointCamera')}</p>
        </div>
      </div>
      <style>{`
        @keyframes scan-move {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default QRScanner;
