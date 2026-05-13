import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Smartphone, Save, User, Bell, Download, AlertCircle, Shield, Search, Trash2, RefreshCw } from 'lucide-react';
import { db } from '../lib/offline';
import { supabase } from '../lib/supabase';
import { getDeviceId } from '../utils/device';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('business');
  const [devices, setDevices] = useState([]);
  const [currentDeviceId, setCurrentDeviceId] = useState('');
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [shopInfo, setShopInfo] = useState({
    name: 'BillSpark POS',
    address: 'Accra, Ghana',
    phone: '+233 24 123 4567',
    email: 'hello@billspark.com',
    currency: 'GHS',
    receiptFooter: 'Thank you for shopping with us!'
  });

  const [adminSearchEmail, setAdminSearchEmail] = useState('');
  const [adminActionLoading, setAdminActionLoading] = useState(false);
  const [adminMessage, setAdminMessage] = useState({ type: '', text: '' });
  const [allUsers, setAllUsers] = useState([]);
  const [fetchingUsers, setFetchingUsers] = useState(false);

  const handleSave = () => {
    localStorage.setItem('billspark_settings', JSON.stringify(shopInfo));
    alert('Settings saved successfully!');
  };

  useEffect(() => {
    const saved = localStorage.getItem('billspark_settings');
    if (saved) setShopInfo(JSON.parse(saved));
    
    // Check if user is admin
    checkAdminStatus();
    
    // Fetch device info
    const { id } = getDeviceId();
    setCurrentDeviceId(id);
    fetchDevices();
  }, []);

  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.user_metadata?.is_admin) {
      setIsAdmin(true);
      fetchUsersList(); // Fetch users if admin
    }
  };

  const fetchUsersList = async () => {
    setFetchingUsers(true);
    try {
      const { data, error } = await supabase.rpc('admin_list_users');
      if (error) throw error;
      setAllUsers(data || []);
    } catch (e) {
      console.warn('Could not fetch user list. Make sure admin_list_users RPC is installed.', e);
    } finally {
      setFetchingUsers(false);
    }
  };

  const fetchDevices = async () => {
    setLoadingDevices(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setDevices(session.user.user_metadata?.devices || []);
      }
    } catch (e) {
      console.error('Error fetching devices:', e);
    } finally {
      setLoadingDevices(false);
    }
  };

  const handleResetMyDevices = async () => {
    if (!confirm("Are you sure you want to reset your device list? You will be kept logged in on this device, but all others will be removed.")) return;
    
    try {
      const { id, fingerprint } = getDeviceId();
      const { error } = await supabase.auth.updateUser({
        data: { devices: [{ id, fp: fingerprint }] }
      });
      if (error) throw error;
      alert('Devices reset successfully.');
      fetchDevices();
    } catch (e) {
      alert('Failed to reset devices.');
    }
  };

  const handleRemoveDevice = async (idToRemove) => {
    if (!confirm("Remove this device?")) return;
    
    try {
      const newDevices = devices.filter(d => {
        const id = typeof d === 'string' ? d : d.id;
        return id !== idToRemove;
      });
      
      const { error } = await supabase.auth.updateUser({
        data: { devices: newDevices }
      });
      if (error) throw error;
      alert('Device removed.');
      fetchDevices();
    } catch (e) {
      alert('Failed to remove device.');
    }
  };

  // Admin Actions
  const handleAdminResetUser = async (email = null) => {
    const targetEmail = email || adminSearchEmail;
    if (!targetEmail) return;
    if (!confirm(`Are you sure you want to reset ALL devices for ${targetEmail}?`)) return;

    setAdminActionLoading(true);
    setAdminMessage({ type: '', text: '' });
    
    try {
      const { data, error } = await supabase.rpc('admin_reset_user_devices', { 
        target_email: targetEmail.trim().toLowerCase() 
      });

      if (error) throw error;
      if (data.error) {
        setAdminMessage({ type: 'error', text: data.error });
      } else {
        setAdminMessage({ type: 'success', text: `Successfully reset devices for ${targetEmail}` });
        if (!email) setAdminSearchEmail('');
        fetchUsersList(); // Refresh list
      }
    } catch (e) {
      setAdminMessage({ type: 'error', text: 'Failed to communicate with server. Make sure you have run the SQL setup.' });
    } finally {
      setAdminActionLoading(false);
    }
  };

  const handleAdminToggleRole = async (targetEmail, makeAdmin) => {
    if (!targetEmail) return;
    const action = makeAdmin ? 'Grant Admin' : 'Revoke Admin';
    if (!confirm(`${action} for ${targetEmail}?`)) return;

    setAdminActionLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_set_user_role', { 
        target_email: targetEmail.trim().toLowerCase(),
        make_admin: makeAdmin
      });

      if (error) throw error;
      if (data.error) {
        setAdminMessage({ type: 'error', text: data.error });
      } else {
        setAdminMessage({ type: 'success', text: `Successfully updated role for ${targetEmail}` });
        fetchUsersList(); // Refresh list
      }
    } catch (e) {
      setAdminMessage({ type: 'error', text: 'Operation failed.' });
    } finally {
      setAdminActionLoading(false);
    }
  };

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Settings</h2>
        <p className="text-slate-500 font-medium mt-1">Configure your business and app preferences.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="w-full lg:w-64 space-y-2">
          <TabButton active={activeTab === 'business'} onClick={() => setActiveTab('business')} icon={SettingsIcon} label="Business Profile" />
          <TabButton active={activeTab === 'receipt'} onClick={() => setActiveTab('receipt')} icon={Smartphone} label="Receipt Settings" />
          {isAdmin && (
            <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={User} label="Devices & Access" />
          )}
          <TabButton active={activeTab === 'backup'} onClick={() => setActiveTab('backup')} icon={Download} label="Data & Backup" />
          {isAdmin && (
            <TabButton active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} icon={Shield} label="Admin Panel" />
          )}
          <TabButton active={activeTab === 'notifications'} onClick={() => setActiveTab('notifications')} icon={Bell} label="Notifications" />
        </div>

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
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-medium"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-2">Currency Symbol</label>
                  <input 
                    type="text" 
                    value={shopInfo.currency} 
                    onChange={e => setShopInfo({...shopInfo, currency: e.target.value})}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-medium"
                  />
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 flex justify-end">
                <button onClick={handleSave} className="px-8 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl flex items-center gap-2">
                  <Save size={20} /> Save Changes
                </button>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-6 max-w-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-slate-800">Authorized Devices</h3>
                <button 
                  onClick={handleResetMyDevices}
                  className="text-xs font-black text-red-500 hover:bg-red-50 px-3 py-1 rounded-lg transition-colors"
                >
                  RESET ALL
                </button>
              </div>
              
              <p className="text-slate-500 font-medium text-sm">
                You can use BillSpark on up to 3 devices. Managing your active devices helps prevent lockouts.
              </p>

              <div className="space-y-3">
                {devices.length === 0 ? (
                  <p className="p-4 bg-slate-50 text-slate-400 font-bold rounded-2xl text-center italic">No devices registered yet.</p>
                ) : (
                  devices.map((device, idx) => {
                    const id = typeof device === 'string' ? device : device.id;
                    const isCurrent = id === currentDeviceId;
                    
                    return (
                      <div key={idx} className={`p-4 rounded-2xl border flex items-center justify-between ${isCurrent ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-slate-100'}`}>
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl ${isCurrent ? 'bg-blue-600 text-white' : 'bg-white text-slate-400 border border-slate-200'}`}>
                            <Smartphone size={20} />
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">
                              {isCurrent ? 'This Device' : `Device ${idx + 1}`}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono uppercase tracking-tighter">ID: {id.substring(0, 12)}...</p>
                          </div>
                        </div>
                        {!isCurrent && (
                          <button 
                            onClick={() => handleRemoveDevice(id)}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <AlertCircle size={20} />
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 flex items-start gap-3">
                <AlertCircle className="text-orange-500 mt-0.5" size={18} />
                <p className="text-orange-800 text-xs font-medium leading-relaxed">
                  Lost a device? Use <strong>Reset All</strong> to clear your list. You will remain logged in on this current device.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'admin' && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                    <Shield className="text-blue-600" size={24} />
                    Admin Management
                  </h3>
                  <p className="text-slate-500 font-medium mt-1">Manage every user's device access and roles.</p>
                </div>
                <button 
                  onClick={fetchUsersList}
                  disabled={fetchingUsers}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                >
                  <RefreshCw size={20} className={fetchingUsers ? 'animate-spin' : ''} />
                </button>
              </div>

              {adminMessage.text && (
                <div className={`p-4 rounded-2xl font-bold text-sm ${adminMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                  {adminMessage.text}
                </div>
              )}

              {/* Quick Search */}
              <div className="space-y-4 max-w-2xl">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input 
                    type="email" 
                    placeholder="Search user by email to add/reset..."
                    value={adminSearchEmail}
                    onChange={(e) => setAdminSearchEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold focus:border-blue-400 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button 
                    disabled={!adminSearchEmail || adminActionLoading}
                    onClick={() => handleAdminResetUser()}
                    className="flex items-center justify-center gap-2 p-4 bg-red-50 text-red-600 font-black rounded-2xl hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    {adminActionLoading ? 'Processing...' : (
                      <><Trash2 size={20} /> Reset Device Limit</>
                    )}
                  </button>
                  <button 
                    disabled={!adminSearchEmail || adminActionLoading}
                    onClick={() => handleAdminToggleRole(adminSearchEmail, true)}
                    className="flex items-center justify-center gap-2 p-4 bg-blue-50 text-blue-600 font-black rounded-2xl hover:bg-blue-100 transition-colors disabled:opacity-50"
                  >
                    Grant Admin Access
                  </button>
                </div>
              </div>

              {/* Users List */}
              <div className="mt-8">
                <h4 className="text-sm font-black text-slate-400 uppercase tracking-wider mb-4">Every Other User ({allUsers.length})</h4>
                <div className="overflow-hidden border border-slate-100 rounded-3xl shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">User Email</th>
                        <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase text-center">Devices</th>
                        <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">Role</th>
                        <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 bg-white">
                      {allUsers.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="px-6 py-12 text-center text-slate-400 font-bold italic">
                            No users found. Try searching above or refresh.
                          </td>
                        </tr>
                      ) : (
                        allUsers.map((u, i) => (
                          <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 font-bold text-slate-700">{u.email}</td>
                            <td className="px-6 py-4 text-center">
                              <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-black ${u.device_count >= 3 ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                {u.device_count || 0} / 3
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {u.is_admin ? (
                                <span className="inline-flex items-center gap-1 text-xs font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
                                  <Shield size={12} /> Admin
                                </span>
                              ) : (
                                <span className="text-xs font-bold text-slate-400">User</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right space-x-2">
                              <button 
                                onClick={() => handleAdminResetUser(u.email)}
                                title="Reset Devices"
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 size={18} />
                              </button>
                              <button 
                                onClick={() => handleAdminToggleRole(u.email, !u.is_admin)}
                                title={u.is_admin ? "Revoke Admin" : "Grant Admin"}
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              >
                                <User size={18} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 max-w-2xl">
                <h4 className="font-black text-slate-800 mb-2">How it works</h4>
                <ul className="text-sm text-slate-500 font-medium space-y-2 list-disc pl-4">
                  <li><strong>Every Other User</strong>: You can see all users and their current device counts.</li>
                  <li><strong>Reset Device Limit</strong>: Completely clears a user's registered devices, allowing them to log in on new ones.</li>
                  <li><strong>Grant Admin</strong>: Elevates a user so they can see this panel and bypass their own device limits.</li>
                  <li>Actions are irreversible and logged in the system.</li>
                </ul>
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
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-medium"
                />
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
                <button onClick={exportToCSV} className="flex items-center gap-3 px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-2xl transition-all">
                  <Download size={20} /> Export Sales (CSV)
                </button>
              </div>
            </div>
          )}
          
          {activeTab === 'notifications' && (
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
