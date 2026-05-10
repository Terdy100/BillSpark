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

import { getDeviceId } from './utils/device';


function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deviceError, setDeviceError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  const handleResetDevices = async () => {
    try {
      if (currentUser) {
        const { id, fingerprint } = getDeviceId();
        const { error } = await supabase.auth.updateUser({
          data: { devices: [{ id, fp: fingerprint }] }
        });
        if (error) throw error;
        window.location.reload();
      }
    } catch (e) {
      alert('Failed to reset devices. Please try again or contact support.');
    }
  };

  useEffect(() => {
    const checkDeviceLimit = async (sessionData) => {
      try {
        if (!sessionData?.user) return true;
        setCurrentUser(sessionData.user);
        
        // Demo account or Admin users skip the check
        const isAdmin = sessionData.user.user_metadata?.is_admin === true;
        if (sessionData.user.email === 'demo@billspark.com' || isAdmin) return true;

        const { id: deviceId, fingerprint } = getDeviceId(sessionData.user.user_metadata);
        const devices = sessionData.user.user_metadata?.devices || [];
        
        const isRegistered = devices.some(d => {
          if (typeof d === 'string') return d === deviceId;
          return d.id === deviceId;
        });

        if (!isRegistered) {
          if (devices.length >= 3) {
            // Only sign out regular users. Admins stay in to use the Reset button.
            if (!isAdmin) {
              await supabase.auth.signOut();
            }

            setDeviceError('Device limit reached. You can only use this account on up to 3 devices.');
            setSession(null);
            return false;
          }
 else {
            const newDevices = [...devices, { id: deviceId, fp: fingerprint }];
            supabase.auth.updateUser({
              data: { devices: newDevices }
            }).catch(err => console.error("Failed to update devices metadata:", err));
            
            if (sessionData.user.user_metadata) {
              sessionData.user.user_metadata.devices = newDevices;
            }
          }
        }
        return true;
      } catch (err) {
        console.error("Device limit check error:", err);
        return true;
      }
    };

    const initAuth = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        const allowed = await checkDeviceLimit(initialSession);
        if (allowed) {
          setSession(initialSession);
        }
      } catch (err) {
        console.error("Auth initialization error:", err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

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
          <p className="text-slate-600 font-medium mb-6">
            {deviceError}
            {!currentUser?.user_metadata?.is_admin && (
              <span className="block mt-2 text-sm text-slate-400">Please contact support or your shop administrator to reset your devices.</span>
            )}
          </p>
          <div className="space-y-3">
            <button 
              onClick={() => setDeviceError(null)}
              className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors"
            >
              Back to Login
            </button>
            {currentUser?.user_metadata?.is_admin && (
              <button 
                onClick={handleResetDevices}
                className="w-full bg-slate-100 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-200 transition-colors"
              >
                Reset All My Devices
              </button>
            )}
          </div>
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
