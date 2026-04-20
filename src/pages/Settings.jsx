import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Store, MapPin, Phone, Globe, Smartphone, Save, User, Bell, Download, AlertCircle } from 'lucide-react';
import { db } from '../lib/offline';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('business');
  const [shopInfo, setShopInfo] = useState({
    name: 'BillSpark POS',
    address: 'Accra, Ghana',
    phone: '+233 24 123 4567',
    email: 'hello@billspark.com',
    currency: 'GHS',
    receiptFooter: 'Thank you for shopping with us!'
  });

  const handleSave = () => {
    localStorage.setItem('billspark_settings', JSON.stringify(shopInfo));
    alert('Settings saved successfully!');
  };

  useEffect(() => {
    const saved = localStorage.getItem('billspark_settings');
    if (saved) setShopInfo(JSON.parse(saved));
  }, []);

  const exportToCSV = async () => {
    const sales = await db.sales.toArray();
    if (sales.length === 0) return alert("No sales data to export");
    
    let csv = "ID,Date,Total,Total Cost,Payment Type,Synced\n";
    sales.forEach(s => {
      csv += `${s.id},${s.created_at},${s.total},${s.total_cost},${s.payment_type},${s.synced}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BillSpark_Sales_Export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const clearLocalData = async () => {
    if (!confirm("⚠️ CAUTION: This will delete ALL local offline data. Make sure everything is synced to Supabase first! Continue?")) return;
    const password = prompt("Type 'CLEAR' to confirm deletion:");
    if (password !== 'CLEAR') return;
    
    await db.sales.clear();
    await db.sale_items.clear();
    alert("Local transaction data cleared.");
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Settings</h2>
        <p className="text-slate-500 font-medium mt-1">Configure your business and app preferences.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Navigation */}
        <div className="w-full lg:w-64 space-y-2">
          <TabButton active={activeTab === 'business'} onClick={() => setActiveTab('business')} icon={SettingsIcon} label="Business Profile" />
          <TabButton active={activeTab === 'receipt'} onClick={() => setActiveTab('receipt')} icon={Smartphone} label="Receipt Settings" />
          <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={User} label="Team & Access" />
          <TabButton active={activeTab === 'backup'} onClick={() => setActiveTab('backup')} icon={Download} label="Data & Backup" />
          <TabButton active={activeTab === 'notifications'} onClick={() => setActiveTab('notifications')} icon={Bell} label="Notifications" />
        </div>

        {/* Content */}
        <div className="flex-1 bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
          {activeTab === 'business' && (
            <div className="space-y-6 max-w-2xl">
              <h3 className="text-xl font-black text-slate-800">Business Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-2">Shop Name</label>
                  <input 
                    type="text" 
                    value={shopInfo.name} 
                    onChange={e => setShopInfo({...shopInfo, name: e.target.value})}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none font-medium"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-2">Currency Symbol</label>
                  <input 
                    type="text" 
                    value={shopInfo.currency} 
                    onChange={e => setShopInfo({...shopInfo, currency: e.target.value})}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none font-medium"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-600 mb-2">Street Address</label>
                  <input 
                    type="text" 
                    value={shopInfo.address} 
                    onChange={e => setShopInfo({...shopInfo, address: e.target.value})}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none font-medium"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-2">Phone Number</label>
                  <input 
                    type="text" 
                    value={shopInfo.phone} 
                    onChange={e => setShopInfo({...shopInfo, phone: e.target.value})}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none font-medium"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-2">Email Address</label>
                  <input 
                    type="email" 
                    value={shopInfo.email} 
                    onChange={e => setShopInfo({...shopInfo, email: e.target.value})}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none font-medium"
                  />
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 flex justify-end">
                <button 
                  onClick={handleSave}
                  className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-xl shadow-blue-500/30 flex items-center gap-2 transition-all"
                >
                  <Save size={20} /> Save Changes
                </button>
              </div>
            </div>
          )}

          {activeTab === 'receipt' && (
            <div className="space-y-6 max-w-2xl">
              <h3 className="text-xl font-black text-slate-800">Receipt Customization</h3>
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-2">Receipt Footer Message</label>
                <textarea 
                  rows={3}
                  value={shopInfo.receiptFooter} 
                  onChange={e => setShopInfo({...shopInfo, receiptFooter: e.target.value})}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none font-medium"
                />
              </div>
              <div className="p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-center">
                <p className="text-slate-400 font-bold mb-4 italic">Thermal Receipt Preview</p>
                <div className="bg-white w-48 mx-auto p-4 shadow-sm border border-slate-100 space-y-1 text-[10px] text-slate-600 uppercase font-mono">
                  <p className="font-black text-xs text-slate-800">{shopInfo.name}</p>
                  <p className="text-[8px]">{shopInfo.address}</p>
                  <p>----------------</p>
                  <p>ITEM NAME GHS 0.00</p>
                  <p>----------------</p>
                  <p className="font-black">TOTAL GHS 0.00</p>
                  <p className="mt-2 lowercase italic">{shopInfo.receiptFooter}</p>
                </div>
              </div>
              <div className="pt-6 border-t border-slate-100 flex justify-end">
                <button onClick={handleSave} className="px-8 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl flex items-center gap-2">
                  <Save size={20} /> Save Changes
                </button>
              </div>
            </div>
          )}

          {activeTab === 'backup' && (
            <div className="space-y-8 max-w-2xl">
              <div>
                <h3 className="text-xl font-black text-slate-800 mb-2">Export Data</h3>
                <p className="text-slate-500 font-medium mb-6">Download your sales and inventory data for backup or accounting.</p>
                <div className="flex gap-4">
                  <button 
                    onClick={exportToCSV}
                    className="flex items-center gap-3 px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-2xl transition-all"
                  >
                    <Download size={20} /> Export Sales (CSV)
                  </button>
                </div>
              </div>

              <div className="pt-8 border-t border-slate-100 opacity-50 grayscale pointer-events-none">
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                  <div className="flex items-center gap-3 text-slate-400 mb-3">
                    <AlertCircle size={24} />
                    <h4 className="font-black">Database Maintenance</h4>
                  </div>
                  <p className="text-slate-400 text-sm font-bold mb-6">Database clearing is restricted for audit and security purposes.</p>
                </div>
              </div>
            </div>
          )}
          
          {(activeTab === 'users' || activeTab === 'notifications') && (
            <div className="py-12 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                <SettingsIcon size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2 italic">Coming Soon</h3>
              <p className="text-slate-500 font-bold max-w-xs mx-auto">This feature is scheduled for the next major system update.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-bold transition-all ${active ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20' : 'text-slate-500 hover:bg-white hover:text-blue-600'}`}
    >
      <Icon size={20} />
      <span>{label}</span>
    </button>
  );
}
