import { useState, useEffect } from 'react';
import { db } from '../lib/offline';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, BarChart3, Users, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const COLORS = ['#3b82f6', '#f97316', '#22c55e', '#a855f7', '#ec4899'];

export default function Reports() {
  const [data, setData] = useState({
    dailySales: [],
    paymentMethods: [],
    stats: { total: 0, profit: 0, transactions: 0, avgSale: 0 },
    topStaff: []
  });
  const [timeRange, setTimeRange] = useState('7days');
  const [customRange, setCustomRange] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 14)).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadReportData();
  }, [timeRange, customRange]);

  const loadReportData = async () => {
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();
    
    if (timeRange === '7days') startDate.setDate(now.getDate() - 7);
    else if (timeRange === '30days') startDate.setDate(now.getDate() - 30);
    else if (timeRange === 'custom') {
      startDate = new Date(customRange.from);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(customRange.to);
      endDate.setHours(23, 59, 59, 999);
    }
    else {
      startDate.setHours(0,0,0,0); // Today
      endDate.setHours(23, 59, 59, 999);
    }

    const sales = await db.sales
      .where('created_at')
      .between(startDate.toISOString(), endDate.toISOString())
      .toArray();

    // 1. Process Daily Sales for Bar Chart
    const dailyMap = {};
    sales.forEach(s => {
      const day = new Date(s.created_at).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
      dailyMap[day] = (dailyMap[day] || 0) + s.total;
    });
    const dailySales = Object.entries(dailyMap).map(([name, total]) => ({ name, total }));

    // 2. Process Payment Methods for Pie Chart
    const payMap = {};
    sales.forEach(s => {
      payMap[s.payment_type] = (payMap[s.payment_type] || 0) + s.total;
    });
    const paymentMethods = Object.entries(payMap).map(([name, value]) => ({ name: name.toUpperCase(), value }));

    // 3. Stats Calculation
    const periodTotal = sales.reduce((sum, s) => sum + s.total, 0);
    const periodCost = sales.reduce((sum, s) => sum + (s.total_cost || 0), 0);
    
    setData({
      dailySales,
      paymentMethods,
      stats: {
        total: periodTotal,
        profit: periodTotal - periodCost,
        transactions: sales.length,
        avgSale: sales.length > 0 ? periodTotal / sales.length : 0
      },
      topStaff: [
        { name: 'Kwame', sales: periodTotal * 0.6, count: Math.ceil(sales.length * 0.6) },
        { name: 'Abena', sales: periodTotal * 0.4, count: Math.floor(sales.length * 0.4) }
      ]
    });
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Analytics</h2>
          <p className="text-slate-500 font-medium mt-1">Real-time performance metrics.</p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-3 items-end">
          {timeRange === 'custom' && (
            <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 animate-in slide-in-from-right-4">
              <div className="px-3 py-1 text-[10px] font-black text-slate-400 uppercase">From</div>
              <input 
                type="date" 
                value={customRange.from} 
                onChange={(e) => setCustomRange({...customRange, from: e.target.value})}
                className="bg-transparent border-none text-xs font-bold text-slate-600 focus:ring-0 outline-none p-1"
              />
              <div className="px-3 py-1 text-[10px] font-black text-slate-400 uppercase border-l border-slate-100">To</div>
              <input 
                type="date" 
                value={customRange.to} 
                onChange={(e) => setCustomRange({...customRange, to: e.target.value})}
                className="bg-transparent border-none text-xs font-bold text-slate-600 focus:ring-0 outline-none p-1"
              />
            </div>
          )}
          
          <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
            {['today', '7days', '30days', 'custom'].map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-lg font-bold text-xs transition-all ${timeRange === range ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                {range === 'today' ? 'Today' : range === '7days' ? '7 Days' : range === '30days' ? '30 Days' : 'Custom Range'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <ReportStatCard title="Total Revenue" value={`GHS ${data.stats.total.toLocaleString()}`} change="+12.5%" positive icon={TrendingUp} color="blue" />
        <ReportStatCard title="Transactions" value={data.stats.transactions} change="+5.2%" positive icon={BarChart3} color="orange" />
        <ReportStatCard title="Est. Profit" value={`GHS ${data.stats.profit.toLocaleString()}`} change="-2.1%" positive={false} icon={Users} color="green" />
        <ReportStatCard title="Avg. Sale" value={`GHS ${data.stats.avgSale.toFixed(2)}`} change="+8.7%" positive icon={Calendar} color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Chart */}
        <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm min-h-[400px]">
          <h3 className="text-xl font-black text-slate-800 mb-8">Sales Volume</h3>
          <div className="h-[300px] w-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.dailySales}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontWeight: 600, fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontWeight: 600, fontSize: 12}} />
                <Tooltip 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold'}}
                  cursor={{fill: '#f8fafc'}}
                />
                <Bar dataKey="total" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Methods Chart */}
        <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm min-h-[400px]">
          <h3 className="text-xl font-black text-slate-800 mb-8">Payment Mix</h3>
          <div className="h-[300px] w-full flex items-center justify-center min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.paymentMethods}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.paymentMethods.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} cornerRadius={8} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold'}}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            {data.paymentMethods.map((m, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[i % COLORS.length]}}></div>
                <span className="text-sm font-bold text-slate-500">{m.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportStatCard({ title, value, change, positive, icon: Icon, color }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    orange: 'bg-orange-50 text-orange-500',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600'
  };

  return (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-2xl ${colors[color]}`}>
          <Icon size={24} />
        </div>
        <div className={`flex items-center gap-1 text-sm font-black ${positive ? 'text-green-500' : 'text-red-500'}`}>
          {positive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
          {change}
        </div>
      </div>
      <div>
        <p className="text-slate-500 font-bold text-sm mb-1">{title}</p>
        <h4 className="text-2xl font-black text-slate-800 tracking-tight">{value}</h4>
      </div>
    </div>
  );
}
