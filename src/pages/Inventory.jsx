import { AlertTriangle, Archive, PackagePlus, PackageMinus } from 'lucide-react';

export default function Inventory() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Inventory</h2>
          <p className="text-slate-500 font-medium mt-1">Control your stock levels.</p>
        </div>
        <div className="flex gap-4">
          <button className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-bold rounded-xl shadow-sm transition-all">
            <PackageMinus size={20} className="text-red-500" />
            Remove damaged
          </button>
          <button className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all">
            <PackagePlus size={20} />
            Receive Stock
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-2 text-blue-600">
            <Archive size={24} />
            <h3 className="font-bold">Total Items in Stock</h3>
          </div>
          <p className="text-4xl font-black text-slate-800">1,245</p>
        </div>
        <div className="bg-orange-50 p-6 rounded-3xl shadow-sm border border-orange-100">
          <div className="flex items-center gap-3 mb-2 text-orange-600">
            <AlertTriangle size={24} />
            <h3 className="font-bold">Low Stock Items</h3>
          </div>
          <p className="text-4xl font-black text-orange-700">12</p>
        </div>
        <div className="bg-red-50 p-6 rounded-3xl shadow-sm border border-red-100">
          <div className="flex items-center gap-3 mb-2 text-red-600">
            <AlertTriangle size={24} />
            <h3 className="font-bold">Out of Stock</h3>
          </div>
          <p className="text-4xl font-black text-red-700">3</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 text-center text-slate-500">
        <p className="font-bold">Stock management table coming soon in next phase...</p>
      </div>
    </div>
  );
}
