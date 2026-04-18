import React, { useEffect, useState, useRef } from 'react';
import Quagga from '@ericblade/quagga2';
import { Flashlight, FlashlightOff } from 'lucide-react';

export default function BarcodeScanner({ onScan, onClose, title = "Scan Barcode" }) {
  const [initError, setInitError] = useState(null);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const videoTrackRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    // 4. Reduce Resolution (640x480 is 4x faster to process than HD)
    Quagga.init({
      inputStream: {
        name: "Live",
        type: "LiveStream",
        target: document.querySelector('#scanner-camera'),
        constraints: {
          width: 640,
          height: 480,
          facingMode: "environment"
        },
        // 2. Limit Scan Area (Massively increases speed by ignoring background)
        area: {
          top: "25%",
          bottom: "25%",
          left: "10%",
          right: "10%"
        }
      },
      decoder: {
        readers: [
          "ean_reader",
          "ean_8_reader",
          "upc_reader",
          "upc_e_reader"
        ],
        multiple: false
      },
      locate: true,
      locator: {
        halfSample: true,
        patchSize: "medium", // smaller patch sizes increase FPS on phones
      }
    }, function(err) {
      if (err) {
        console.error(err);
        if (isMounted) setInitError(err.message || 'Camera failed to start.');
        return;
      }
      if (isMounted) {
        Quagga.start();
        
        // 5. Get access to the physical camera track for Flashlight control
        const track = Quagga.CameraAccess.getActiveTrack();
        if (track) {
          videoTrackRef.current = track;
          const capabilities = track.getCapabilities && track.getCapabilities();
          if (capabilities && capabilities.torch) {
            setHasTorch(true);
          }
        }
      }
    });

    const onDetect = (result) => {
      const code = result.codeResult.code;
      if (code && isMounted) {
        if (code.length >= 8) {
          // 6. Beep + Freeze + Vibrate on Success
          if (navigator.vibrate) navigator.vibrate(200);
          Quagga.stop();
          onScan(code);
        }
      }
    };

    Quagga.onDetected(onDetect);

    return () => {
      isMounted = false;
      Quagga.offDetected(onDetect);
      Quagga.stop();
      if (videoTrackRef.current && torchOn) {
        try { videoTrackRef.current.applyConstraints({ advanced: [{ torch: false }] }); } catch (e) {}
      }
    };
  }, [onScan]);

  const toggleTorch = async () => {
    if (videoTrackRef.current && hasTorch) {
      try {
        const newTorchState = !torchOn;
        await videoTrackRef.current.applyConstraints({
          advanced: [{ torch: newTorchState }]
        });
        setTorchOn(newTorchState);
      } catch (err) {
        console.warn("Failed to toggle flashlight", err);
      }
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    const val = e.target.manualCode.value.trim();
    if (val) onScan(val);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/95 backdrop-blur-md p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg relative flex flex-col h-full max-h-[90vh] overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
          <div>
            <h3 className="font-black text-2xl text-slate-800">{title}</h3>
            <p className="text-slate-500 font-bold text-sm">Center barcode in the red box</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800 font-bold px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-xl transition-colors">
            Close
          </button>
        </div>
        
        {/* Camera Container */}
        <div className="w-full flex-1 bg-black relative flex items-center justify-center min-h-[40vh]">
          {initError ? (
            <div className="text-red-400 font-bold text-center px-8 z-10">
              Camera Error: <br/> {initError}
            </div>
          ) : (
            <>
              {/* Quagga Video Canvas Injection Point */}
              <div 
                id="scanner-camera"
                className="w-full h-full absolute inset-0 [&>video]:w-full [&>video]:h-full [&>video]:object-cover [&>canvas]:hidden"
              ></div>
              
              {/* Scan Zone UI (Matches the area constrain above) */}
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center bg-black/40">
                <div className="w-4/5 h-48 border-[6px] border-white/80 rounded-3xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] flex items-center justify-center bg-transparent">
                  <div className="absolute left-4 right-4 h-1 bg-red-500/90 shadow-[0_0_20px_rgba(239,68,68,1)] animate-pulse rounded-full"></div>
                </div>
              </div>

              {/* Flashlight Toggle */}
              {hasTorch && (
                <button 
                  onClick={toggleTorch}
                  className={`absolute bottom-6 right-6 p-4 rounded-full shadow-2xl transition-all ${torchOn ? 'bg-yellow-400 text-yellow-900' : 'bg-slate-800/80 text-white border border-white/20 backdrop-blur-md'}`}
                >
                  {torchOn ? <Flashlight size={24} /> : <FlashlightOff size={24} />}
                </button>
              )}
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
