import React, { useEffect, useState, useRef } from 'react';
import { RefreshCw, X, Camera, ZoomIn, ZoomOut } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

export default function BarcodeScanner({ onScan, onClose, title = "Scan Barcode", continuous = false }) {
  const [initError, setInitError] = useState(null);
  const [lastDetected, setLastDetected] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [currentCameraId, setCurrentCameraId] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [hasZoom, setHasZoom] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  
  const scannerRef = useRef(null);
  const containerId = useRef("scanner-container-" + Math.random().toString(36).substr(2, 9)).current;
  const fileInputRef = useRef(null);

  useEffect(() => {
    // 1. Get available cameras
    Html5Qrcode.getCameras().then(devices => {
      if (devices && devices.length > 0) {
        setCameras(devices);
        
        // Refined iOS Camera Selection
        // We want the "Main" camera. Labels like "Back Camera", "Camera 0", or "Triple Camera" (which handles switching)
        const backCameras = devices.filter(d => /back|rear|environment/i.test(d.label));
        
        // Specifically look for labels that suggest the primary wide lens
        let preferredBack = backCameras.find(d => 
          /main|primary/i.test(d.label) || 
          (/back/i.test(d.label) && !/ultra|tele|wide\s+camera\s+[1-9]/i.test(d.label.toLowerCase()))
        );

        // Fallback to first back camera if specific main not found
        if (!preferredBack) preferredBack = backCameras[0];
        
        const savedId = localStorage.getItem('billspark_camera_id');
        const initialId = savedId || (preferredBack ? preferredBack.id : devices[0].id);
        setCurrentCameraId(initialId);
      } else {
        setInitError("No cameras found on this device.");
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

  const startScanner = async (cameraId) => {
    try {
      if (scannerRef.current && scannerRef.current.isScanning) {
        await scannerRef.current.stop();
      }

      const html5QrCode = new Html5Qrcode(containerId);
      scannerRef.current = html5QrCode;

      // Detect if we are on iOS to apply specific tweaks
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

      const config = {
        fps: isIOS ? 20 : 25,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          // Wide and tall scanning area (60% of screen height)
          const width = Math.floor(viewfinderWidth * 0.90);
          const height = Math.floor(viewfinderHeight * 0.60);
          return { width, height };
        },
        // Removed fixed aspectRatio to let Safari handle native sensor flow
        showTorchButtonIfSupported: true,
        videoConstraints: {
          width: { min: 640, ideal: 1280 },
          height: { min: 480, ideal: 720 },
          facingMode: 'environment'
        },
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
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
        ],
        disableFlip: true
      };

      try {
        await html5QrCode.start(
          cameraId,
          config,
          (text) => {
            onScan(text);
            if (navigator.vibrate) navigator.vibrate(200);
            if (!continuous) onClose();
          },
          () => {}
        );
      } catch (e) {
        console.warn("Failed to start with specific ID, falling back to facingMode", e);
        await html5QrCode.start(
          { facingMode: "environment" },
          config,
          (text) => {
            onScan(text);
            if (navigator.vibrate) navigator.vibrate(200);
            if (!continuous) onClose();
          },
          () => {}
        );
      }
      setIsScanning(true);

      // Check for hardware zoom support
      try {
        const track = html5QrCode.getRunningTrackCapabilities();
        if (track.zoom) {
          setHasZoom(true);
          // Increased default zoom to 1.5x for better focus on "Pro" iPhone models
          if (isIOS && track.zoom.min < 1.5 && track.zoom.max > 1.5) {
             handleZoom(1.5);
          }
        }
      } catch (e) {
        console.log("Zoom not supported by hardware");
      }
    } catch (err) {
      console.error("Scanner error", err);
      setInitError("Failed to start camera stream.");
    }
  };

  const handleZoom = async (val) => {
    setZoom(val);
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.applyVideoConstraints({
          advanced: [{ zoom: val }]
        });
      } catch (e) {
        console.warn("Zoom constraint failed");
      }
    }
  };

  const handleFileScan = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const html5QrCode = new Html5Qrcode(containerId);
    try {
      const text = await html5QrCode.scanFile(file, true);
      onScan(text);
      if (navigator.vibrate) navigator.vibrate(200);
      onClose();
    } catch (err) {
      alert("Could not detect barcode in photo. Please ensure it is clear and not too far away.");
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/95 p-4">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl relative flex flex-col h-full max-h-[90vh] overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex-1">
            <h3 className="font-black text-2xl text-slate-800 tracking-tight">{title}</h3>
            <p className="text-blue-600 font-bold text-[10px] uppercase tracking-widest mt-1">
               Lens: {cameras.find(c => c.id === currentCameraId)?.label || 'Auto-Detect'}
            </p>
          </div>
          <div className="flex items-center gap-2">
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
        
        {/* Viewport */}
        <div className="w-full flex-1 bg-black relative flex items-center justify-center overflow-hidden">
          {/* Main Scanner Div */}
          <div id={containerId} className="w-full h-full flex items-center justify-center [&>video]:object-cover [&>video]:w-full [&>video]:h-full"></div>
          
          {/* Zoom Controls */}
          {hasZoom && (
            <div className="absolute bottom-10 left-8 right-8 z-20 px-6 py-4 bg-black/40 backdrop-blur-xl rounded-[2rem] border border-white/20 flex items-center gap-6">
              <ZoomOut size={18} className="text-white/60" />
              <input 
                type="range" 
                min="1" 
                max="5" 
                step="0.1" 
                value={zoom} 
                onChange={(e) => handleZoom(parseFloat(e.target.value))} 
                className="flex-1 h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-blue-500"
              />
              <ZoomIn size={18} className="text-white/60" />
              <span className="text-white font-black text-xs w-8">{zoom.toFixed(1)}x</span>
            </div>
          )}

          {/* Alignment Guide (Minimalist Blue Only) */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-[90%] h-[60%] relative overflow-hidden">
               {/* Scanning Line Animation */}
               <div className="absolute top-0 left-0 right-0 h-[2px] bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-scan-line"></div>
               
               {/* Corner accents (Blue only) */}
               <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-xl"></div>
               <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-xl"></div>
               <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-xl"></div>
               <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-xl"></div>
            </div>
          </div>

          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes scan-line {
              0% { top: 0%; opacity: 0; }
              10% { opacity: 1; }
              90% { opacity: 1; }
              100% { top: 100%; opacity: 0; }
            }
            .animate-scan-line {
              animation: scan-line 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
            }
            /* Force the video to fill the screen properly and fix the "Above center" offset */
            #${containerId} video {
              object-fit: cover !important;
              width: 100% !important;
              height: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              display: block !important;
            }
            /* Hide any text or buttons injected by the library that shift the video */
            #${containerId} *:not(video):not(canvas) {
              display: none !important;
            }
          `}} />
          
          {initError && (
             <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 text-white p-10 text-center">
                <p className="font-bold mb-6 text-red-400">{initError}</p>
                <button onClick={() => window.location.reload()} className="px-8 py-4 bg-white text-slate-900 font-black rounded-2xl shadow-2xl">Reload App</button>
             </div>
          )}
        </div>

        {/* Footer with "Photo Mode" Fallback */}
        <div className="p-8 bg-white border-t border-slate-100">
           <div className="flex flex-col gap-6">
              <div>
                <p className="text-slate-400 font-black text-[10px] text-center uppercase tracking-widest mb-3">Scanning Troubles?</p>
                <button 
                  onClick={() => fileInputRef.current.click()}
                  className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all shadow-2xl shadow-slate-900/20"
                >
                  <Camera size={22} /> Use Photo Mode (iOS Fix)
                </button>
                {/* Native iOS Camera Fallback */}
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="camera" 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={handleFileScan} 
                />
              </div>
              
              <div className="flex justify-between items-center px-2">
                 <div className="text-left">
                    <p className="text-slate-800 font-black text-xs uppercase">Pro Tip</p>
                    <p className="text-slate-400 font-bold text-[10px]">Use 2x zoom for tiny barcodes</p>
                 </div>
                 <div className="text-right">
                    <p className="text-slate-800 font-black text-xs uppercase">Distance</p>
                    <p className="text-slate-400 font-bold text-[10px]">Keep 20cm away from lens</p>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
