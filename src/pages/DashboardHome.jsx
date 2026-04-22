import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { db, getUnsyncedSales } from '../lib/offline';
import { DollarSign, Activity, AlertTriangle, RefreshCw, ShoppingCart } from 'lucide-react';

export default function DashboardHome() {
  const [stats, setStats] = useState({
    todaySales: 0,
    transactions: 0,
    profit: 0,
    unsynced: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;

      const bizId = session.user.id;

      // 1. Get Today's Date Range
      const now = new Date();
      const startOfDay = new Date(now.setHours(0,0,0,0)).toISOString();
      const endOfDay = new Date(now.setHours(23,59,59,999)).toISOString();

      // 2. Query Today's Sales (Filtered by bizId)
      const todaySalesData = await db.sales
        .where('business_id')
        .equals(bizId)
        .and(s => s.created_at >= startOfDay && s.created_at <= endOfDay)
        .toArray();

      const todayTotal = todaySalesData.reduce((sum, s) => sum + s.total, 0);
      
      // 3. Get Unsynced Count (Filtered by bizId)
      const unsynced = await db.sales
        .where('business_id')
        .equals(bizId)
        .and(s => s.synced === 0)
        .toArray();
      
      // 4. Calculate Estimate Profit
      const estimatedProfit = todayTotal * 0.25;

      setStats({
        todaySales: todayTotal,
        transactions: todaySalesData.length,
        profit: estimatedProfit,
        unsynced: unsynced.length
      });
    };
    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Overview</h2>
        <p className="text-slate-500 font-medium mt-1">Here's what's happening in your shop today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Today's Sales" 
          value={`GHS ${stats.todaySales}`} 
          icon={DollarSign} 
          color="blue" 
        />
        <StatCard 
          title="Transactions" 
          value={stats.transactions} 
          icon={ShoppingCart} 
          color="orange" 
        />
        <StatCard 
          title="Est. Profit" 
          value={`GHS ${stats.profit}`} 
          icon={Activity} 
          color="green" 
        />
        <StatCard 
          title="Pending Sync" 
          value={stats.unsynced} 
          icon={RefreshCw} 
          color={stats.unsynced > 0 ? "red" : "slate"} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-slate-800">Best Selling Items</h3>
          </div>
          <div className="space-y-4">
            <ItemRow name="Verna Mineral Water (Carton)" sales="24 sold" stock="12 left" />
            <ItemRow name="Coca Cola 1.5L" sales="18 sold" stock="45 left" />
            <ItemRow name="Belaire Rosé" sales="5 sold" stock="8 left" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-6 text-orange-500">
            <AlertTriangle size={24} />
            <h3 className="text-xl font-bold text-slate-800">Low Stock Alerts</h3>
          </div>
          <div className="space-y-4">
            <AlertRow name="Indomie Chicken" qty="5 packs left" />
            <AlertRow name="Pepsi 500ml" qty="2 bottles left" />
            <AlertRow name="Toilet Roll (Pack)" qty="Out of stock" critical />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    orange: 'bg-orange-50 text-orange-500',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-500',
    slate: 'bg-slate-50 text-slate-500'
  };

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-slate-500 font-bold mb-1">{title}</p>
          <h4 className="text-2xl font-black text-slate-800">{value}</h4>
        </div>
        <div className={`p-3 rounded-xl ${colors[color]}`}>
          <Icon size={24} strokeWidth={2.5} />
        </div>
      </div>
    </div>
  );
}

function ItemRow({ name, sales, stock }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
      <div className="font-bold text-slate-700">{name}</div>
      <div className="text-right">
        <div className="text-sm font-bold text-blue-600">{sales}</div>
        <div className="text-xs text-slate-400 font-medium">{stock}</div>
      </div>
    </div>
  );
}

function AlertRow({ name, qty, critical }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
      <div className={`font-bold ${critical ? 'text-red-500' : 'text-slate-700'}`}>{name}</div>
      <div className={`text-sm font-bold ${critical ? 'text-red-500' : 'text-orange-500'}`}>
        {qty}
      </div>
    </div>
  );
}
