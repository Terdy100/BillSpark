import { Link } from 'react-router-dom';
import { ShoppingBag, Zap, WifiOff, BarChart3, Package } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden font-sans text-slate-800">
      {/* Background Orbs */}
      <div className="absolute top-[-100px] left-[-100px] w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
      <div className="absolute top-[-100px] right-[-100px] w-96 h-96 bg-orange-300 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-[-100px] left-[20%] w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-4000"></div>

      <nav className="relative z-10 glass px-8 py-4 m-6 rounded-2xl flex justify-between items-center max-w-7xl mx-auto">
        <img src="/BillSpark Logo.png" alt="BillSpark" className="h-10 w-auto" />
        <div className="flex gap-4">
          <Link to="/login" className="px-6 py-2.5 font-bold text-slate-700 hover:text-blue-600 transition-colors">
            Login
          </Link>
          <Link to="/login" className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-0.5">
            Get Started
          </Link>
        </div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-32 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-600 font-bold text-sm mb-8">
          <Zap size={16} className="text-orange-500" /> Waitlist Open for Ghana Shops
        </div>
        
        <h1 className="text-6xl md:text-8xl font-black tracking-tight leading-tight mb-6">
          Sell <span className="text-blue-600">faster.</span> <br />
          Smart <span className="text-orange-500">stock.</span>
        </h1>
        
        <p className="text-xl md:text-2xl text-slate-600 mb-12 max-w-2xl font-medium">
          The ultimate POS and inventory system built specifically for shops in Ghana. Never let poor internet stop your sales.
        </p>
        
        <div className="flex flex-wrap items-center justify-center gap-4 mb-24">
          <Link to="/login" className="px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl shadow-xl shadow-slate-900/20 text-lg transition-all hover:-translate-y-1">
            Start Selling Free
          </Link>
          <button className="px-8 py-4 bg-white hover:bg-slate-50 text-slate-800 font-bold rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 text-lg transition-all hover:-translate-y-1 glass">
            Request Demo
          </button>
        </div>

        <div className="grid md:grid-cols-4 gap-6 w-full text-left">
          <FeatureCard 
            icon={WifiOff} 
            title="Works Offline" 
            desc="Keep selling even when the internet goes off. Auto-syncs when online."
            color="text-red-500"
            bg="bg-red-50"
          />
          <FeatureCard 
            icon={ShoppingBag} 
            title="Fast Checkout" 
            desc="Intuitive interface designed for lightning fast transactions and queues."
            color="text-blue-500"
            bg="bg-blue-50"
          />
          <FeatureCard 
            icon={Package} 
            title="Full Stock Control" 
            desc="Track every item. Get low stock alerts. Manage inventory easily."
            color="text-orange-500"
            bg="bg-orange-50"
          />
          <FeatureCard 
            icon={BarChart3} 
            title="Smart Reports" 
            desc="Know exactly how much profit you made today, this week, or month."
            color="text-green-500"
            bg="bg-green-50"
          />
        </div>
      </main>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc, color, bg }) {
  return (
    <div className="glass p-8 rounded-3xl hover:-translate-y-2 transition-transform duration-300">
      <div className={`w-14 h-14 ${bg} ${color} rounded-2xl flex items-center justify-center mb-6`}>
        <Icon size={28} />
      </div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-slate-500 font-medium leading-relaxed">{desc}</p>
    </div>
  );
}
