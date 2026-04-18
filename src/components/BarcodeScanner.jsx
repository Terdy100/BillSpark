import React, { useEffect, useState } from 'react';

export default function BarcodeScanner({ onScan, onClose, title = "Scan Barcode" }) {
  const [initError, setInitError] = useState(null);
  const [debugDetected, setDebugDetected] = useState(null); // Visual proof state

  useEffect(() => {
    let isMounted = true;
    let html5QrCode = null;

    import('html5-qrcode').then(({ Html5Qrcode }) => {
      if (!isMounted) return;
      
      html5QrCode = new Html5Qrcode("scanner-camera");

      const config = {
        fps: 20, // max fps
        qrbox: { width: 300, height: 150 },
      };

      html5QrCode.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          if (isMounted) {
            // SHOW MASSIVE GREEN SUCCESS SCREEN INSTANTLY
            setDebugDetected(decodedText);
            if (navigator.vibrate) navigator.vibrate(200);
            
            html5QrCode.stop().then(() => {
              // Wait 1.5 seconds so user physically views validation
              setTimeout(() => {
                onScan(decodedText.trim());
              }, 1500); 
            });
          }
        },
        (errorMsg) => {
          // Ignore general tracking errors
        }
      ).catch((err) => {
        if (isMounted) setInitError(err.message || 'Camera failed to start.');
      });
    });

    return () => {
      isMounted = false;
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(() => {});
      }
    };
  }, [onScan]);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    const val = e.target.manualCode.value.trim();
    if (val) onScan(val);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/95 backdrop-blur-md p-4 animate-in fade-in">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes sweep {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .laser-sweep { animation: sweep 2.5s ease-in-out infinite; }
      `}} />

      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg relative flex flex-col h-full max-h-[90vh] overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
          <div>
            <h3 className="font-black text-2xl text-slate-800">{title}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Free Engine v3.0</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800 font-bold px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-xl transition-colors">
            Close
          </button>
        </div>
        
        {/* Camera Container */}
        <div className="w-full flex-1 bg-black relative flex items-center justify-center min-h-[40vh] overflow-hidden">
          
          {/* INSTANT VISUAL PROOF SCREEN */}
          {debugDetected && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-green-500/90 backdrop-blur-md animate-in zoom-in duration-300">
              <div className="text-center text-white scale-110">
                <h2 className="text-5xl font-black mb-4 drop-shadow-lg">DETECTED!</h2>
                <div className="bg-black/30 p-6 rounded-2xl border-4 border-white/40 backdrop-blur-xl">
                  <p className="text-4xl font-black tracking-widest">{debugDetected}</p>
                </div>
                <p className="mt-4 font-bold text-green-100 animate-pulse">Checking database...</p>
              </div>
            </div>
          )}

          {initError ? (
            <div className="text-red-400 font-bold text-center px-8 z-10">
              Camera Error: <br/> {initError}
            </div>
          ) : (
            <>
              {/* HTML5-QRCode Target */}
              <div id="scanner-camera" className="w-full h-full absolute inset-0 [&>video]:w-full [&>video]:h-full [&>video]:object-cover"></div>
              
              {/* Scan Zone UI */}
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center bg-black/40">
                <div className="w-[300px] h-[150px] border-[4px] border-white/80 rounded-2xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] flex items-center justify-center bg-transparent overflow-hidden">
                  <div className="absolute left-0 right-0 h-1 bg-red-500 shadow-[0_0_20px_rgba(239,68,68,1)] laser-sweep rounded-full"></div>
                </div>
              </div>
            </>
          )}
        </div>
        
        {/* Fallback Entry */}
        <div className="px-6 py-6 border-t border-slate-100 bg-white">
          <p className="text-slate-400 font-bold mb-3 text-xs uppercase tracking-wider text-center">Or type manually</p>
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input 
              type="text" 
              name="manualCode"
              placeholder="Enter barcode..." 
              className="flex-1 px-5 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-black text-lg text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 placeholder:font-bold placeholder:text-slate-300"
            />
            <button type="submit" className="px-8 py-4 bg-slate-800 hover:bg-slate-900 text-white font-black text-lg rounded-2xl shadow-lg transition-all active:scale-95">
              Add
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
