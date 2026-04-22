import React, { useEffect, useState, useRef, useCallback } from 'react';

export default function BarcodeScanner({ onScan, onClose, title = "Scan Barcode", continuous = false }) {
  const [initError, setInitError] = useState(null);
  const [scanHistory, setScanHistory] = useState([]); // Track all scans in continuous mode
  const [lastDetected, setLastDetected] = useState(null); // Current flash feedback
  const scannerRef = useRef(null);
  const isMountedRef = useRef(true);
  const cooldownRef = useRef(false); // Prevent rapid duplicate scans

  const startScanning = useCallback((html5QrCode) => {
    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0,
      rememberLastUsedCamera: true,
      experimentalFeatures: {
        useBarCodeDetectorIfSupported: true
      },
      supportedScanTypes: [0]
    };

    html5QrCode.start(
      { facingMode: "environment" },
      config,
      (decodedText) => {
        if (!isMountedRef.current || cooldownRef.current) return;

        const code = decodedText.trim();
        
        // Cooldown to prevent the same barcode being scanned 10x in 1 second
        cooldownRef.current = true;

        // Vibrate + show feedback
        if (navigator.vibrate) navigator.vibrate(200);
        setLastDetected(code);

        if (continuous) {
          // In continuous mode: add to history, fire callback, then resume after brief flash
          setScanHistory(prev => [{ code, timestamp: Date.now() }, ...prev]);
          onScan(code);

          // Clear the flash after 600ms, allow next scan
          setTimeout(() => {
            if (isMountedRef.current) {
              setLastDetected(null);
              cooldownRef.current = false;
            }
          }, 600);
        } else {
          // Fire callback immediately and show brief flash
          setLastDetected(code);
          onScan(code);
          setTimeout(() => {
            if (isMountedRef.current) setLastDetected(null);
          }, 800);
        }
      },
      (errorMsg) => {
        // Ignore general tracking errors
      }
    ).catch((err) => {
      if (isMountedRef.current) setInitError(err.message || 'Camera failed to start.');
    });
  }, [onScan, continuous]);

  useEffect(() => {
    isMountedRef.current = true;
    let html5QrCode = null;

    import('html5-qrcode').then(({ Html5Qrcode }) => {
      if (!isMountedRef.current) return;
      
      html5QrCode = new Html5Qrcode("scanner-camera");
      scannerRef.current = html5QrCode;
      startScanning(html5QrCode);
    });

    return () => {
      isMountedRef.current = false;
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(() => {});
      }
    };
  }, [startScanning]);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    const val = e.target.manualCode.value.trim();
    if (val) {
      if (continuous) {
        setScanHistory(prev => [{ code: val, timestamp: Date.now() }, ...prev]);
        onScan(val);
        e.target.manualCode.value = '';
      } else {
        onScan(val);
      }
    }
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
        @keyframes flashIn {
          0% { transform: scale(0.8); opacity: 0; }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); opacity: 1; }
        }
        .flash-in { animation: flashIn 0.3s ease-out; }
        @keyframes slideUp {
          from { transform: translateY(10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .slide-up { animation: slideUp 0.3s ease-out; }
      `}} />

      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg relative flex flex-col h-full max-h-[90vh] overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
          <div>
            <h3 className="font-black text-2xl text-slate-800">{title}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">
                {continuous ? 'Continuous Mode — Keep Scanning' : 'Free Engine v3.0'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {continuous && scanHistory.length > 0 && (
              <span className="px-3 py-1.5 bg-blue-100 text-blue-700 font-black rounded-full text-sm">
                {scanHistory.length}
              </span>
            )}
            <button 
              onClick={async () => {
                try {
                  const state = scannerRef.current.getTorchState();
                  await scannerRef.current.applyVideoConstraints({ focusMode: "continuous", torch: !state });
                } catch (e) {
                  console.warn("Torch not supported", e);
                }
              }}
              className="p-3 bg-slate-200 hover:bg-yellow-100 text-slate-600 hover:text-yellow-600 rounded-xl transition-all"
              title="Toggle Flash"
            >
              <Zap size={20} />
            </button>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-800 font-bold px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-xl transition-colors">
              {continuous ? 'Done' : 'Close'}
            </button>
          </div>
        </div>
        
        {/* Camera Container */}
        <div className="w-full flex-1 bg-black relative flex items-center justify-center min-h-[40vh] overflow-hidden">
          
          {/* SCAN FEEDBACK FLASH (continuous mode — quick green flash with code) */}
          {lastDetected && continuous && (
            <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none flash-in">
              <div className="absolute inset-0 bg-green-500/30 backdrop-blur-[2px]"></div>
              <div className="relative text-center z-10">
                <div className="bg-green-500 text-white px-8 py-4 rounded-2xl shadow-2xl border-2 border-white/40">
                  <p className="text-xl font-black tracking-wide">✓ SCANNED</p>
                  <p className="text-lg font-bold mt-1 opacity-90">{lastDetected}</p>
                </div>
              </div>
            </div>
          )}

          {lastDetected && !continuous && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-green-500/80 backdrop-blur-sm animate-in zoom-in duration-150">
              <div className="text-center text-white">
                <h2 className="text-3xl font-black mb-2 uppercase">Detected</h2>
                <div className="bg-black/20 px-6 py-3 rounded-2xl border-2 border-white/40">
                  <p className="text-2xl font-black">{lastDetected}</p>
                </div>
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
                <div className="w-[250px] h-[250px] border-[4px] border-white/80 rounded-2xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] flex items-center justify-center bg-transparent overflow-hidden">
                  <div className="absolute left-0 right-0 h-1 bg-red-500 shadow-[0_0_20px_rgba(239,68,68,1)] laser-sweep rounded-full"></div>
                </div>
                {continuous && (
                  <p className="mt-4 text-white/80 font-bold text-sm bg-black/50 px-4 py-2 rounded-full">
                    Point at next item — scanning continuously
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Scan History (continuous mode) */}
        {continuous && scanHistory.length > 0 && (
          <div className="max-h-[120px] overflow-auto border-t border-slate-100 bg-green-50/50">
            <div className="px-4 py-2 space-y-1">
              {scanHistory.slice(0, 10).map((scan, i) => (
                <div key={scan.timestamp + i} className="flex items-center justify-between text-sm py-1.5 px-3 rounded-lg bg-white/60 slide-up">
                  <span className="font-bold text-slate-700">✓ {scan.code}</span>
                  <span className="text-slate-400 text-xs font-bold">just now</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Fallback Entry */}
        <div className="px-6 py-6 border-t border-slate-100 bg-white">
          <p className="text-slate-400 font-bold mb-3 text-xs uppercase tracking-wider text-center">Or type manually</p>
          <form onSubmit={handleManualSubmit} className="flex gap-2 w-full overflow-hidden">
            <input 
              type="text" 
              name="manualCode"
              placeholder="Enter barcode..." 
              className="flex-1 min-w-0 px-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-black text-lg text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 placeholder:font-bold placeholder:text-slate-300"
            />
            <button type="submit" className="flex-shrink-0 px-6 sm:px-8 py-4 bg-slate-800 hover:bg-slate-900 text-white font-black text-lg rounded-2xl shadow-lg transition-all active:scale-95">
              Add
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
