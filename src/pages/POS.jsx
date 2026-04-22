import { useState, useEffect, useCallback } from 'react';
import { db, saveSaleOffline } from '../lib/offline';
import { Search, ScanLine, Trash2, CreditCard, Banknote, ShoppingCart, CheckCircle, Printer, Share2, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { playBeep, initAudio, getAudioState, playCheckoutSound } from '../utils/audio';
import BarcodeScanner from '../components/BarcodeScanner';

export default function POS() {
  const [products, setProducts] = useState([]);
  const [baskets, setBaskets] = useState([{ id: 1, name: 'Basket 1', items: [] }]);
  const [activeBasketId, setActiveBasketId] = useState(1);
  const [isScanning, setIsScanning] = useState(false);
  const [scanFeedback, setScanFeedback] = useState(null);
  const [audioEnabled, setAudioEnabled] = useState(getAudioState());
  const [paymentType, setPaymentType] = useState('cash');
  const [amountReceived, setAmountReceived] = useState('');
  const [completedSale, setCompletedSale] = useState(null);

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

  // UI Keyboard Shortcuts (Silent support, no labels)
  useEffect(() => {
    const handleShortcuts = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'F1') { e.preventDefault(); setIsScanning(prev => !prev); }
      if (e.key === 'F9') { e.preventDefault(); handleCheckout(); }
      if (e.key === 'Escape') {
        if (isScanning) setIsScanning(false);
        if (completedSale) setCompletedSale(null);
      }
    };
    window.addEventListener('keydown', handleShortcuts);
    return () => window.removeEventListener('keydown', handleShortcuts);
  }, [isScanning, completedSale, activeBasketId]);

  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setCurrentUser(session.user);
    });
  }, []);

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
        showFeedback(`Added ${product.name}!`, true);
      }
    } else {
      showFeedback(`Product not found!`, false);
    }
    // Scanner stays open (continuous) because we don't call setIsScanning(false) here.
  }, [products, activeBasketId]);

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
      business_id: currentUser?.id || 'offline_bus',
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
    try {
      const settings = JSON.parse(localStorage.getItem('billspark_settings') || '{}');
      const shopName = (settings.name || 'BillSpark POS').toUpperCase();
      
      // Receipt Header
      let msg = `*RECEIPT: ${shopName}*\n`;
      msg += `ID: #${completedSale.id} | ${completedSale.date}\n`;
      msg += `--------------------------\n`;
      
      // Monospaced Table for Items
      msg += "```\n";
      const items = completedSale.items || [];
      items.forEach(item => {
        const qtyName = `${item.qty}x ${item.name}`;
        const price = (item.qty * item.price).toFixed(2);
        // Pad the name to 18 chars, then add the price
        const padding = Math.max(1, 20 - qtyName.length);
        msg += `${qtyName}${" ".repeat(padding)}${price}\n`;
      });
      msg += "```\n";
      
      msg += `--------------------------\n`;
      msg += `*TOTAL: GHS ${completedSale.total.toFixed(2)}*\n`;
      msg += `Method: ${completedSale.payment_type.toUpperCase()}\n`;

      if (completedSale.payment_type === 'cash') {
        msg += `Paid: GHS ${completedSale.amount_received.toFixed(2)}\n`;
        msg += `Change: GHS ${completedSale.change_due.toFixed(2)}\n`;
      }

      msg += `\n_Thank you for your business!_\n`;
      msg += `*BillSpark Smart POS*`;

      const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
      window.open(whatsappUrl, '_blank');
    } catch (err) {
      console.error('WhatsApp Share Error:', err);
      alert('Could not share to WhatsApp.');
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 bg-slate-50/50 -m-4 p-4 lg:-m-8 lg:p-8 min-h-[calc(100vh-4rem)] relative">
      {!audioEnabled && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700 p-8 rounded-[2rem] text-center max-w-sm">
            <h2 className="text-2xl font-black text-white mb-4">Enable Sound</h2>
            <p className="text-slate-400 mb-6 font-bold">Sound feedback is needed for scanning.</p>
            <button onClick={handleEnableAudio} className="w-full py-4 bg-blue-600 text-white font-black rounded-xl shadow-lg">🔊 Enable Sound</button>
          </div>
        </div>
      )}
      
      {scanFeedback && (
        <div className={`fixed top-8 left-1/2 -translate-x-1/2 px-8 py-4 rounded-full font-black text-lg shadow-2xl z-[100] flex items-center justify-center gap-3 ${scanFeedback.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
          {scanFeedback.message}
        </div>
      )}

      {isScanning && (
        <BarcodeScanner onScan={handleScanSuccess} onClose={() => setIsScanning(false)} continuous={true} />
      )}

      {/* Shopping Baskets Area */}
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
            <div className="h-full flex flex-col items-center justify-center text-slate-300 py-20">
               <ShoppingCart size={64} className="mb-4 opacity-10" />
               <p className="font-bold">Scanning area is ready!</p>
               <p className="text-sm font-bold">Start scanning items to begin sale.</p>
            </div>
          ) : activeBasket.items.map(item => (
            <div key={item.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex-1">
                <h4 className="font-bold text-slate-800">{item.name}</h4>
                <div className="text-blue-600 font-bold text-sm">GHS {item.sell_price.toFixed(2)}</div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center bg-white rounded-xl border border-slate-200">
                  <button onClick={() => updateQty(item.id, -1)} className="px-3 py-2 text-slate-600">-</button>
                  <button onClick={() => {
                      const n = prompt("Enter Quantity:", item.qty);
                      if (n && !isNaN(n)) updateQty(item.id, parseInt(n) - item.qty);
                  }} className="px-4 font-black">{item.qty}</button>
                  <button onClick={() => updateQty(item.id, 1)} className="px-3 py-2 text-slate-600">+</button>
                </div>
                <div className="w-24 text-right font-black">GHS {(item.sell_price * item.qty).toFixed(2)}</div>
                <button onClick={() => removeFromBasket(item.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={20} /></button>
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
             <button onClick={() => setPaymentType('cash')} className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 font-bold transition-all ${paymentType === 'cash' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-500'}`}>
                <Banknote size={24} /> Cash
             </button>
             <button onClick={() => setPaymentType('momo')} className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 font-bold transition-all ${paymentType === 'momo' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-slate-200 bg-white text-slate-500'}`}>
                <CreditCard size={24} /> Mobile Money
             </button>
          </div>

          {paymentType === 'cash' && (
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Cash Received</label>
                <input type="number" value={amountReceived} onChange={e => setAmountReceived(e.target.value)} className="w-full p-4 bg-white border border-slate-200 rounded-xl font-black text-xl outline-none focus:border-blue-500" placeholder="0.00" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Change Due</label>
                <div className="w-full p-4 bg-slate-200 rounded-xl font-black text-xl">GHS {changeDue.toFixed(2)}</div>
              </div>
            </div>
          )}

          <button onClick={handleCheckout} className="w-full py-5 bg-blue-600 text-white font-black text-xl rounded-2xl shadow-xl shadow-blue-600/30 hover:bg-blue-700 transition-all">CHECKOUT</button>
        </div>
      </div>

      {/* Control Sidebar */}
      <div className="w-full lg:w-[400px] flex flex-col gap-4 order-1 lg:order-2">
        <button 
          onClick={() => setIsScanning(true)} 
          className="flex items-center justify-center gap-4 py-8 bg-blue-600 text-white rounded-3xl font-black text-2xl shadow-xl shadow-blue-600/20 active:scale-95 transition-all"
        >
          <ScanLine size={32} /> Scan
        </button>
        
        <button 
          onClick={() => setBaskets(baskets.map(b => b.id === activeBasketId ? { ...b, items: [] } : b))} 
          className="flex items-center justify-center gap-2 py-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-500 hover:text-red-500 transition-all"
        >
          <Trash2 size={20} /> Clear Basket
        </button>

        <div className="mt-auto hidden lg:block">
           <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100">
               <h4 className="font-black text-blue-700 mb-1">Stock Reminder</h4>
               <p className="text-blue-600/70 text-sm font-bold">Scanning will warn you if any scanned item is low on stock.</p>
           </div>
        </div>
      </div>

      {/* Completed Sale Receipt Modal */}
      {completedSale && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div id="print-receipt" className="bg-white">
              <div className="bg-green-500 p-8 text-center text-white">
                <CheckCircle size={48} className="mx-auto mb-2 no-print" />
                <h3 className="text-2xl font-black">Sale Completed</h3>
                <p className="font-bold opacity-80 uppercase tracking-widest text-xs">Receipt Order #{completedSale.id}</p>
              </div>
              <div className="p-8 max-h-[60vh] overflow-auto print:max-h-none print:overflow-visible">
                <div className="text-center mb-6">
                  <img src="/BillSpark Logo.png" alt="Logo" className="h-12 w-auto mx-auto mb-4" />
                  <h3 className="font-black text-2xl text-slate-800 uppercase tracking-tight">{JSON.parse(localStorage.getItem('billspark_settings') || '{}').name || 'BillSpark POS'}</h3>
                  <p className="text-sm text-slate-500 font-bold">{JSON.parse(localStorage.getItem('billspark_settings') || '{}').address || 'Accra, Ghana'}</p>
                  <p className="text-sm text-slate-500 font-bold">{JSON.parse(localStorage.getItem('billspark_settings') || '{}').phone || ''}</p>
                  <div className="border-t border-slate-100 my-4"></div>
                  <p className="text-xs text-slate-400 font-bold">{completedSale.date}</p>
                </div>
                <div className="space-y-3 mb-6">
                  {completedSale.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm font-bold">
                      <span className="text-slate-600">{item.qty}x {item.name}</span>
                      <span className="text-slate-800">GHS {(item.qty * item.price).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t-2 border-dashed border-slate-200 pt-4 space-y-2">
                  <div className="flex justify-between text-lg font-bold text-slate-500">
                    <span>Subtotal</span>
                    <span>GHS {completedSale.total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-2xl font-black text-blue-600">
                    <span>Total</span>
                    <span>GHS {completedSale.total.toFixed(2)}</span>
                  </div>
                </div>
                <div className="mt-8 pt-4 border-t border-slate-100 text-center">
                  <p className="text-[10px] font-black text-slate-300 uppercase letter tracking-widest">Powered by BillSpark POS</p>
                </div>
              </div>
            </div>
            <div className="p-6 bg-slate-50 grid grid-cols-2 gap-3 border-t border-slate-200 no-print">
              <button onClick={shareReceiptWhatsApp} className="py-3 bg-green-600 text-white font-black rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95"><Share2 size={18} /> WhatsApp</button>
              <button onClick={() => window.print()} className="py-3 bg-white border border-slate-200 font-black rounded-xl flex items-center justify-center gap-2 text-slate-700 transition-transform active:scale-95 text-sm font-sans tracking-tight"><Printer size={18} /> Print Receipt</button>
              <button onClick={() => setCompletedSale(null)} className="col-span-2 py-4 bg-slate-800 text-white font-black rounded-xl mt-1 transition-transform active:scale-95 uppercase tracking-widest">Done / New Sale</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
