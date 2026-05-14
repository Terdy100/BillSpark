import React, { useEffect, useState, useRef } from 'react';
import { Zap, RefreshCw, X } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

export default function BarcodeScanner({ onScan, onClose, title = "Scan Barcode", continuous = false }) {
  const [initError, setInitError] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [lastDetected, setLastDetected] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [currentCameraId, setCurrentCameraId] = useState(null);
  const [lastScannedCode, setLastScannedCode] = useState(null);
  const [lastScannedTime, setLastScannedTime] = useState(0);
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  
  const scannerRef = useRef(null);
  // Use a stable ID that doesn't change on re-render to prevent losing the DOM reference
  const containerId = useRef("scanner-container-" + Math.random().toString(36).substr(2, 11)).current;

  useEffect(() => {
    Html5Qrcode.getCameras().then(devices => {
      if (devices && devices.length > 0) {
        setCameras(devices);
        const back = devices.find(d => /back|rear|environment/i.test(d.label));
        const savedId = localStorage.getItem('billspark_camera_id');
        const initialId = savedId || (back ? back.id : devices[0].id);
        setCurrentCameraId(initialId);
      } else {
        setInitError("No cameras found.");
      }
    }).catch(() => {
      setInitError("Camera permission denied.");
    });

    return () => {
      stopScanner();
    };
  }, []);

  useEffect(() => {
    if (currentCameraId) {
      startScanner(currentCameraId);
    }
  }, [currentCameraId]);

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
        setIsScanning(false);
        setHasTorch(false);
        setTorchOn(false);
      } catch (err) {
        console.error("Failed to stop scanner", err);
      }
    }
  };

  const handleSuccess = (text) => {
    const now = Date.now();
    // 2.0 second cooldown for the SAME barcode to prevent duplicates (aligned with UI)
    if (lastScannedCode === text && (now - lastScannedTime) < 2000) {
      return;
    }
    
    if (navigator.vibrate) navigator.vibrate(200);
    setLastScannedCode(text);
    setLastScannedTime(now);
    setLastDetected(text);
    onScan(text);

    if (!continuous) {
      setTimeout(() => onClose(), 800);
    } else {
      setTimeout(() => setLastDetected(null), 1200);
    }
  };

  const startScanner = async (cameraId) => {
    if (scannerRef.current) {
      await stopScanner();
    }

    const html5QrCode = new Html5Qrcode(containerId);
    scannerRef.current = html5QrCode;

    const config = {
      fps: 30, 
      qrbox: (viewfinderWidth, viewfinderHeight) => {
          const width = viewfinderWidth * 0.85;
          const height = Math.min(viewfinderHeight * 0.5, 250);
          return { width, height };
      },
      aspectRatio: 1.7777777778, // Force 16:9 which is the most stable aspect ratio for iOS Safari
      disableFlip: true,
      experimentalFeatures: {
        useBarCodeDetectorIfSupported: false // DISABLED: Often reports "true" on iOS but fails to return results
      },
      formatsToSupport: [
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.ITF
      ]
    };

    try {
      setIsScanning(true);
      
      // On iOS, we MUST stop any previous stream explicitly before starting a new one
      if (scannerRef.current && scannerRef.current.isScanning) {
        await scannerRef.current.stop();
      }

      await html5QrCode.start(
        cameraId,
        config,
        (decodedText) => handleSuccess(decodedText),
        () => {} 
      );

      // Attempt to detect torch and force focus constraints
      try {
        const capabilities = html5QrCode.getRunningTrackCapabilities();
        setHasTorch(!!capabilities.torch);
        
        // Force continuous focus if supported (Fixes blurry scanning on many iPhones)
        if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
           await html5QrCode.applyVideoConstraints({
             focusMode: 'continuous',
             advanced: [{ focusMode: 'continuous' }]
           });
        }
      } catch (e) {
        console.log("Extended capabilities not supported");
      }
    } catch (err) {
      setInitError("Camera error. Please switch lenses or reload.");
      setIsScanning(false);
    }
  };

  const toggleTorch = async () => {
    if (scannerRef.current && hasTorch) {
      try {
        const nextState = !torchOn;
        await scannerRef.current.applyVideoConstraints({
          torch: nextState
        });
        setTorchOn(nextState);
      } catch (err) {
        console.warn("Torch toggle failed", err);
      }
    }
  };

  const switchCamera = async () => {
    if (cameras.length < 2) return;
    const currentIndex = cameras.findIndex(c => c.id === currentCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextId = cameras[nextIndex].id;
    
    // Force a complete stop of the current scanner before switching
    await stopScanner();
    
    setCurrentCameraId(nextId);
    localStorage.setItem('billspark_camera_id', nextId);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/95 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg relative flex flex-col h-full max-h-[90vh] overflow-hidden border border-slate-200">
        
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
          <div className="flex-1">
            <h3 className="font-black text-2xl text-slate-800">{title}</h3>
            <p className="text-blue-600 font-bold text-xs mt-1 uppercase tracking-widest">
              AI SCAN ENGINE ACTIVE
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasTorch && (
              <button 
                onClick={toggleTorch} 
                className={`p-3 rounded-xl transition-all ${torchOn ? 'bg-yellow-400 text-white shadow-lg shadow-yellow-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
              >
                <Zap size={20} fill={torchOn ? "currentColor" : "none"} />
              </button>
            )}
            {cameras.length > 1 && (
              <button onClick={switchCamera} className="p-3 bg-blue-100 text-blue-600 rounded-xl hover:bg-blue-200 transition-colors">
                <RefreshCw size={20} />
              </button>
            )}
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-800 transition-colors">
              <X size={28} />
            </button>
          </div>
        </div>
        
        <div className="w-full flex-1 bg-black relative flex items-center justify-center overflow-hidden">
          {lastDetected && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-green-500/80 backdrop-blur-sm">
              <div className="text-center text-white p-6">
                <h2 className="text-3xl font-black mb-2">SCANNED!</h2>
                <p className="text-xl font-bold bg-black/20 py-2 px-4 rounded-xl">{lastDetected}</p>
              </div>
            </div>
          )}

          {initError ? (
            <div className="text-red-400 font-bold text-center px-8 z-10">
              <p className="mb-4">{initError}</p>
              <button onClick={() => window.location.reload()} className="px-6 py-3 bg-white/10 rounded-xl">Reload</button>
            </div>
          ) : (
            <div id={containerId} className="w-full h-full min-h-[300px]"></div>
          )}
        </div>

        <div className="p-6 bg-white border-t border-slate-100">
           <div className="flex flex-col items-center gap-2">
              <div className="px-4 py-1.5 bg-blue-50 text-blue-600 text-[10px] font-black rounded-full uppercase tracking-widest">
                Safe-Scan Enabled: 2s Cooldown
              </div>
              <p className="text-slate-400 font-bold text-xs text-center">
                Keep phone 15cm away for best focus.
              </p>
           </div>
        </div>
      </div>
    </div>
  );
}
