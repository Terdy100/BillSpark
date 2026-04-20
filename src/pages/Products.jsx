import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Edit2, X, ScanLine, Trash2 } from 'lucide-react';
import { db } from '../lib/offline';
import { playBeep } from '../utils/audio';
import BarcodeScanner from '../components/BarcodeScanner';
import { supabase } from '../lib/supabase';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [modalState, setModalState] = useState({ isOpen: false, mode: 'add', product: null });
  const [isScanning, setIsScanning] = useState(false);
  const [form, setForm] = useState({ name: '', sku: '', barcode: '', price: '', cost: '', stock: '', category: '' });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const allProds = await db.products_cache.toArray();
    setProducts(allProds);
  };

  const handleScanSuccess = useCallback((text) => {
    try { playBeep(); } catch (e) { console.warn('Beep error', e); }
    setIsScanning(false);
    setForm(prev => ({ ...prev, barcode: text.trim() }));
  }, []);

  const openForm = (mode, product = null) => {
    setModalState({ isOpen: true, mode, product });
    if (product) {
      setForm({
        name: product.name,
        sku: product.sku || '',
        barcode: product.barcode || '',
        price: product.sell_price.toString(),
        cost: (product.cost_price || '').toString(),
        stock: product.stock_qty.toString(),
        category: product.category || ''
      });
    } else {
      setForm({ name: '', sku: '', barcode: '', price: '', cost: '', stock: '', category: '' });
    }
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!form.name || !form.price) return alert("Name and price are required");
    
    try {
      const productPayload = {
        business_id: 'local_bus_1',
        name: form.name,
        sku: form.sku,
        barcode: form.barcode,
        sell_price: parseFloat(form.price),
        cost_price: parseFloat(form.cost) || 0,
        stock_qty: parseInt(form.stock) || 0,
        category: form.category || 'General',
      };

      if (modalState.mode === 'add') {
        let finalId = Date.now();
        if (navigator.onLine) {
          const { data, error } = await supabase.from('products').insert([productPayload]).select().single();
          if (!error && data) finalId = data.id;
        }
        await db.products_cache.add({ ...productPayload, id: finalId });
      } else {
        // Edit Mode
        const productId = modalState.product.id;
        if (navigator.onLine && typeof productId === 'string' && productId.length > 20) {
           await supabase.from('products').update(productPayload).eq('id', productId);
        }
        await db.products_cache.update(productId, productPayload);
      }
      
      setModalState({ isOpen: false, mode: 'add', product: null });
      loadProducts();
    } catch (err) {
      alert("Error saving product: " + err.message);
    }
  };

  const handleDelete = async (productId) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      if (navigator.onLine && typeof productId === 'string' && productId.length > 20) {
        await supabase.from('products').delete().eq('id', productId);
      }
      await db.products_cache.delete(productId);
      loadProducts();
    } catch (err) {
      alert("Error deleting: " + err.message);
    }
  };

  const filtered = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    (p.sku && p.sku.toLowerCase().includes(search.toLowerCase())) || 
    (p.barcode && p.barcode.includes(search))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Products</h2>
          <p className="text-slate-500 font-medium mt-1">Manage your catalogue and pricing.</p>
        </div>
        <button onClick={() => openForm('add')} className="flex items-center justify-center w-full sm:w-auto gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-95">
          <Plus size={20} /> Add Product
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="relative w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Search products..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-200 text-slate-400 font-bold text-sm uppercase tracking-wider">
                <th className="p-6">Name</th>
                <th className="p-6">SKU / Barcode</th>
                <th className="p-6">Category</th>
                <th className="p-6">Price (GHS)</th>
                <th className="p-6">Stock</th>
                <th className="p-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr><td colSpan="6" className="p-8 text-center text-slate-400 font-bold">No products found.</td></tr>
              ) : filtered.map(p => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-6 font-bold text-slate-800">{p.name}</td>
                  <td className="p-6 font-medium text-slate-500">{p.sku || p.barcode || '-'}</td>
                  <td className="p-6">
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 font-bold text-xs rounded-lg">{p.category || 'General'}</span>
                  </td>
                  <td className="p-6 font-black text-blue-600">{(p.sell_price || 0).toFixed(2)}</td>
                  <td className="p-6 font-bold text-slate-700">{p.stock_qty || 0}</td>
                  <td className="p-6 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openForm('edit', p)} className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => handleDelete(p.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalState.isOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white p-6 rounded-3xl shadow-xl w-full max-w-md my-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-xl text-slate-800">{modalState.mode === 'add' ? 'New Product' : 'Edit Product'}</h3>
              <button onClick={() => setModalState({ ...modalState, isOpen: false })} className="text-slate-400 hover:text-slate-700"><X size={24} /></button>
            </div>
            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-1">Name</label>
                <input required type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" placeholder="e.g. Verna Water" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">Selling Price (GHS)</label>
                  <input required type="number" step="0.01" value={form.price} onChange={e => setForm({...form, price: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">Cost Price (GHS)</label>
                  <input type="number" step="0.01" value={form.cost} onChange={e => setForm({...form, cost: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" placeholder="0.00" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">Stock Units</label>
                  <input type="number" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">Category</label>
                  <input type="text" value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" placeholder="e.g. Drinks" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">SKU</label>
                  <input type="text" value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" placeholder="Optional" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">Barcode</label>
                  <div className="flex gap-2">
                    <input type="text" value={form.barcode} onChange={e => setForm({...form, barcode: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" placeholder="Code" />
                    <button type="button" onClick={() => setIsScanning(true)} className="bg-blue-100 hover:bg-blue-200 text-blue-600 p-3 rounded-xl transition-colors">
                      <ScanLine size={20} />
                    </button>
                  </div>
                </div>
              </div>
              <button type="submit" className="w-full py-4 mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all">
                {modalState.mode === 'add' ? 'Save Product' : 'Update Product'}
              </button>
            </form>
          </div>
        </div>
      )}

      {isScanning && (
        <BarcodeScanner title="Scan Barcode to Fill" onScan={handleScanSuccess} onClose={() => setIsScanning(false)} />
      )}
    </div>
  );
}
