import { useState, useEffect, useCallback } from 'react';
import { db, saveSaleOffline } from '../lib/offline';
import { Search, ScanLine, Plus, Trash2, CreditCard, Banknote, PauseCircle, ShoppingCart } from 'lucide-react';
import { playBeep, initAudio, getAudioState } from '../utils/audio';
import BarcodeScanner from '../components/BarcodeScanner';

export default function POS() {
  const [baskets, setBaskets] = useState([{ id: 1, name: 'Basket A', items: [] }]);
  const [activeBasketId, setActiveBasketId] = useState(1);
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [amountReceived, setAmountReceived] = useState('');
  const [paymentType, setPaymentType] = useState('cash');

  const [isScanning, setIsScanning] = useState(false);
  const [scanFeedback, setScanFeedback] = useState(null);
  const [audioEnabled, setAudioEnabled] = useState(getAudioState());

  const handleEnableAudio = () => {
    initAudio();
    setAudioEnabled(getAudioState());
  };

  const showFeedback = (msg, isSuccess) => {
    setScanFeedback({ message: msg, type: isSuccess ? 'success' : 'error' });
    setTimeout(() => setScanFeedback(null), 3000);
  };

  useEffect(() => {
    const fetchProducts = async () => {
      const allProds = await db.products_cache.toArray();
      if(allProds.length === 0) {
        setProducts([
          { id: 1, name: 'Verna Water 500ml', sell_price: 3, stock_qty: 100, barcode: '123456789' },
          { id: 2, name: 'Coca Cola 1.5L', sell_price: 15, stock_qty: 20, barcode: '987654321' },
          { id: 3, name: 'Bread (Butter)', sell_price: 12, stock_qty: 15, barcode: '111111111' },
        ]);
      } else {
        setProducts(allProds);
      }
    };
    fetchProducts();
  }, []);

  // Hardware Scanner Listener (Listens for rapid keystrokes from a USB/Bluetooth scanner)
  useEffect(() => {
    let barcodeString = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e) => {
      // Don't intercept if user is trying to type in the search bar or payment box
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const currentTime = Date.now();
      
      // Hardware scanners type incredibly fast (< 30ms between keys)
      // If slower than 100ms, reset the string because it's a human typing
      if (currentTime - lastKeyTime > 100) {
        barcodeString = '';
      }
      lastKeyTime = currentTime;

      // When the scanner finishes, it sends an 'Enter' key
      if (e.key === 'Enter' && barcodeString.length > 2) {
        handleScanSuccess(barcodeString);
        barcodeString = '';
        e.preventDefault();
      } else if (e.key.length === 1) {
        // Collect single characters (letters/numbers)
        barcodeString += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [products, baskets, activeBasketId]);

  const handleScanSuccess = useCallback((text) => {
    const scannedCode = text.trim();
    console.log("Scanned:", scannedCode);
    
    try { playBeep(); } catch (e) { console.warn('Beep error', e); }
    // Don't close scanner — continuous mode keeps it open

    const product = products.find(p => p.barcode === scannedCode || p.sku === scannedCode);
    if (product) {
      setBaskets(prev => prev.map(b => {
        if (b.id === activeBasketId) {
          const existing = b.items.find(i => i.id === product.id);
          if (existing) {
            return { ...b, items: b.items.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i) };
          }
          return { ...b, items: [...b.items, { ...product, qty: 1 }] };
        }
        return b;
      }));
      showFeedback(`Added ${product.name} to basket!`, true);
    } else {
      showFeedback(`Product not found: ${scannedCode}`, false);
    }
  }, [products, activeBasketId]);

  const activeBasket = baskets.find(b => b.id === activeBasketId) || baskets[0];
  
  const total = activeBasket.items.reduce((sum, item) => sum + (item.sell_price * item.qty), 0);
  const changeDue = amountReceived ? Math.max(0, parseFloat(amountReceived) - total) : 0;

  const addToBasket = (product) => {
    setBaskets(baskets.map(b => {
      if (b.id === activeBasketId) {
        const existing = b.items.find(i => i.id === product.id);
        if (existing) {
          return { ...b, items: b.items.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i) };
        }
        return { ...b, items: [...b.items, { ...product, qty: 1 }] };
      }
      return b;
    }));
  };

  const removeFromBasket = (productId) => {
    setBaskets(baskets.map(b => {
      if (b.id === activeBasketId) {
        return { ...b, items: b.items.filter(i => i.id !== productId) };
      }
      return b;
    }));
  };

  const updateQty = (productId, delta) => {
    setBaskets(baskets.map(b => {
      if (b.id === activeBasketId) {
        return {
          ...b, 
          items: b.items.map(i => {
            if (i.id === productId) {
              const newQty = Math.max(1, i.qty + delta);
              return { ...i, qty: newQty };
            }
            return i;
          })
        };
      }
      return b;
    }));
  };

  const handleCheckout = async () => {
    if (activeBasket.items.length === 0) return alert('Basket is empty');
    if (paymentType === 'cash' && (!amountReceived || parseFloat(amountReceived) < total)) {
      return alert('Enter valid amount received for cash payment');
    }

    const saleData = {
      business_id: 'local_bus_1', 
      cashier_id: 'user_1', 
      total: total,
      payment_type: paymentType,
      amount_received: paymentType === 'cash' ? parseFloat(amountReceived) : total,
      change_due: paymentType === 'cash' ? changeDue : 0,
    };

    const itemsData = activeBasket.items.map(i => ({
      product_id: i.id,
      qty: i.qty,
      price: i.sell_price
    }));

    try {
      await saveSaleOffline(saleData, itemsData);
      alert('Sale completed successfully!');
      
      setBaskets(baskets.map(b => b.id === activeBasketId ? { ...b, items: [] } : b));
      setAmountReceived('');
    } catch (err) {
      alert('Error saving sale: ' + err.message);
    }
  };

  const addBasket = () => {
    const newId = Date.now();
    setBaskets([...baskets, { id: newId, name: `Basket ${String.fromCharCode(65 + baskets.length)}`, items: [] }]);
    setActiveBasketId(newId);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 bg-slate-50/50 -m-4 p-4 lg:-m-8 lg:p-8 min-h-[calc(100vh-4rem)] relative">
      
      {/* Audio Enable Prompt */}
      {!audioEnabled && (
        <div className="fixed bottom-6 right-6 lg:bottom-10 lg:right-10 px-6 py-4 bg-slate-800 text-white rounded-2xl shadow-2xl z-[90] flex flex-col gap-3 animate-in fade-in slide-in-from-bottom border border-slate-700">
          <p className="font-bold text-sm text-slate-300">Scanner Beep</p>
          <button onClick={handleEnableAudio} className="px-6 py-2 bg-blue-500 hover:bg-blue-600 font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all">
            Enable Sound
          </button>
        </div>
      )}
      
      {/* Toast Feedback */}
      {scanFeedback && (
        <div className={`fixed top-8 left-1/2 -translate-x-1/2 px-8 py-4 rounded-full font-black text-lg shadow-2xl z-[100] transition-all animate-bounce flex items-center justify-center gap-3 ${scanFeedback.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
          {scanFeedback.message}
        </div>
      )}

      {/* Scanner Overlay — Continuous Mode */}
      {isScanning && (
        <BarcodeScanner 
          onScan={handleScanSuccess} 
          onClose={() => setIsScanning(false)}
          continuous={true}
          title="Scan Items"
        />
      )}

      {/* Left Area: POS Register */}
      <div className="w-full lg:flex-1 flex flex-col bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden order-2 lg:order-1 mt-4 lg:mt-0">
        
        {/* Tabs */}
        <div className="flex bg-slate-100 p-2 gap-2 border-b border-slate-200 overflow-x-auto">
          {baskets.map(b => (
            <button
              key={b.id}
              onClick={() => setActiveBasketId(b.id)}
              className={`px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${activeBasketId === b.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}
            >
              {b.name}
              {b.items.length > 0 && <span className="ml-2 bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full text-xs">{b.items.length}</span>}
            </button>
          ))}
          <button onClick={addBasket} className="px-4 py-3 text-slate-500 hover:bg-slate-200 rounded-xl transition-all">
            <Plus size={20} />
          </button>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-auto p-4 space-y-2">
          {activeBasket.items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <ShoppingCart size={48} className="mb-4 opacity-20" />
              <p className="font-bold">Basket is empty</p>
              <p className="text-sm">Scan or add items</p>
            </div>
          ) : (
            activeBasket.items.map(item => (
              <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex-1">
                  <h4 className="font-bold text-slate-800">{item.name}</h4>
                  <div className="text-blue-600 font-bold text-sm">GHS {item.sell_price.toFixed(2)}</div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center bg-white rounded-xl border border-slate-200 shadow-sm">
                    <button onClick={() => updateQty(item.id, -1)} className="px-3 py-2 text-slate-600 hover:text-blue-600 font-bold">-</button>
                    <div className="px-4 font-black">{item.qty}</div>
                    <button onClick={() => updateQty(item.id, 1)} className="px-3 py-2 text-slate-600 hover:text-blue-600 font-bold">+</button>
                  </div>
                  <div className="w-20 text-right font-black text-lg">
                    GHS {(item.sell_price * item.qty).toFixed(2)}
                  </div>
                  <button onClick={() => removeFromBasket(item.id)} className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bottom Checkout Panel */}
        <div className="border-t border-slate-200 p-6 bg-slate-50">
          <div className="flex justify-between items-center mb-6">
            <div className="text-xl font-bold text-slate-500">Total</div>
            <div className="text-4xl font-black text-blue-600">GHS {total.toFixed(2)}</div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <button 
              onClick={() => setPaymentType('cash')}
              className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 font-bold transition-all ${paymentType === 'cash' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-500 hover:border-blue-200'}`}
            >
              <Banknote size={28} />
              Cash
            </button>
            <button 
              onClick={() => setPaymentType('momo')}
              className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 font-bold transition-all ${paymentType === 'momo' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-slate-200 bg-white text-slate-500 hover:border-orange-200'}`}
            >
              <CreditCard size={28} />
              Mobile Money
            </button>
          </div>

          {paymentType === 'cash' && (
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-bold text-slate-500 mb-2">Amount Received</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">GHS</span>
                  <input 
                    type="number" 
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value)}
                    className="w-full pl-14 pr-4 py-3 bg-white border border-slate-200 rounded-xl font-black text-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-500 mb-2">Change Due</label>
                <div className="w-full px-4 py-3 bg-slate-200 border border-slate-300 rounded-xl font-black text-xl text-slate-700">
                  GHS {changeDue.toFixed(2)}
                </div>
              </div>
            </div>
          )}

          <button 
            onClick={handleCheckout}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-black text-xl rounded-2xl shadow-xl shadow-blue-500/30 transition-all transform hover:-translate-y-1"
          >
            Checkout
          </button>
        </div>

      </div>

      {/* Right Area: Products & Scanning */}
      <div className="w-full lg:w-[400px] flex flex-col gap-4 lg:gap-6 order-1 lg:order-2">
        
        {/* Actions */}
        <div className="grid grid-cols-2 gap-4">
          <button onClick={() => setIsScanning(true)} className="flex items-center justify-center gap-2 p-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 hover:border-blue-500 hover:text-blue-600 transition-all shadow-sm">
            <ScanLine size={20} /> Scan
          </button>
          <button onClick={addBasket} className="flex items-center justify-center gap-2 p-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 hover:border-orange-500 hover:text-orange-600 transition-all shadow-sm">
            <PauseCircle size={20} /> Hold
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Search products..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 shadow-sm"
          />
        </div>

        {/* Product Grid */}
        <div className="h-[40vh] lg:h-auto lg:flex-1 bg-white border border-slate-200 rounded-3xl p-4 shadow-sm overflow-auto">
          <div className="grid grid-cols-2 gap-3">
            {products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).map(product => (
              <button 
                key={product.id}
                onClick={() => addToBasket(product)}
                className="flex flex-col text-left p-4 border border-slate-100 bg-slate-50 rounded-2xl hover:border-blue-300 hover:bg-blue-50 transition-all active:scale-95"
              >
                <div className="flex-1 font-bold text-slate-800 leading-tight mb-2">{product.name}</div>
                <div className="text-blue-600 font-black text-lg">GHS {product.sell_price}</div>
                <div className="text-xs font-bold text-slate-400 mt-1">{product.stock_qty} in stock</div>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
