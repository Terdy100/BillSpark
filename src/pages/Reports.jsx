import { BarChart3, TrendingUp, Users } from 'lucide-react';

export default function Reports() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Reports</h2>
          <p className="text-slate-500 font-medium mt-1">Analytics and sales performance.</p>
        </div>
        
        <select className="px-4 py-2 bg-white border border-slate-200 rounded-xl font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option>Today</option>
          <option>This Week</option>
          <option>This Month</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-4 text-blue-600">
            <TrendingUp size={24} />
            <h3 className="font-bold">Total Sales</h3>
          </div>
          <p className="text-3xl font-black text-slate-800 mb-2">GHS 4,500.00</p>
          <p className="text-sm font-medium text-green-500">+12% from previous period</p>
        </div>
        
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-4 text-green-600">
            <BarChart3 size={24} />
            <h3 className="font-bold">Estimated Profit</h3>
          </div>
          <p className="text-3xl font-black text-slate-800 mb-2">GHS 1,250.00</p>
          <p className="text-sm font-medium text-green-500">+8% from previous period</p>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-4 text-purple-600">
            <Users size={24} />
            <h3 className="font-bold">Top Staff</h3>
          </div>
          <p className="text-xl font-black text-slate-800 mb-1">Kwame</p>
          <p className="text-sm font-medium text-slate-500">45 transactions handles</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 min-h-[300px] flex items-center justify-center">
          <p className="font-bold text-slate-400">Sales Chart Placeholder</p>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 min-h-[300px] flex items-center justify-center">
          <p className="font-bold text-slate-400">Payment Methods Chart</p>
        </div>
      </div>
    </div>
  );
}
