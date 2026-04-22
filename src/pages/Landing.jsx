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

      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-10 pb-32 flex flex-col items-center text-center">
        <div className="max-w-4xl w-full flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-600 font-bold text-sm mb-8 animate-slide-up">
            <Zap size={16} className="text-orange-500" /> Waitlist Open for Ghana Shops
          </div>

          <h1 className="text-6xl md:text-8xl font-black tracking-tight leading-tight mb-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
            Sell <span className="text-blue-600">faster.</span> <br />
            Smart <span className="text-orange-500">stock.</span>
          </h1>

          <p className="text-xl md:text-2xl text-slate-600 mb-12 max-w-2xl font-medium animate-slide-up" style={{ animationDelay: '200ms' }}>
            The ultimate POS and inventory system built specifically for shops in Ghana. Never let poor internet stop your sales.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 mb-24 animate-slide-up" style={{ animationDelay: '300ms' }}>
            <Link to="/login" className="px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl shadow-xl shadow-slate-900/20 text-lg transition-all hover:-translate-y-1 active:scale-95">
              Start Selling Free
            </Link>
            <button className="px-8 py-4 bg-white hover:bg-slate-50 text-slate-800 font-bold rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 text-lg transition-all hover:-translate-y-1 glass">
              Request Demo
            </button>
          </div>

          <div className="flex items-center gap-4 animate-fade-in mb-20" style={{ animationDelay: '500ms' }}>
            <div className="flex -space-x-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-slate-200 overflow-hidden">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i + 10}`} alt="user" />
                </div>
              ))}
            </div>
            <p className="text-sm font-bold text-slate-500">Joined by <span className="text-blue-600 font-black">500+ shops</span> across Accra</p>
          </div>
        </div>

        {/* Updated Hero Visual Unit */}
        <div className="relative w-full max-w-4xl group">
          <div className="relative rounded-[3rem] overflow-hidden shadow-2xl border-8 border-white animate-fade-in duration-1000 aspect-[16/9] md:aspect-[21/9]">
            <img
              src="public/happy customers.png"
              alt="Happy Store Owner"
              className="w-full h-full object-cover transition-transform duration-[20s] hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent"></div>
          </div>

          {/* Floating Transaction Animation */}
          <div className="absolute -bottom-10 -left-6 bg-white p-6 rounded-3xl shadow-2xl border border-slate-50 animate-float max-w-[240px] z-20 hidden md:block">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-black">✓</div>
              <div className="text-left">
                <div className="text-xs font-black text-slate-400 uppercase">Sale Success</div>
                <div className="text-sm font-bold text-slate-800">Verna Water (3x)</div>
              </div>
            </div>
            <div className="flex justify-between items-end">
              <div className="text-xs font-bold text-slate-400">GHS 15.00 Paid</div>
              <div className="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black animate-pulse">PRINTING...</div>
            </div>
          </div>

          {/* Floating Analytics Popups */}
          <div className="absolute -top-10 -right-6 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-white/50 animate-float animation-delay-2000 z-20 hidden md:block">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 text-orange-600 rounded-lg"><BarChart3 size={20} /></div>
              <div className="text-sm font-black text-left">+24% Weekly Profit</div>
            </div>
          </div>
        </div>
        {/* Features Grid */}
        <div className="grid md:grid-cols-4 gap-6 w-full text-left mt-24">
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

        {/* Testimonials Section */}
        <div className="mt-32 w-full pt-20 border-t border-slate-200/60 flex flex-col items-center">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-slate-800 mb-4 tracking-tight">Loved by Shop Owners</h2>
            <p className="text-slate-500 font-bold">Real stories from across Accra, Kumasi, and beyond.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl w-full">
            <TestimonialCard
              msg="Since I started using BillSpark, I never worry about 'light off'. I keep selling and my stock is always correct. My customers are very happy!"
              author="Sister Mary"
              role="Provisions Shop, Makola"
              image="https://api.dicebear.com/7.x/avataaars/svg?seed=Mary"
            />
            <TestimonialCard
              msg="The Spark AI is like magic. I just type 'Indomie' and it handles categories for me. No more typing everything myself!"
              author="Papa Kojo"
              role="Retailer, Osu"
              image="https://api.dicebear.com/7.x/avataaars/svg?seed=Kojo"
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-12 text-center text-slate-400 font-bold text-sm">
        <p>© 2026 BillSpark POS. Made with ❤️ in Ghana.</p>
      </footer>
    </div>
  );
}

function TestimonialCard({ msg, author, role, image }) {
  return (
    <div className="glass p-8 rounded-[2.5rem] relative hover:shadow-xl transition-all duration-300">
      <div className="text-blue-500 mb-4 flex gap-1">
        {[1, 2, 3, 4, 5].map(i => <Zap key={i} size={16} fill="currentColor" />)}
      </div>
      <p className="text-lg font-medium text-slate-700 italic mb-8 leading-relaxed">"{msg}"</p>
      <div className="flex items-center gap-4">
        <img src={image} alt={author} className="w-12 h-12 rounded-full bg-blue-100" />
        <div className="text-left">
          <div className="font-black text-slate-800">{author}</div>
          <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">{role}</div>
        </div>
      </div>
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
