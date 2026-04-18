import React, { useEffect, useState } from 'react';
import Quagga from '@ericblade/quagga2';

export default function BarcodeScanner({ onScan, onClose, title = "Scan Barcode" }) {
  const [initError, setInitError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    Quagga.init({
      inputStream: {
        name: "Live",
        type: "LiveStream",
        target: document.querySelector('#scanner-camera'),
        constraints: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "environment"
        },
      },
      decoder: {
        readers: [
          "ean_reader",
          "ean_8_reader",
          "upc_reader",
          "upc_e_reader",
          "code_128_reader"
        ],
        multiple: false
      },
      locate: true,
      locator: {
        halfSample: true,
        patchSize: "large",
      }
    }, function(err) {
      if (err) {
        console.error(err);
        if (isMounted) setInitError(err.message || 'Camera failed to start.');
        return;
      }
      if (isMounted) Quagga.start();
    });

    const onDetect = (result) => {
      const code = result.codeResult.code;
      if (code && isMounted) {
        if (code.length >= 8) { // basic barcode validation
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
    };
  }, [onScan]);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    const val = e.target.manualCode.value.trim();
    if (val) onScan(val);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4 md:p-12 animate-in fade-in">
      <div className="bg-white p-6 rounded-3xl shadow-2xl w-full max-w-6xl relative flex flex-col h-full max-h-[90vh]">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="font-black text-2xl text-slate-800">{title}</h3>
            <p className="text-slate-500 font-bold">Hold the barcode up to the camera</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800 font-bold px-6 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
            Close Scanner
          </button>
        </div>
        
        <div className="w-full flex-1 bg-slate-900 rounded-2xl overflow-hidden border-4 border-slate-100 flex items-center justify-center relative shadow-inner mb-6 min-h-[50vh]">
          {initError ? (
            <div className="text-red-400 font-bold text-center p-6 bg-red-500/10 rounded-xl">
              Camera Error: <br/> {initError}
            </div>
          ) : (
            <>
              <div 
                id="scanner-camera"
                className="w-full h-full absolute inset-0 [&>video]:w-full [&>video]:h-full [&>video]:object-cover [&>canvas]:hidden"
              ></div>
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                <div className="w-11/12 md:w-3/4 h-64 border-4 border-white/60 rounded-3xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]">
                  <div className="absolute left-0 right-0 h-1 bg-red-500/90 shadow-[0_0_20px_rgba(239,68,68,1)] animate-pulse" style={{ top: '50%' }}></div>
                </div>
              </div>
            </>
          )}
        </div>
        
        <div className="text-center max-w-xl mx-auto w-full">
          <p className="text-slate-500 font-bold mb-3 text-lg">Camera struggling? Type the numbers under the barcode:</p>
          <form onSubmit={handleManualSubmit} className="flex gap-3">
            <input 
              type="text" 
              name="manualCode"
              placeholder="e.g. 6936664321004" 
              className="flex-1 px-6 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-black text-xl text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 placeholder:font-normal placeholder:text-slate-400"
              autoFocus
            />
            <button type="submit" className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-xl rounded-2xl shadow-lg shadow-blue-500/30 transition-all">
              Submit Keypad
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
