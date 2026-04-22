import { useState, useEffect } from 'react';
import { db } from '../lib/offline';
import { Calendar, ShoppingBag, Receipt, ChevronRight, Share2, Printer, Search, X, CheckCircle2, Clock } from 'lucide-react';

export default function SalesHistory() {
  const [sales, setSales] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSale, setSelectedSale] = useState(null);
  const [saleItems, setSaleItems] = useState([]);

  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
      const allSales = await db.sales
        .where('business_id')
        .equals(session.user.id)
        .reverse()
        .sortBy('created_at');
      setSales(allSales);
    }
  };

  const viewSaleDetails = async (sale) => {
    const items = await db.sale_items.where('sale_id').equals(sale.id).toArray();
    setSaleItems(items);
    setSelectedSale(sale);
  };

  const shareReceiptWhatsApp = (sale, items) => {
    try {
      const settings = JSON.parse(localStorage.getItem('billspark_settings') || '{}');
      const shopName = (settings.name || 'BillSpark POS').toUpperCase();
      
      let msg = `*REPRINT RECEIPT: ${shopName}*\n`;
      msg += `ID: #${sale.id} | ${new Date(sale.created_at).toLocaleString()}\n`;
      msg += `--------------------------\n`;
      
      msg += "```\n";
      (items || []).forEach(item => {
        const qtyName = `${item.qty}x ${item.name || 'Item'}`;
        const price = (item.qty * item.price).toFixed(2);
        const padding = Math.max(1, 20 - qtyName.length);
        msg += `${qtyName}${" ".repeat(padding)}${price}\n`;
      });
      msg += "```\n";
      
      msg += `--------------------------\n`;
      msg += `*TOTAL: GHS ${sale.total.toFixed(2)}*\n`;
      msg += `Method: ${sale.payment_type.toUpperCase()}\n`;

      if (sale.payment_type === 'cash') {
        msg += `Paid: GHS ${sale.amount_received.toFixed(2)}\n`;
        msg += `Change: GHS ${sale.change_due.toFixed(2)}\n`;
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

  const filteredSales = sales.filter(s => 
    s.id.toString().includes(searchTerm) || 
    s.payment_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Sales History</h2>
        <p className="text-slate-500 font-medium mt-1">Review past transactions and reprint receipts.</p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="text" 
          placeholder="Search by receipt number or payment type..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 shadow-sm"
        />
      </div>

      {/* Sales List */}
      <div className="space-y-3">
        {filteredSales.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border-2 border-dashed border-slate-200 text-center text-slate-400 font-bold">
            <ShoppingBag size={48} className="mx-auto mb-4 opacity-10" />
            No sales found for this period.
          </div>
        ) : filteredSales.map(sale => (
          <div 
            key={sale.id} 
            onClick={() => viewSaleDetails(sale)}
            className="group bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-500 hover:shadow-md transition-all cursor-pointer flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${sale.synced ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
                <Receipt size={24} />
              </div>
              <div>
                <div className="font-black text-slate-800 text-lg">GHS {sale.total.toFixed(2)}</div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                  <Clock size={12} />
                  {new Date(sale.created_at).toLocaleString()}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="hidden md:block text-right text-sm">
                <div className="font-black text-slate-500 uppercase">{sale.payment_type}</div>
                <div className={`font-bold ${sale.synced ? 'text-green-500' : 'text-orange-500'}`}>
                  {sale.synced ? 'Synced' : 'Pending Sync'}
                </div>
              </div>
              <ChevronRight className="text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" size={24} />
            </div>
          </div>
        ))}
      </div>

      {/* Receipt Modal */}
      {selectedSale && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-black text-xl text-slate-800">Reprint Receipt</h3>
              <button onClick={() => setSelectedSale(null)} className="text-slate-400 hover:text-slate-700 p-2"><X size={24} /></button>
            </div>

            <div id="print-receipt" className="bg-white">
              <div className="bg-blue-600 p-8 text-center text-white">
                <h3 className="text-2xl font-black">Reprint Receipt</h3>
                <p className="font-bold opacity-80 uppercase tracking-widest text-xs">Original ID: #{selectedSale.id}</p>
              </div>

              <div className="p-8 max-h-[60vh] overflow-auto print:max-h-none print:overflow-visible">
                <div className="text-center mb-6">
                  <img src="/BillSpark Logo.png" alt="Logo" className="h-12 w-auto mx-auto mb-4" />
                  <h3 className="font-black text-2xl text-slate-800 uppercase tracking-tight">{JSON.parse(localStorage.getItem('billspark_settings') || '{}').name || 'BillSpark POS'}</h3>
                  <p className="text-sm text-slate-500 font-bold">{JSON.parse(localStorage.getItem('billspark_settings') || '{}').address || 'Accra, Ghana'}</p>
                  <p className="text-sm text-slate-500 font-bold">{JSON.parse(localStorage.getItem('billspark_settings') || '{}').phone || ''}</p>
                  <div className="border-t border-slate-100 my-4"></div>
                  <p className="text-xs text-slate-400 font-bold">{new Date(selectedSale.created_at).toLocaleString()}</p>
                </div>

                <div className="space-y-4 mb-6">
                  {saleItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm font-bold">
                      <span className="text-slate-600">{item.qty}x {item.name || 'Item'}</span>
                      <span className="text-slate-800">GHS {(item.qty * item.price).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t-2 border-dashed border-slate-200 pt-4 space-y-2">
                  <div className="flex justify-between text-2xl font-black text-blue-600">
                    <span>Total Paid</span>
                    <span>GHS {selectedSale.total.toFixed(2)}</span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 text-sm font-bold text-slate-500">
                  <div className="flex justify-between">
                    <span>Payment Method</span>
                    <span className="uppercase">{selectedSale.payment_type}</span>
                  </div>
                  {selectedSale.payment_type === 'cash' && (
                    <div className="flex justify-between mt-1 text-green-600">
                      <span>Change Given</span>
                      <span>GHS {selectedSale.change_due.toFixed(2)}</span>
                    </div>
                  )}
                </div>
                
                <div className="mt-8 pt-4 border-t border-slate-100 text-center">
                  <p className="text-[10px] font-black text-slate-300 uppercase letter tracking-widest">Reprinted from BillSpark POS</p>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-200 grid grid-cols-2 gap-3 no-print">
              <button 
                onClick={() => shareReceiptWhatsApp(selectedSale, saleItems)}
                className="flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 text-white font-black rounded-xl transition-all shadow-lg active:scale-95"
              >
                <Share2 size={18} /> WhatsApp
              </button>
              <button 
                onClick={() => window.print()}
                className="flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-black rounded-xl transition-all active:scale-95"
              >
                <Printer size={18} /> Print
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
