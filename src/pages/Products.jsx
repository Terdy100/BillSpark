import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Edit2, X, ScanLine } from 'lucide-react';
import { db } from '../lib/offline';
import { playBeep } from '../utils/audio';
import BarcodeScanner from '../components/BarcodeScanner';
import { supabase } from '../lib/supabase';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', sku: '', barcode: '', price: '', stock: '', category: '' });

  useEffect(() => {
    loadProducts();
  }, []);

  const handleScanSuccess = useCallback((text) => {
    try { playBeep(); } catch (e) { console.warn('Beep error', e); }
    setIsScanning(false);
    setNewProduct(prev => ({ ...prev, barcode: text.trim() }));
  }, []);

  const loadProducts = async () => {
    const allProds = await db.products_cache.toArray();
    setProducts(allProds);
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.price) return alert("Name and price are required");
    
    try {
      const productPayload = {
        business_id: 'local_bus_1',
        name: newProduct.name,
        sku: newProduct.sku,
        barcode: newProduct.barcode,
        sell_price: parseFloat(newProduct.price),
        stock_qty: parseInt(newProduct.stock) || 0,
        category: newProduct.category || 'General',
      };

      let finalId = Date.now(); // fallback offline ID

      // Attempt Supabase Sync instantly if online
      if (navigator.onLine) {
        const { data: supaData, error } = await supabase
          .from('products')
          .insert([productPayload])
          .select()
          .single();
        
        if (!error && supaData) {
          finalId = supaData.id;
        } else {
          console.warn('Could not sync to Supabase, continuing offline:', error);
        }
      }

      await db.products_cache.add({ ...productPayload, id: finalId });
      
      setIsAdding(false);
      setNewProduct({ name: '', sku: '', barcode: '', price: '', stock: '', category: '' });
      loadProducts();
    } catch (err) {
      alert("Error saving product: " + err.message);
    }
  };

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku && p.sku.toLowerCase().includes(search.toLowerCase())) || (p.barcode && p.barcode.includes(search)));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Products</h2>
          <p className="text-slate-500 font-medium mt-1">Manage your catalogue and pricing.</p>
        </div>
        <button onClick={() => setIsAdding(true)} className="flex items-center justify-center w-full sm:w-auto gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-95">
          <Plus size={20} />
          Add Product
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
                <th className="p-6 whitespace-nowrap">Name</th>
                <th className="p-6 whitespace-nowrap">SKU / Barcode</th>
                <th className="p-6 whitespace-nowrap">Category</th>
                <th className="p-6 whitespace-nowrap">Price (GHS)</th>
                <th className="p-6 whitespace-nowrap">Stock</th>
                <th className="p-6 flex justify-end">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr><td colSpan="6" className="p-8 text-center text-slate-400 font-bold">No products found.</td></tr>
              ) : filtered.map(p => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-6 font-bold text-slate-800 whitespace-nowrap">{p.name}</td>
                  <td className="p-6 font-medium text-slate-500 whitespace-nowrap">{p.sku || p.barcode || '-'}</td>
                  <td className="p-6 whitespace-nowrap">
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 font-bold text-xs rounded-lg">{p.category || 'General'}</span>
                  </td>
                  <td className="p-6 font-black text-blue-600 whitespace-nowrap">{(p.sell_price || 0).toFixed(2)}</td>
                  <td className="p-6 font-bold text-slate-700 whitespace-nowrap">{p.stock_qty || 0}</td>
                  <td className="p-6 flex justify-end">
                    <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
                      <Edit2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Product Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white p-6 rounded-3xl shadow-xl w-full max-w-md my-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-xl text-slate-800">New Product</h3>
              <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-700"><X size={24} /></button>
            </div>
            <form onSubmit={handleAddProduct} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-1">Name</label>
                <input required type="text" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" placeholder="e.g. Verna Water" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">Price (GHS)</label>
                  <input required type="number" step="0.01" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">Stock</label>
                  <input type="number" value={newProduct.stock} onChange={e => setNewProduct({...newProduct, stock: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" placeholder="0" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">SKU</label>
                  <input type="text" value={newProduct.sku} onChange={e => setNewProduct({...newProduct, sku: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" placeholder="Optional" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">Barcode</label>
                  <div className="flex gap-2">
                    <input type="text" value={newProduct.barcode} onChange={e => setNewProduct({...newProduct, barcode: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" placeholder="Code" />
                    <button type="button" onClick={() => setIsScanning(true)} className="bg-blue-100 hover:bg-blue-200 text-blue-600 p-3 rounded-xl transition-colors">
                      <ScanLine size={20} />
                    </button>
                  </div>
                </div>
              </div>
              <button type="submit" className="w-full py-4 mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all">
                Save Product
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal */}
      {isScanning && (
        <BarcodeScanner 
          title="Scan Barcode to Fill"
          onScan={handleScanSuccess} 
          onClose={() => setIsScanning(false)} 
        />
      )}
    </div>
  );
}
