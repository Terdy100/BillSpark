import React, { useEffect, useState, useRef } from 'react';
import { RefreshCw, X, Zap } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

export default function BarcodeScanner({ onScan, onClose, title = "Scan Barcode", continuous = false }) {
  const [initError, setInitError] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [lastDetected, setLastDetected] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [currentCameraId, setCurrentCameraId] = useState(null);
  const [lastScannedCode, setLastScannedCode] = useState(null);
  const [lastScannedTime, setLastScannedTime] = useState(0);
  
  const scannerRef = useRef(null);
  // Stable container ID is critical
  const containerId = useRef("scanner-container-" + Math.random().toString(36).substr(2, 9)).current;

  useEffect(() => {
    // 1. Get available cameras
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
    }).catch(err => {
      setInitError("Camera permission denied.");
    });

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    if (currentCameraId) {
      startScanner(currentCameraId);
    }
  }, [currentCameraId]);

  const handleSuccess = (text) => {
    const now = Date.now();
    if (lastScannedCode === text && (now - lastScannedTime) < 2000) return;
    
    setLastScannedCode(text);
    setLastScannedTime(now);
    setLastDetected(text);
    onScan(text);

    if (navigator.vibrate) navigator.vibrate(200);

    if (!continuous) {
      setTimeout(() => onClose(), 800);
    } else {
      setTimeout(() => setLastDetected(null), 1500);
    }
  };

  const startScanner = async (cameraId) => {
    try {
      if (scannerRef.current && scannerRef.current.isScanning) {
        await scannerRef.current.stop();
      }

      const html5QrCode = new Html5Qrcode(containerId);
      scannerRef.current = html5QrCode;

      const config = {
        fps: 20,
        // Large scanning area as requested
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const width = viewfinderWidth * 0.8;
          const height = viewfinderHeight * 0.5;
          return { width, height };
        },
        aspectRatio: undefined // Crucial for iOS Safari stability
      };

      setIsScanning(true);
      await html5QrCode.start(
        cameraId,
        config,
        (decodedText) => handleSuccess(decodedText),
        () => {} // Ignore errors to keep scanning
      );
    } catch (err) {
      console.error("Scanner error", err);
      setInitError("Failed to start camera. Please refresh or try another camera.");
      setIsScanning(false);
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl relative flex flex-col h-full max-h-[85vh] overflow-hidden">
        
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <h3 className="font-black text-2xl text-slate-800">{title}</h3>
          <div className="flex items-center gap-2">
            {cameras.length > 1 && (
              <button onClick={switchCamera} className="p-3 bg-blue-100 text-blue-600 rounded-xl hover:bg-blue-200">
                <RefreshCw size={20} />
              </button>
            )}
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-800">
              <X size={28} />
            </button>
          </div>
        </div>
        
        <div className="w-full flex-1 bg-black relative flex items-center justify-center overflow-hidden">
          {lastDetected && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-green-500/80 backdrop-blur-sm">
              <div className="text-center text-white p-6">
                <h2 className="text-3xl font-black mb-2 uppercase">Success!</h2>
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

        <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
           <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-1">Scanning Engine Ready</p>
           <p className="text-slate-500 font-bold text-[10px]">Align barcode in the center frame</p>
        </div>
      </div>
    </div>
  );
}
