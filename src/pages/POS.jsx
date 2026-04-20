import { useState, useEffect, useCallback } from 'react';
import { db, saveSaleOffline } from '../lib/offline';
import { Search, ScanLine, Plus, Trash2, CreditCard, Banknote, PauseCircle, ShoppingCart, CheckCircle, Printer, Share2, X } from 'lucide-react';
import { playBeep, initAudio, getAudioState, playCheckoutSound } from '../utils/audio';
import BarcodeScanner from '../components/BarcodeScanner';

export default function POS() {
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [baskets, setBaskets] = useState([{ id: 1, name: 'Basket 1', items: [] }]);
  const [activeBasketId, setActiveBasketId] = useState(1);
  const [isScanning, setIsScanning] = useState(false);
  const [scanFeedback, setScanFeedback] = useState(null);
  const [audioEnabled, setAudioEnabled] = useState(getAudioState());
  const [paymentType, setPaymentType] = useState('cash');
  const [amountReceived, setAmountReceived] = useState('');
  const [completedSale, setCompletedSale] = useState(null);
  const [quickAdd, setQuickAdd] = useState(null); // { barcode }

  const handleEnableAudio = () => {
    initAudio();
    setAudioEnabled(true);
  };

  useEffect(() => {
    const fetchProducts = async () => {
      const allProds = await db.products_cache.toArray();
      setProducts(allProds);
    };
    fetchProducts();
  }, []);

  // Hardware Scanner Listener
  useEffect(() => {
    let barcodeString = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 100) barcodeString = '';
      lastKeyTime = currentTime;

      if (e.key === 'Enter' && barcodeString.length > 2) {
        handleScanSuccess(barcodeString);
        barcodeString = '';
      } else if (e.key.length === 1) {
        barcodeString += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [products, baskets, activeBasketId]);

  // UI Keyboard Shortcuts
  useEffect(() => {
    const handleShortcuts = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'F1') { e.preventDefault(); setIsScanning(prev => !prev); }
      if (e.key === 'F9') { e.preventDefault(); handleCheckout(); }
      if (e.key === 'Escape') {
        if (isScanning) setIsScanning(false);
        if (completedSale) setCompletedSale(null);
        if (quickAdd) setQuickAdd(null);
      }
    };
    window.addEventListener('keydown', handleShortcuts);
    return () => window.removeEventListener('keydown', handleShortcuts);
  }, [isScanning, completedSale, activeBasketId, quickAdd]);

  const showFeedback = (msg, isSuccess) => {
    setScanFeedback({ message: msg, type: isSuccess ? 'success' : 'error' });
    setTimeout(() => setScanFeedback(null), 3000);
  };

  const handleScanSuccess = useCallback((text) => {
    const scannedCode = text.trim();
    try { playBeep(); } catch (e) { console.warn('Beep error', e); }

    const product = products.find(p => p.barcode === scannedCode || p.sku === scannedCode);
    if (product) {
      setBaskets(prev => prev.map(b => {
        if (b.id === activeBasketId) {
          const existing = b.items.find(item => item.id === product.id);
          if (existing) {
            return { ...b, items: b.items.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i) };
          }
          return { ...b, items: [...b.items, { ...product, qty: 1 }] };
        }
        return b;
      }));
      
      if ((product.stock_qty || 0) <= 5) {
        showFeedback(`${product.name} is low on stock (${product.stock_qty})!`, false);
      } else {
        showFeedback(`Added ${product.name} to basket!`, true);
      }
    } else {
      showFeedback(`Product not found: ${scannedCode}`, false);
      setQuickAdd({ barcode: scannedCode });
    }
  }, [products, activeBasketId]);

  const handleQuickAdd = async (e) => {
    e.preventDefault();
    const { name, price } = e.target.elements;
    const newProd = {
      id: Date.now(),
      name: name.value,
      sell_price: parseFloat(price.value),
      barcode: quickAdd.barcode,
      stock_qty: 0,
      category: 'Quick Add'
    };
    await db.products_cache.add(newProd);
    setProducts(prev => [...prev, newProd]);
    setBaskets(prev => prev.map(b => b.id === activeBasketId ? { ...b, items: [...b.items, { ...newProd, qty: 1 }] } : b));
    setQuickAdd(null);
    showFeedback(`Quick Added ${newProd.name}!`, true);
  };

  const activeBasket = baskets.find(b => b.id === activeBasketId) || baskets[0];
  const total = activeBasket.items.reduce((sum, item) => sum + (item.sell_price * item.qty), 0);
  const changeDue = paymentType === 'cash' ? Math.max(0, (parseFloat(amountReceived) || 0) - total) : 0;

  const updateQty = (id, delta) => {
    setBaskets(baskets.map(b => {
      if (b.id === activeBasketId) {
        return {
          ...b,
          items: b.items.map(i => i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i)
        };
      }
      return b;
    }));
  };

  const removeFromBasket = (id) => {
    setBaskets(baskets.map(b => b.id === activeBasketId ? { ...b, items: b.items.filter(i => i.id !== id) } : b));
  };

  const handleCheckout = async () => {
    if (activeBasket.items.length === 0) return alert('Basket is empty');
    if (paymentType === 'cash' && (!amountReceived || parseFloat(amountReceived) < total)) {
      return alert('Enter valid amount received for cash payment');
    }

    const itemsData = activeBasket.items.map(i => ({
      product_id: i.id,
      qty: i.qty,
      price: i.sell_price,
      cost_price: i.cost_price || 0,
      name: i.name
    }));

    const totalCost = itemsData.reduce((sum, item) => sum + (item.cost_price * item.qty), 0);

    const saleData = {
      business_id: 'local_bus_1',
      total,
      total_cost: totalCost,
      payment_type: paymentType,
      amount_received: paymentType === 'cash' ? parseFloat(amountReceived) : total,
      change_due: changeDue,
      created_at: new Date().toISOString(),
      synced: 0
    };

    try {
      const saleId = await saveSaleOffline(saleData, itemsData);
      playCheckoutSound();
      setCompletedSale({ id: saleId, ...saleData, items: itemsData, date: new Date().toLocaleString() });
      setBaskets(baskets.map(b => b.id === activeBasketId ? { ...b, items: [] } : b));
      setAmountReceived('');
    } catch (err) {
      alert("Checkout failed: " + err.message);
    }
  };

  const shareReceiptWhatsApp = () => {
    if (!completedSale) return;
    let text = `*RECEIPT - BillSpark*%0A`;
    text += `Receipt #: ${completedSale.id}%0A`;
    text += `Date: ${completedSale.date}%0A`;
    text += `--------------------------%0A`;
    completedSale.items.forEach(item => {
      text += `${item.qty}x ${item.name} - GHS ${(item.qty * item.price).toFixed(2)}%0A`;
    });
    text += `--------------------------%0A`;
    text += `*TOTAL: GHS ${completedSale.total.toFixed(2)}*%0A`;
    text += `Payment: ${completedSale.payment_type.toUpperCase()}%0A`;
    if (completedSale.payment_type === 'cash') text += `Change: GHS ${completedSale.change_due.toFixed(2)}%0A`;
    text += `%0AThank you for shopping with us!`;
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const getCategoryColor = (cat) => {
    const colors = { 'Drinks': 'bg-blue-100 text-blue-700', 'Bakery': 'bg-amber-100 text-amber-700', 'Quick Add': 'bg-purple-100 text-purple-700' };
    return colors[cat] || 'bg-slate-100 text-slate-600';
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 bg-slate-50/50 -m-4 p-4 lg:-m-8 lg:p-8 min-h-[calc(100vh-4rem)] relative">
      {!audioEnabled && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700 p-8 rounded-[2rem] text-center max-w-sm">
            <h2 className="text-2xl font-black text-white mb-4">Enable Sound</h2>
            <p className="text-slate-400 mb-6">Required for audible scan feedback.</p>
            <button onClick={handleEnableAudio} className="w-full py-4 bg-blue-600 text-white font-black rounded-xl shadow-lg">🔊 Enable Sound</button>
          </div>
        </div>
      )}
      
      {scanFeedback && (
        <div className={`fixed top-8 left-1/2 -translate-x-1/2 px-8 py-4 rounded-full font-black text-lg shadow-2xl z-[100] flex items-center justify-center gap-3 ${scanFeedback.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
          {scanFeedback.message}
          {scanFeedback.type === 'error' && (
            <button onClick={() => setQuickAdd({ barcode: scanFeedback.message.split(': ')[1] || 'Unknown' })} className="ml-4 bg-white text-red-600 px-3 py-1 rounded-lg text-sm">Quick Add</button>
          )}
        </div>
      )}

      {isScanning && (
        <BarcodeScanner onScan={handleScanSuccess} onClose={() => setIsScanning(false)} />
      )}

      {/* Main Barcode Area */}
      <div className="w-full lg:flex-1 flex flex-col bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden order-2 lg:order-1">
        <div className="flex bg-slate-100 p-2 gap-2 border-b border-slate-200 overflow-x-auto">
          {baskets.map(b => (
            <button key={b.id} onClick={() => setActiveBasketId(b.id)} className={`px-6 py-3 rounded-xl font-bold transition-all ${activeBasketId === b.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>
              {b.name}
            </button>
          ))}
          <button onClick={() => setBaskets([...baskets, { id: baskets.length + 1, name: `Basket ${baskets.length + 1}`, items: [] }])} className="px-4 font-bold text-slate-500">+</button>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-3">
          {activeBasket.items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-300">
               <ShoppingCart size={64} className="mb-4 opacity-10" />
               <p className="font-bold">Scan items to begin sale</p>
            </div>
          ) : activeBasket.items.map(item => (
            <div key={item.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex-1">
                <h4 className="font-bold text-slate-800">{item.name}</h4>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${getCategoryColor(item.category)}`}>{item.category || 'General'}</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center bg-white rounded-xl border border-slate-200">
                  <button onClick={() => updateQty(item.id, -1)} className="px-3 py-2 text-slate-600">-</button>
                  <button onClick={() => {
                      const n = prompt("Qty:", item.qty);
                      if (n && !isNaN(n)) updateQty(item.id, parseInt(n) - item.qty);
                  }} className="px-4 font-black">{item.qty}</button>
                  <button onClick={() => updateQty(item.id, 1)} className="px-3 py-2 text-slate-600">+</button>
                </div>
                <div className="w-24 text-right font-black">GHS {(item.sell_price * item.qty).toFixed(2)}</div>
                <button onClick={() => removeFromBasket(item.id)} className="p-2 text-red-500"><Trash2 size={20} /></button>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-200 p-6 bg-slate-50">
          <div className="flex justify-between items-center mb-6">
            <div className="text-xl font-bold text-slate-500 uppercase">Grand Total</div>
            <div className="text-4xl font-black text-slate-800">GHS {total.toFixed(2)}</div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
             <button onClick={() => setPaymentType('cash')} className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 font-bold transition-all ${paymentType === 'cash' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white'}`}>
                <Banknote size={24} /> Cash
             </button>
             <button onClick={() => setPaymentType('momo')} className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 font-bold transition-all ${paymentType === 'momo' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-slate-200 bg-white'}`}>
                <CreditCard size={24} /> Mobile Money
             </button>
          </div>

          {paymentType === 'cash' && (
            <div className="grid grid-cols-2 gap-4 mb-6 animate-in slide-in-from-bottom-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Cash Received</label>
                <input type="number" value={amountReceived} onChange={e => setAmountReceived(e.target.value)} className="w-full p-4 bg-white border border-slate-200 rounded-xl font-black text-xl" placeholder="0.00" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Change Due</label>
                <div className="w-full p-4 bg-slate-200 rounded-xl font-black text-xl">GHS {changeDue.toFixed(2)}</div>
              </div>
            </div>
          )}

          <button onClick={handleCheckout} className="w-full py-5 bg-blue-600 text-white font-black text-xl rounded-2xl shadow-xl shadow-blue-600/30 hover:bg-blue-700 transition-all">CHECKOUT (F9)</button>
        </div>
      </div>

      {/* Sidebar Products */}
      <div className="w-full lg:w-[400px] flex flex-col gap-4 order-1 lg:order-2">
        <div className="grid grid-cols-2 gap-4">
          <button onClick={() => setIsScanning(true)} className="flex items-center justify-center gap-2 p-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 shadow-sm"><ScanLine size={20} /> (F1) Scan</button>
          <button onClick={() => setBaskets(baskets.map(b => b.id === activeBasketId ? { ...b, items: [] } : b))} className="flex items-center justify-center gap-2 p-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 shadow-sm"><Trash2 size={20} /> Clear</button>
        </div>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input type="text" placeholder="Search product..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl font-bold outline-none" />
        </div>
        <div className="flex-1 bg-white border border-slate-200 rounded-3xl p-4 overflow-auto">
          <div className="grid grid-cols-2 gap-3">
             {products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).map(p => (
               <button key={p.id} onClick={() => handleScanSuccess(p.barcode || p.sku)} className="flex flex-col text-left p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:border-blue-300 transition-all">
                  <div className="font-bold text-slate-800 leading-tight mb-1">{p.name}</div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold self-start ${getCategoryColor(p.category)}`}>{p.category || 'General'}</span>
                  <div className="text-blue-600 font-black text-lg mt-2">GHS {p.sell_price.toFixed(2)}</div>
               </button>
             ))}
          </div>
        </div>
      </div>

      {/* Quick Add Modal */}
      {quickAdd && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8">
            <h3 className="text-2xl font-black mb-2">New Item Scanned</h3>
            <p className="text-slate-500 mb-6">Barcode: <span className="text-blue-600 font-bold">{quickAdd.barcode}</span></p>
            <form onSubmit={handleQuickAdd} className="space-y-4">
              <input required name="name" type="text" placeholder="Item Name" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl" autoFocus />
              <input required name="price" type="number" step="0.01" placeholder="Price (GHS)" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl" />
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setQuickAdd(null)} className="py-4 bg-slate-100 font-black rounded-xl">Skip</button>
                <button type="submit" className="py-4 bg-blue-600 text-white font-black rounded-xl">Save & Add</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Completed Sale Receipt Modal */}
      {completedSale && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="bg-green-500 p-6 text-center text-white">
              <CheckCircle size={48} className="mx-auto mb-2" />
              <h2 className="text-2xl font-black">Sale Completed</h2>
              <p className="font-bold opacity-80">Receipt #{completedSale.id}</p>
            </div>
            <div className="p-8 max-h-[50vh] overflow-auto">
              <div className="text-center mb-6">
                <h3 className="font-black text-xl">BillSpark POS</h3>
                <p className="text-xs text-slate-400">{completedSale.date}</p>
              </div>
              <div className="space-y-3 mb-6">
                {completedSale.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm font-bold">
                    <span>{item.qty}x {item.name}</span>
                    <span>GHS {(item.qty * item.price).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t-2 border-dashed pt-4 flex justify-between text-2xl font-black text-blue-600">
                <span>Total</span>
                <span>GHS {completedSale.total.toFixed(2)}</span>
              </div>
            </div>
            <div className="p-6 bg-slate-50 grid grid-cols-2 gap-3">
              <button onClick={shareReceiptWhatsApp} className="py-3 bg-green-600 text-white font-black rounded-xl flex items-center justify-center gap-2"><Share2 size={18} /> WhatsApp</button>
              <button onClick={() => window.print()} className="py-3 bg-white border border-slate-200 font-black rounded-xl flex items-center justify-center gap-2"><Printer size={18} /> Print</button>
              <button onClick={() => setCompletedSale(null)} className="col-span-2 py-4 bg-slate-800 text-white font-black rounded-xl mt-2">New Transaction</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
