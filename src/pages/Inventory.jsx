import { useState, useEffect } from 'react';
import { AlertTriangle, Archive, PackagePlus, PackageMinus, Search, RefreshCw, X } from 'lucide-react';
import { db } from '../lib/offline';

const LOW_STOCK_THRESHOLD = 10;

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all'); // all, low, out
  const [adjustingStock, setAdjustingStock] = useState(null); // { product, type: 'add' | 'sub' }
  const [adjustmentQty, setAdjustmentQty] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const all = await db.products_cache.toArray();
    setProducts(all);
  };

  const handleAdjustStock = async (e) => {
    e.preventDefault();
    if (!adjustingStock || !adjustmentQty) return;

    const qty = parseInt(adjustmentQty);
    const newQty = adjustingStock.type === 'add' 
      ? (adjustingStock.product.stock_qty || 0) + qty 
      : (adjustingStock.product.stock_qty || 0) - qty;

    try {
      await db.products_cache.update(adjustingStock.product.id, { stock_qty: Math.max(0, newQty) });
      setAdjustingStock(null);
      setAdjustmentQty('');
      loadProducts();
    } catch (err) {
      alert("Error adjusting stock: " + err.message);
    }
  };

  const filtered = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || (p.barcode && p.barcode.includes(searchTerm));
    if (filter === 'low') return matchesSearch && p.stock_qty > 0 && p.stock_qty <= LOW_STOCK_THRESHOLD;
    if (filter === 'out') return matchesSearch && p.stock_qty <= 0;
    return matchesSearch;
  });

  const stats = {
    total: products.reduce((sum, p) => sum + (p.stock_qty || 0), 0),
    low: products.filter(p => p.stock_qty > 0 && p.stock_qty <= LOW_STOCK_THRESHOLD).length,
    out: products.filter(p => !p.stock_qty || p.stock_qty <= 0).length
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Inventory</h2>
          <p className="text-slate-500 font-medium mt-1">Control your stock levels.</p>
        </div>
        <div className="flex gap-2">
           <button onClick={loadProducts} className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
            <RefreshCw size={20} className="text-slate-500" />
           </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div onClick={() => setFilter('all')} className={`cursor-pointer p-6 rounded-3xl border-2 transition-all ${filter === 'all' ? 'border-blue-500 bg-white shadow-lg' : 'border-slate-100 bg-white hover:border-blue-200'}`}>
          <div className="flex items-center gap-3 mb-2 text-blue-600">
            <Archive size={24} />
            <h3 className="font-bold">Total Stock Units</h3>
          </div>
          <p className="text-4xl font-black text-slate-800">{stats.total.toLocaleString()}</p>
        </div>
        
        <div onClick={() => setFilter('low')} className={`cursor-pointer p-6 rounded-3xl border-2 transition-all ${filter === 'low' ? 'border-orange-500 bg-orange-50 shadow-lg' : 'border-orange-100 bg-orange-50/50 hover:border-orange-300'}`}>
          <div className="flex items-center gap-3 mb-2 text-orange-600">
            <AlertTriangle size={24} />
            <h3 className="font-bold">Low Stock Items</h3>
          </div>
          <p className="text-4xl font-black text-orange-700">{stats.low}</p>
        </div>

        <div onClick={() => setFilter('out')} className={`cursor-pointer p-6 rounded-3xl border-2 transition-all ${filter === 'out' ? 'border-red-500 bg-red-50 shadow-lg' : 'border-red-100 bg-red-50/50 hover:border-red-300'}`}>
          <div className="flex items-center gap-3 mb-2 text-red-600">
            <AlertTriangle size={24} />
            <h3 className="font-bold">Out of Stock</h3>
          </div>
          <p className="text-4xl font-black text-red-700">{stats.out}</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Search by name or barcode..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-xl font-medium outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none w-full"
          >
            <option value="all">All Products</option>
            <option value="low">Low Stock Only</option>
            <option value="out">Out of Stock Only</option>
          </select>
        </div>
      </div>

      {/* Stock Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold text-xs uppercase tracking-wider">
                <th className="p-6">Product Item</th>
                <th className="p-6 text-center">Status</th>
                <th className="p-6 text-center">In Stock</th>
                <th className="p-6 text-right">Adjust Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-12 text-center text-slate-400 font-bold">
                    No matching inventory items found.
                  </td>
                </tr>
              ) : filtered.map(product => {
                const isOut = (product.stock_qty || 0) <= 0;
                const isLow = (product.stock_qty || 0) <= LOW_STOCK_THRESHOLD;

                return (
                  <tr key={product.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-6">
                      <div className="font-bold text-slate-800">{product.name}</div>
                      <div className="text-xs font-medium text-slate-400">{product.barcode || product.sku || 'No Barcode'}</div>
                    </td>
                    <td className="p-6">
                      <div className="flex justify-center">
                        {isOut ? (
                          <span className="px-3 py-1 bg-red-100 text-red-600 text-[10px] uppercase font-black rounded-lg">Out of Stock</span>
                        ) : isLow ? (
                          <span className="px-3 py-1 bg-orange-100 text-orange-600 text-[10px] uppercase font-black rounded-lg">Low Stock</span>
                        ) : (
                          <span className="px-3 py-1 bg-green-100 text-green-600 text-[10px] uppercase font-black rounded-lg">Good Stock</span>
                        )}
                      </div>
                    </td>
                    <td className="p-6 text-center">
                      <div className={`text-2xl font-black ${isOut ? 'text-red-500' : isLow ? 'text-orange-500' : 'text-slate-800'}`}>
                        {product.stock_qty || 0}
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => setAdjustingStock({ product, type: 'sub' })}
                          className="p-2 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all"
                          title="Remove damaged/lost"
                        >
                          <PackageMinus size={18} />
                        </button>
                        <button 
                          onClick={() => setAdjustingStock({ product, type: 'add' })}
                          className="p-2 bg-blue-50 text-blue-500 hover:bg-blue-500 hover:text-white rounded-lg transition-all"
                          title="Receive new stock"
                        >
                          <PackagePlus size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Adjustment Modal */}
      {adjustingStock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95">
            <div className={`p-6 text-center text-white ${adjustingStock.type === 'add' ? 'bg-blue-600' : 'bg-red-600'}`}>
              <h3 className="text-xl font-black">Stock Adjustment</h3>
              <p className="opacity-90 font-medium">{adjustingStock.product.name}</p>
            </div>
            
            <form onSubmit={handleAdjustStock} className="p-8">
              <label className="block text-sm font-bold text-slate-600 mb-2 text-center">
                Quantity to {adjustingStock.type === 'add' ? 'Add' : 'Remove'}
              </label>
              <input 
                autoFocus
                type="number"
                required
                value={adjustmentQty}
                onChange={(e) => setAdjustmentQty(e.target.value)}
                className="w-full p-4 bg-slate-100 border-none rounded-2xl text-3xl font-black text-center outline-none focus:ring-4 focus:ring-blue-100"
                placeholder="0"
              />
              
              <div className="grid grid-cols-2 gap-4 mt-8">
                <button 
                  type="button" 
                  onClick={() => setAdjustingStock(null)}
                  className="py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all font-sans"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className={`py-3 text-white font-bold rounded-xl shadow-lg transition-all font-sans ${adjustingStock.type === 'add' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20' : 'bg-red-600 hover:bg-red-700 shadow-red-500/20'}`}
                >
                  Update Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
