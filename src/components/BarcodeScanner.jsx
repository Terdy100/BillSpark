import React, { useEffect, useState, useRef } from 'react';
import { Zap, RefreshCw, X } from 'lucide-react';
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';

export default function BarcodeScanner({ onScan, onClose, title = "Scan Barcode", continuous = false }) {
  const [initError, setInitError] = useState(null);
  const [lastDetected, setLastDetected] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [currentCameraId, setCurrentCameraId] = useState(null);
  const [lastScannedCode, setLastScannedCode] = useState(null);
  const [lastScannedTime, setLastScannedTime] = useState(0);
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  
  const videoRef = useRef(null);
  const codeReaderRef = useRef(null);

  useEffect(() => {
    // Initialize ZXing Reader with explicit product barcode hints
    const hints = new Map();
    const formats = [
      BarcodeFormat.QR_CODE,
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.ITF
    ];
    hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);
    hints.set(DecodeHintType.TRY_HARDER, true);

    codeReaderRef.current = new BrowserMultiFormatReader(hints);

    // Get available video devices
    codeReaderRef.current.listVideoInputDevices()
      .then(devices => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Try to find the best back camera
          const back = devices.find(d => /back|rear|environment/i.test(d.label));
          const savedId = localStorage.getItem('billspark_camera_id');
          // Use deviceId for ZXing
          const initialId = savedId || (back ? back.deviceId : devices[0].deviceId);
          setCurrentCameraId(initialId);
        } else {
          setInitError("No cameras found on this device.");
        }
      })
      .catch(err => {
        console.error("Camera List Error:", err);
        setInitError("Camera permission denied. Please allow access and reload.");
      });

    return () => {
      stopScanner();
    };
  }, []);

  useEffect(() => {
    if (currentCameraId && videoRef.current) {
      startScanner(currentCameraId);
    }
  }, [currentCameraId]);

  const stopScanner = () => {
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
      setTorchOn(false);
      setHasTorch(false);
    }
  };

  const handleSuccess = (result) => {
    const text = result.getText();
    const now = Date.now();
    
    // Safety cooldown for same barcode
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
      setTimeout(() => setLastDetected(null), 1500);
    }
  };

  const startScanner = async (deviceId) => {
    try {
      // Always reset before a new start to clear previous streams
      codeReaderRef.current.reset();
      
      await codeReaderRef.current.decodeFromVideoDevice(
        deviceId, 
        videoRef.current, 
        (result, err) => {
          if (result) {
            handleSuccess(result);
          }
        }
      );

      // Check for torch support (Flash)
      const stream = videoRef.current.srcObject;
      if (stream) {
        const track = stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities ? track.getCapabilities() : {};
        setHasTorch(!!capabilities.torch);
      }
    } catch (err) {
      console.error("Scanner Start Error:", err);
      // If specific ID fails, try falling back to general environment
      if (deviceId) {
        try {
          await codeReaderRef.current.decodeFromVideoDevice(undefined, videoRef.current, (r) => r && handleSuccess(r));
        } catch (e) {
          setInitError("Failed to initialize camera. Try a different lens or refresh.");
        }
      }
    }
  };

  const toggleTorch = async () => {
    const stream = videoRef.current?.srcObject;
    if (stream && hasTorch) {
      try {
        const track = stream.getVideoTracks()[0];
        const nextState = !torchOn;
        await track.applyConstraints({
          advanced: [{ torch: nextState }]
        });
        setTorchOn(nextState);
      } catch (err) {
        console.warn("Torch toggle failed", err);
      }
    }
  };

  const switchCamera = () => {
    if (cameras.length < 2) return;
    const currentIndex = cameras.findIndex(c => c.deviceId === currentCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextId = cameras[nextIndex].deviceId;
    setCurrentCameraId(nextId);
    localStorage.setItem('billspark_camera_id', nextId);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/95 p-4 sm:p-6">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl relative flex flex-col h-full max-h-[85vh] overflow-hidden border border-slate-200">
        
        {/* Header Section */}
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex-1">
            <h3 className="font-black text-2xl text-slate-800 tracking-tight">{title}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              <p className="text-blue-600 font-black text-[10px] uppercase tracking-widest">
                Stable-Sync Engine Active
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {hasTorch && (
              <button 
                onClick={toggleTorch} 
                className={`p-3.5 rounded-2xl transition-all duration-300 ${torchOn ? 'bg-yellow-400 text-white shadow-lg shadow-yellow-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
              >
                <Zap size={22} fill={torchOn ? "currentColor" : "none"} />
              </button>
            )}
            {cameras.length > 1 && (
              <button onClick={switchCamera} className="p-3.5 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-100 transition-all active:scale-95">
                <RefreshCw size={22} />
              </button>
            )}
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-800 transition-colors">
              <X size={32} />
            </button>
          </div>
        </div>
        
        {/* Viewfinder Section */}
        <div className="w-full flex-1 bg-black relative flex items-center justify-center overflow-hidden">
          {lastDetected && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-green-500/90 backdrop-blur-sm animate-in fade-in duration-300">
              <div className="text-center text-white p-8">
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white/30">
                   <Zap size={40} className="text-white fill-white" />
                </div>
                <h2 className="text-4xl font-black mb-2 tracking-tighter">SCANNED!</h2>
                <p className="text-2xl font-bold bg-black/30 py-3 px-6 rounded-2xl border border-white/20">{lastDetected}</p>
              </div>
            </div>
          )}

          {initError ? (
            <div className="text-red-400 font-bold text-center px-10 z-10 flex flex-col items-center">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                <X size={32} className="text-red-500" />
              </div>
              <p className="mb-6 text-lg">{initError}</p>
              <button onClick={() => window.location.reload()} className="px-8 py-4 bg-white text-slate-900 font-black rounded-2xl shadow-xl hover:bg-slate-50 transition-all">Reload Scanner</button>
            </div>
          ) : (
            <>
              <video 
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
                autoPlay
              />
              {/* LARGE Scanning Guide Overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                {/* Frame - Made much larger as requested */}
                <div className="w-[85%] h-[65%] border-2 border-white/20 rounded-[2.5rem] relative">
                   {/* Glowing Corners */}
                   <div className="absolute -top-1 -left-1 w-12 h-12 border-t-[6px] border-l-[6px] border-blue-500 rounded-tl-3xl"></div>
                   <div className="absolute -top-1 -right-1 w-12 h-12 border-t-[6px] border-r-[6px] border-blue-500 rounded-tr-3xl"></div>
                   <div className="absolute -bottom-1 -left-1 w-12 h-12 border-b-[6px] border-l-[6px] border-blue-500 rounded-bl-3xl"></div>
                   <div className="absolute -bottom-1 -right-1 w-12 h-12 border-b-[6px] border-r-[6px] border-blue-500 rounded-br-3xl"></div>
                   
                   {/* Dynamic Laser Line */}
                   <div className="absolute top-0 left-6 right-6 h-1 bg-blue-500/60 shadow-[0_0_20px_rgba(59,130,246,1)] animate-[laser_2.5s_ease-in-out_infinite]"></div>
                </div>
                
                <div className="absolute bottom-12 left-0 right-0 text-center">
                   <p className="text-white/80 font-black text-xs bg-black/50 backdrop-blur-md inline-block px-8 py-3 rounded-2xl border border-white/10 uppercase tracking-widest">
                     Place Barcode Inside Frame
                   </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Section */}
        <div className="p-8 bg-white border-t border-slate-100">
           <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Safety Filter</span>
                <div className="px-5 py-2.5 bg-blue-50 text-blue-600 text-xs font-black rounded-xl inline-block border border-blue-100 shadow-sm">
                  2.0s Cooldown Active
                </div>
              </div>
              <div className="text-right">
                <p className="text-slate-800 font-black text-sm uppercase tracking-tight">Support Info</p>
                <p className="text-slate-400 font-bold text-[10px]">Move closer if small • Use Flash for dark</p>
              </div>
           </div>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes laser {
          0% { top: 10%; opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { top: 90%; opacity: 0; }
        }
      `}} />
    </div>
  );
}
