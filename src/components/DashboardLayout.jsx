import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { LayoutDashboard, ShoppingCart, Package, Archive, PieChart, LogOut, Wifi, WifiOff } from 'lucide-react';
import { useState, useEffect } from 'react';

const SidebarLink = ({ to, icon: Icon, label, current}) => (
  <Link 
    to={to} 
    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${current ? 'bg-primary text-white shadow-lg shadow-blue-500/30' : 'text-slate-600 hover:bg-blue-50 hover:text-blue-600'}`}
  >
    <Icon size={20} />
    <span className="font-semibold">{label}</span>
  </Link>
);

export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 shadow-sm flex flex-col">
        <div className="p-6">
          <img src="/BillSpark Logo.png" alt="BillSpark" className="h-10 w-auto" />
          <p className="text-xs text-slate-400 font-medium mt-1">Smart POS System</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <SidebarLink to="/app" icon={LayoutDashboard} label="Overview" current={location.pathname === '/app'} />
          <SidebarLink to="/app/pos" icon={ShoppingCart} label="Sell / POS" current={location.pathname === '/app/pos'} />
          <SidebarLink to="/app/products" icon={Package} label="Products" current={location.pathname === '/app/products'} />
          <SidebarLink to="/app/inventory" icon={Archive} label="Inventory" current={location.pathname === '/app/inventory'} />
          <SidebarLink to="/app/reports" icon={PieChart} label="Reports" current={location.pathname === '/app/reports'} />
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg mb-4 text-sm font-bold ${isOnline ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
            {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
            {isOnline ? 'Online - Sync Ready' : 'Offline Mode Active'}
          </div>
          <button 
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors font-semibold"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-slate-50/50">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
