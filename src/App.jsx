import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import DashboardLayout from './components/DashboardLayout';
import DashboardHome from './pages/DashboardHome';
import POS from './pages/POS';
import Products from './pages/Products';
import Inventory from './pages/Inventory';
import Reports from './pages/Reports';
import SalesHistory from './pages/SalesHistory';
import Settings from './pages/Settings';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deviceError, setDeviceError] = useState(null);

  useEffect(() => {
    const checkDeviceLimit = async (sessionData) => {
      if (!sessionData?.user) return true;
      if (sessionData.user.email === 'demo@billspark.com') return true; // Skip demo account

      let deviceId = localStorage.getItem('billspark_device_id');
      if (!deviceId) {
        deviceId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
        localStorage.setItem('billspark_device_id', deviceId);
      }

      const devices = sessionData.user.user_metadata?.devices || [];
      
      if (!devices.includes(deviceId)) {
        if (devices.length >= 2) {
          await supabase.auth.signOut();
          setDeviceError('Device limit reached. You can only use this account on up to 2 devices. Please upgrade or contact support to add more shops.');
          setSession(null);
          return false;
        } else {
          const newDevices = [...devices, deviceId];
          await supabase.auth.updateUser({
            data: { devices: newDevices }
          });
          // Update local session metadata just in case
          sessionData.user.user_metadata = { ...sessionData.user.user_metadata, devices: newDevices };
        }
      }
      return true;
    };

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const allowed = await checkDeviceLimit(session);
      if (allowed) {
        setSession(session);
      }
      setLoading(false);
    }).catch(err => {
      console.warn("Supabase auth error handled:", err);
      setSession(null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        const allowed = await checkDeviceLimit(session);
        if (allowed) setSession(session);
      } else {
        setSession(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (deviceError) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md bg-white p-8 rounded-3xl shadow-xl text-center">
          <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-2">Access Denied</h2>
          <p className="text-slate-600 font-medium mb-6">{deviceError}</p>
          <button 
            onClick={() => setDeviceError(null)}
            className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="flex h-screen items-center justify-center font-bold text-xl">Loading BillSpark...</div>;
  }


  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={!session ? <Login /> : <Navigate to="/app" />} />
        
        {/* Protected Routes */}
        <Route path="/app" element={<DashboardLayout />}>
          <Route index element={<DashboardHome />} />
          <Route path="pos" element={<POS />} />
          <Route path="products" element={<Products />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="reports" element={<Reports />} />
          <Route path="history" element={<SalesHistory />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
