import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Zap, RefreshCw } from 'lucide-react';
import { BrowserMultiFormatReader } from '@zxing/library';

export default function BarcodeScanner({ onScan, onClose, title = "Scan Barcode", continuous = false }) {
  const [initError, setInitError] = useState(null);
  const [scanHistory, setScanHistory] = useState([]);
  const [lastDetected, setLastDetected] = useState(null);
  const [availableCameras, setAvailableCameras] = useState([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  
  const videoRef = useRef(null);
  const codeReaderRef = useRef(null);
  const isMountedRef = useRef(true);
  const cooldownRef = useRef(false);

  // Initialize Reader and Get Cameras
  useEffect(() => {
    isMountedRef.current = true;
    codeReaderRef.current = new BrowserMultiFormatReader();
    
    const getCameras = async () => {
      try {
        const devices = await codeReaderRef.current.listVideoInputDevices();
        // Filter for cameras that look like back cameras
        const backCameras = devices.filter(d => /back|rear|environment/i.test(d.label) || d.label === '');
        setAvailableCameras(backCameras.length > 0 ? backCameras : devices);
      } catch (e) {
        setInitError("Permissions denied or no cameras found.");
      }
    };
    getCameras();

    return () => {
      isMountedRef.current = false;
      if (codeReaderRef.current) codeReaderRef.current.reset();
    };
  }, []);

  const startScanning = useCallback(async () => {
    if (!codeReaderRef.current || availableCameras.length === 0) return;
    
    try {
      // Always reset before switching
      codeReaderRef.current.reset();
      
      const selectedCamera = availableCameras[currentCameraIndex];
      const deviceId = selectedCamera?.deviceId;

      // Request High Quality
      const constraints = {
        video: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      };

      await codeReaderRef.current.decodeFromConstraints(
        constraints,
        videoRef.current,
        (result, err) => {
          if (!isMountedRef.current) return;
          if (result) {
            if (cooldownRef.current) return;
            const code = result.getText().trim();
            cooldownRef.current = true;
            if (navigator.vibrate) navigator.vibrate(200);
            setLastDetected(code);

            if (continuous) {
              setScanHistory(prev => [{ code, timestamp: Date.now() }, ...prev]);
              onScan(code);
              setTimeout(() => {
                if (isMountedRef.current) {
                  setLastDetected(null);
                  cooldownRef.current = false;
                }
              }, 600);
            } else {
              onScan(code);
              setTimeout(() => {
                if (isMountedRef.current) setLastDetected(null);
              }, 800);
            }
          }
        }
      );
    } catch (err) {
      // If HD fails, try a simpler start
      try {
         await codeReaderRef.current.decodeFromVideoDevice(availableCameras[currentCameraIndex]?.deviceId, videoRef.current, (result) => {
            if (result) onScan(result.getText());
         });
      } catch(e) {
         setInitError("Camera failed. Please refresh or try another camera.");
      }
    }
  }, [availableCameras, currentCameraIndex, onScan, continuous]);

  useEffect(() => {
    if (availableCameras.length > 0) {
      startScanning();
    }
  }, [availableCameras, currentCameraIndex, startScanning]);

  const switchCamera = () => {
    setCurrentCameraIndex((prev) => (prev + 1) % availableCameras.length);
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    const val = e.target.manualCode.value.trim();
    if (val) {
      onScan(val);
      if (continuous) e.target.manualCode.value = '';
    }
  };

  const toggleTorch = async () => {
    try {
      const track = videoRef.current?.srcObject?.getVideoTracks()[0];
      if (track) {
        const capabilities = track.getCapabilities();
        if (capabilities.torch) {
          const currentTorch = track.getSettings().torch;
          await track.applyConstraints({ advanced: [{ torch: !currentTorch }] });
        }
      }
    } catch (e) {}
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/95 backdrop-blur-md p-4">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes sweep { 0% { top: 0%; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
        .laser-sweep { animation: sweep 2.5s ease-in-out infinite; }
      `}} />

      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg relative flex flex-col h-full max-h-[90vh] overflow-hidden border border-slate-200">
        
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
          <div className="flex-1">
            <h3 className="font-black text-2xl text-slate-800">{title}</h3>
            <p className="text-blue-600 font-bold text-xs mt-1">
              {availableCameras.length > 1 ? `Lens ${currentCameraIndex + 1} of ${availableCameras.length}` : 'Scanning active'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {availableCameras.length > 1 && (
              <button 
                onClick={switchCamera}
                className="p-3 bg-blue-100 text-blue-600 rounded-xl hover:bg-blue-200 transition-all flex items-center gap-2"
              >
                <RefreshCw size={20} className="animate-spin-slow" />
                <span className="font-bold text-xs">Switch</span>
              </button>
            )}
            <button onClick={toggleTorch} className="p-3 bg-slate-200 rounded-xl"><Zap size={20} /></button>
            <button onClick={onClose} className="text-slate-500 font-bold px-4 py-2">Close</button>
          </div>
        </div>
        
        <div className="w-full flex-1 bg-black relative flex items-center justify-center min-h-[40vh] overflow-hidden">
          {lastDetected && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-green-500/80 backdrop-blur-sm">
              <div className="text-center text-white">
                <h2 className="text-2xl font-black">SCANNED!</h2>
                <p className="font-bold">{lastDetected}</p>
              </div>
            </div>
          )}

          {initError ? (
            <div className="text-red-400 font-bold text-center px-8 z-10 flex flex-col gap-4">
              <p>{initError}</p>
              <button onClick={() => window.location.reload()} className="px-6 py-3 bg-white/10 rounded-xl">Reload Page</button>
            </div>
          ) : (
            <>
              <video ref={videoRef} className="w-full h-full absolute inset-0 object-cover" autoPlay playsInline muted />
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center bg-black/40">
                <div className="w-[250px] h-[250px] border-[4px] border-white/80 rounded-2xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] flex items-center justify-center">
                  <div className="absolute left-0 right-0 h-1 bg-red-500 shadow-[0_0_20px_red] laser-sweep"></div>
                </div>
                <div className="mt-8 flex flex-col items-center gap-3">
                  <div className="px-4 py-2 bg-blue-600 text-white text-sm font-black rounded-full shadow-lg animate-bounce">
                    Move back slightly if blurry
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-6 border-t border-slate-100 bg-white">
          <form onSubmit={handleManualSubmit} className="flex gap-2 w-full">
            <input 
              type="text" name="manualCode" placeholder="Enter barcode..." 
              className="flex-1 min-w-0 px-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-black text-lg outline-none focus:border-blue-500"
            />
            <button type="submit" className="px-6 py-4 bg-slate-800 text-white font-black rounded-2xl">Add</button>
          </form>
        </div>
      </div>
    </div>
  );
}
