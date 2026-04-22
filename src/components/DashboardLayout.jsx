import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { LayoutDashboard, ShoppingCart, Package, Archive, PieChart, LogOut, Wifi, WifiOff, Menu, X, History, Settings, Moon, Sun } from 'lucide-react';
import { useState, useEffect } from 'react';

const SidebarLink = ({ to, icon: Icon, label, current, onClick }) => (
  <Link 
    to={to} 
    onClick={onClick}
    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${current ? 'bg-[#3b82f6] text-white shadow-lg shadow-blue-500/20' : 'text-slate-600 hover:bg-blue-50 hover:text-blue-600'}`}
  >
    <Icon size={20} />
    <span className="font-semibold">{label}</span>
  </Link>
);

export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [menuOpen, setMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(localStorage.getItem('billspark_dark_mode') === 'true');

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
    localStorage.setItem('billspark_dark_mode', darkMode);
  }, [darkMode]);

  useEffect(() => {
    const triggerSync = async () => {
      if (navigator.onLine) {
        try {
          const { syncData } = await import('../lib/sync');
          await syncData();
        } catch (e) {
          console.error('Auto-sync error:', e);
        }
      }
    };

    const handleOnline = () => {
      setIsOnline(true);
      triggerSync();
    };
    
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial sync and product pull on mount
    const initData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        await triggerSync();
        try {
          const { pullProductsAndCache } = await import('../lib/sync');
          await pullProductsAndCache(session.user.id);
        } catch (e) {
          console.error('Initial product fetch error:', e);
        }
      }
    };
    
    initData();

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
    <div className="flex flex-col lg:flex-row h-screen bg-bg-base overflow-hidden">
      
      {/* Mobile Top App Bar */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-30 shadow-sm relative">
        <div className="flex items-center gap-2">
          <img src="/BillSpark Logo.png" alt="BillSpark" className="h-8 w-auto object-contain" />
          <span className="font-black text-xl text-slate-800 dark:text-white tracking-tight">BillSpark</span>
        </div>
        <button 
          onClick={() => setMenuOpen(!menuOpen)}
          className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-400 rounded-lg transition-colors"
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Slide-out Overlay (Mobile) */}
      {menuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden animate-in fade-in"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-72 lg:w-64 bg-white dark:bg-slate-900 lg:border-r border-slate-200 dark:border-slate-800 shadow-2xl lg:shadow-sm flex flex-col transform transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${menuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        
        <div className="p-6 hidden lg:block">
          <Link to="/" className="block hover:opacity-80 transition-all active:scale-95">
            <img src="/BillSpark Logo.png" alt="BillSpark" className="h-10 w-auto" />
          </Link>
          <p className="text-xs text-slate-400 font-bold mt-2 uppercase tracking-wide">Smart POS System</p>
        </div>
        
        {/* Mobile Header Inside Drawer */}
        <div className="p-6 lg:hidden flex justify-between items-center border-b border-slate-100 dark:border-slate-800">
          <Link to="/" onClick={() => setMenuOpen(false)}>
            <img src="/BillSpark Logo.png" alt="BillSpark" className="h-8 w-auto" />
          </Link>
          <button onClick={() => setMenuOpen(false)} className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-lg"><X size={20}/></button>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-6 lg:mt-4 overflow-y-auto">
          <SidebarLink to="/app" icon={LayoutDashboard} label="Overview" current={location.pathname === '/app'} onClick={() => setMenuOpen(false)} />
          <SidebarLink to="/app/pos" icon={ShoppingCart} label="Sell / POS" current={location.pathname === '/app/pos'} onClick={() => setMenuOpen(false)} />
          <SidebarLink to="/app/products" icon={Package} label="Products" current={location.pathname === '/app/products'} onClick={() => setMenuOpen(false)} />
          <SidebarLink to="/app/inventory" icon={Archive} label="Inventory" current={location.pathname === '/app/inventory'} onClick={() => setMenuOpen(false)} />
          <SidebarLink to="/app/reports" icon={PieChart} label="Reports" current={location.pathname === '/app/reports'} onClick={() => setMenuOpen(false)} />
          <SidebarLink to="/app/history" icon={History} label="Sales History" current={location.pathname === '/app/history'} onClick={() => setMenuOpen(false)} />
          <SidebarLink to="/app/settings" icon={Settings} label="Settings" current={location.pathname === '/app/settings'} onClick={() => setMenuOpen(false)} />
        </nav>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg mb-4 text-sm font-bold ${isOnline ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
            {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
            {isOnline ? 'Online - Sync Ready' : 'Offline Mode Active'}
          </div>
          
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className="flex w-full items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors font-semibold mb-2"
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
          </button>

          <button 
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors font-semibold"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main App Content Area */}
      <main className="flex-1 overflow-auto bg-bg-base h-[calc(100vh-73px)] lg:h-screen w-full relative">
        <div key={location.pathname} className="p-4 lg:p-8 h-full animate-in fade-in duration-500 slide-in-from-bottom-2">
          <Outlet />
        </div>
      </main>

    </div>
  );
}
