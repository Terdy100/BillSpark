import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, Zap, RefreshCw, X, Image as ImageIcon } from 'lucide-react';

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
  const [isPhotoScanning, setIsPhotoScanning] = useState(false);
  
  const scannerRef = useRef(null);
  const fileInputRef = useRef(null);
  const containerId = "scanner-container-" + Math.random().toString(36).substr(2, 9);

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
    if (currentCameraId && !isScanning) {
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
    // 2.0 second cooldown for the SAME barcode to prevent duplicates
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
      fps: 20, 
      qrbox: (viewfinderWidth, viewfinderHeight) => {
          // Wider box for 1D barcodes
          const width = viewfinderWidth * 0.85;
          const height = viewfinderHeight * 0.4;
          return { width, height };
      },
      aspectRatio: undefined,
      experimentalFeatures: {
        useBarCodeDetectorIfSupported: true 
      },
      formatsToSupport: [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.QR_CODE
      ]
    };

    try {
      setIsScanning(true);
      
      // Use facingMode: environment initially for iOS lens optimization
      const target = cameraId ? cameraId : { facingMode: "environment" };
      
      await html5QrCode.start(
        target,
        config,
        (decodedText) => handleSuccess(decodedText),
        () => {} 
      );

      try {
        const capabilities = html5QrCode.getRunningTrackCapabilities();
        setHasTorch(!!capabilities.torch);
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
      console.error("Scanner start error:", err);
      setInitError("Camera error. Try 'Scan Photo' below.");
      setIsScanning(false);
    }
  };

  const handlePhotoScan = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsPhotoScanning(true);
    const html5QrCode = new Html5Qrcode(containerId);
    
    try {
      const result = await html5QrCode.scanFile(file, true);
      handleSuccess(result);
    } catch (err) {
      alert("No barcode found in photo. Please ensure it's clear and well-lit.");
    } finally {
      setIsPhotoScanning(false);
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

  const switchCamera = () => {
    if (cameras.length < 2) return;
    const currentIndex = cameras.findIndex(c => c.id === currentCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextId = cameras[nextIndex].id;
    setCurrentCameraId(nextId);
    localStorage.setItem('billspark_camera_id', nextId);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/95 backdrop-blur-md p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg relative flex flex-col h-full max-h-[90vh] overflow-hidden border border-slate-200">
        
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
          <div className="flex-1">
            <h3 className="font-black text-2xl text-slate-800">{title}</h3>
            <p className="text-blue-600 font-bold text-xs mt-1 uppercase tracking-widest">
              STABLE SCAN ENGINE ACTIVE
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
            <div className="text-red-400 font-bold text-center px-8 z-10 flex flex-col items-center">
              <p className="mb-6">{initError}</p>
              <button 
                onClick={() => fileInputRef.current.click()} 
                className="flex items-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-2xl shadow-xl font-black mb-4"
              >
                <Camera size={20} /> Use Native Camera
              </button>
              <button onClick={() => window.location.reload()} className="px-6 py-2 text-slate-400 text-sm underline">Reload Page</button>
            </div>
          ) : (
            <>
              <div id={containerId} className="w-full h-full min-h-[300px]"></div>
              
              {/* Visual Guide Overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-[85%] h-[40%] border-2 border-white/30 rounded-3xl relative">
                  <div className="absolute inset-0 border-2 border-blue-500/50 rounded-3xl animate-pulse"></div>
                  <div className="absolute top-1/2 left-0 w-full h-[2px] bg-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
                  
                  {/* Corner Accents */}
                  <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-blue-500 rounded-tl-lg"></div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-blue-500 rounded-tr-lg"></div>
                  <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-blue-500 rounded-bl-lg"></div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-blue-500 rounded-br-lg"></div>
                </div>
              </div>

              {isPhotoScanning && (
                <div className="absolute inset-0 z-[60] bg-slate-900/80 flex flex-col items-center justify-center text-white">
                  <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="font-black tracking-widest uppercase text-xs">Analyzing Photo...</p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-6 bg-white border-t border-slate-100">
           <div className="flex flex-col items-center gap-4">
              <button 
                onClick={() => fileInputRef.current.click()}
                className="w-full py-4 bg-slate-100 text-slate-700 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-slate-200 transition-all border border-slate-200 shadow-sm"
              >
                <ImageIcon size={20} className="text-blue-500" />
                <span>SCAN PHOTO / UPLOAD</span>
              </button>
              
              <input 
                type="file" 
                ref={fileInputRef} 
                accept="image/*" 
                capture="environment" 
                className="hidden" 
                onChange={handlePhotoScan}
              />

              <div className="flex flex-col items-center gap-1">
                <p className="text-slate-400 font-bold text-[10px] text-center uppercase tracking-tighter">
                  Keep barcode inside the red line for best result.
                </p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
