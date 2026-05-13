import React, { useEffect, useState, useRef } from 'react';
import { Zap, RefreshCw, X } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

export default function BarcodeScanner({ onScan, onClose, title = "Scan Barcode", continuous = false }) {
  const [initError, setInitError] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [lastDetected, setLastDetected] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [currentCameraId, setCurrentCameraId] = useState(null);
  
  const scannerRef = useRef(null);
  const containerId = "scanner-container-" + Math.random().toString(36).substr(2, 9);

  useEffect(() => {
    // 1. Get available cameras
    Html5Qrcode.getCameras().then(devices => {
      if (devices && devices.length > 0) {
        setCameras(devices);
        // Prioritize back cameras
        const back = devices.find(d => /back|rear|environment/i.test(d.label));
        const savedId = localStorage.getItem('billspark_camera_id');
        const initialId = savedId || (back ? back.id : devices[0].id);
        setCurrentCameraId(initialId);
      } else {
        setInitError("No cameras found.");
      }
    }).catch(err => {
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

  const startScanner = async (cameraId) => {
    if (scannerRef.current) {
      await stopScanner();
    }

    const html5QrCode = new Html5Qrcode(containerId);
    scannerRef.current = html5QrCode;

    const config = {
      fps: 20,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0
    };

    try {
      setIsScanning(true);
      await html5QrCode.start(
        cameraId,
        config,
        (decodedText) => {
          handleSuccess(decodedText);
        },
        (errorMessage) => {
          // Ignore frequent "no code found" errors
        }
      );
    } catch (err) {
      setInitError("Failed to start scanner. Try another camera.");
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
        setIsScanning(false);
      } catch (err) {
        console.error("Failed to stop scanner", err);
      }
    }
  };

  const handleSuccess = (text) => {
    if (lastDetected === text) return; // Prevent duplicate rapid scans
    
    if (navigator.vibrate) navigator.vibrate(200);
    setLastDetected(text);
    onScan(text);

    if (!continuous) {
      setTimeout(() => onClose(), 1000);
    } else {
      setTimeout(() => setLastDetected(null), 1500);
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
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
          <div className="flex-1">
            <h3 className="font-black text-2xl text-slate-800">{title}</h3>
            <p className="text-blue-600 font-bold text-xs mt-1 uppercase tracking-widest">
              High-Speed AI Engine
            </p>
          </div>
          <div className="flex items-center gap-2">
            {cameras.length > 1 && (
              <button 
                onClick={switchCamera}
                className="p-3 bg-blue-100 text-blue-600 rounded-xl hover:bg-blue-200 transition-all"
              >
                <RefreshCw size={20} />
              </button>
            )}
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-800">
              <X size={28} />
            </button>
          </div>
        </div>
        
        {/* Scanner Body */}
        <div className="w-full flex-1 bg-black relative flex items-center justify-center overflow-hidden">
          {lastDetected && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-green-500/80 backdrop-blur-sm animate-in fade-in">
              <div className="text-center text-white p-6">
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                   <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
                <h2 className="text-3xl font-black mb-2">SCANNED!</h2>
                <p className="text-xl font-bold bg-black/20 py-2 px-4 rounded-xl">{lastDetected}</p>
              </div>
            </div>
          )}

          {initError ? (
            <div className="text-red-400 font-bold text-center px-8 z-10">
              <p className="mb-4">{initError}</p>
              <button onClick={() => window.location.reload()} className="px-6 py-3 bg-white/10 rounded-xl text-white">Reload App</button>
            </div>
          ) : (
            <div id={containerId} className="w-full h-full"></div>
          )}
        </div>

        {/* Footer Guidance */}
        <div className="p-6 bg-white border-t border-slate-100">
           <div className="flex items-center justify-center gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <p className="text-slate-500 font-bold text-sm text-center">
                Point camera at barcode. Stay 15cm (6in) away.
              </p>
           </div>
        </div>
      </div>
    </div>
  );
}
