import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Zap, WifiOff, BarChart3, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Landing() {
  const [mockIndex, setMockIndex] = useState(0);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [demoStep, setDemoStep] = useState('form'); // 'form' or 'success'
  const [formData, setFormData] = useState({ name: '', shopName: '', phone: '' });
  
  const mocks = [
    { name: 'Verna Water (3x)', price: '15.00', profit: '+24% Weekly Profit', icon: BarChart3, color: 'text-orange-600', bg: 'bg-orange-100' },
    { name: 'Indomie Pack (5x)', price: '25.00', profit: '+18% Day Growth', icon: Zap, color: 'text-blue-600', bg: 'bg-blue-100' },
    { name: 'Coca Cola 1.5L', price: '12.00', profit: '120 Sales Today', icon: Package, color: 'text-green-600', bg: 'bg-green-100' },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setMockIndex(prev => (prev + 1) % mocks.length);
    }, 7000); // 7 seconds for a more natural pace
    return () => clearInterval(interval);
  }, []);

  const handleDemoSubmit = (e) => {
    e.preventDefault();
    const whatsappNumber = '233551389510';
    const message = `Hello BillSpark! ⚡\n\nI want to request a demo for my shop.\n\n👤 *Name:* ${formData.name}\n🏪 *Shop:* ${formData.shopName}\n📞 *Phone:* ${formData.phone}\n\nPlease get back to me!`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
    setDemoStep('success');
  };

  const currentMock = mocks[mockIndex];

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
            <button 
              onClick={() => { setShowDemoModal(true); setDemoStep('form'); }}
              className="px-8 py-4 bg-white hover:bg-slate-50 text-slate-800 font-bold rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 text-lg transition-all hover:-translate-y-1 glass"
            >
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
              src="https://i.ibb.co/LzP6m0V6/happy-customers.png"
              alt="Happy Store Owner"
              className="w-full h-full object-cover transition-transform duration-[20s] hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent"></div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div 
              key={`sale-${mockIndex}`}
              initial={{ opacity: 0, scale: 0.6, y: 20 }}
              animate={{ opacity: 1, scale: 0.85, y: 0 }}
              exit={{ opacity: 0, scale: 0.6, y: -20 }}
              whileInView={{ scale: 1 }} // slightly larger on desktop
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              className="absolute -bottom-8 -left-2 md:-bottom-10 md:-left-6 bg-white/95 backdrop-blur-md p-4 md:p-6 rounded-3xl shadow-2xl border border-white/50 z-20 w-[180px] md:w-[260px] origin-bottom-left"
            >
              <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-4">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-black text-sm md:text-base">✓</div>
                <div className="text-left">
                  <div className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Sale Success</div>
                  <div className="text-xs md:text-sm font-bold text-slate-800 line-clamp-1">{currentMock.name}</div>
                </div>
              </div>
              <div className="flex justify-between items-end border-t border-slate-50 pt-2 md:pt-3">
                <div className="text-[10px] md:text-xs font-black text-slate-500">GHS {currentMock.price} Paid</div>
                <div className="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-[7px] md:text-[9px] font-black animate-pulse" style={{ animationDuration: '4s' }}>PRINTING...</div>
              </div>
            </motion.div>
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.div 
              key={`stat-${mockIndex}`}
              initial={{ opacity: 0, x: 20, scale: 0.6 }}
              animate={{ opacity: 1, x: 0, scale: 0.85 }}
              exit={{ opacity: 0, x: -20, scale: 0.6 }}
              whileInView={{ scale: 1 }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
              className="absolute -top-8 -right-2 md:-top-10 md:-right-6 bg-white/95 backdrop-blur-md p-4 md:p-5 rounded-3xl shadow-2xl border border-white/50 z-20 w-[160px] md:w-[240px] origin-top-right"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 ${currentMock.bg} ${currentMock.color} rounded-xl md:rounded-2xl shadow-sm`}><currentMock.icon size={18} /></div>
                <div className="text-xs md:text-sm font-black text-left text-slate-800 leading-tight">
                  {currentMock.profit}
                  <div className="text-[8px] md:text-[10px] text-slate-400 font-bold uppercase mt-1">Real-time Stats</div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
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
      {/* Demo Request Modal */}
      <AnimatePresence>
        {showDemoModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDemoModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 md:p-12">
                <button 
                  onClick={() => setShowDemoModal(false)}
                  className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <Package size={24} className="rotate-12" />
                </button>

                {demoStep === 'form' ? (
                  <>
                    <h3 className="text-3xl font-black text-slate-800 mb-4">See BillSpark in <span className="text-blue-600">Action</span></h3>
                    <p className="text-slate-500 font-bold mb-8 italic text-sm">"We'll come to your shop and show you how to double your speed."</p>
                    
                    <form onSubmit={handleDemoSubmit} className="space-y-4 text-left">
                      <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Your Name</label>
                        <input 
                          required
                          type="text" 
                          placeholder="e.g. Papa Kojo"
                          className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-bold"
                          value={formData.name}
                          onChange={e => setFormData({...formData, name: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Shop Name</label>
                        <input 
                          required
                          type="text" 
                          placeholder="e.g. Kojo's Variety Shop"
                          className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-bold"
                          value={formData.shopName}
                          onChange={e => setFormData({...formData, shopName: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Phone Number</label>
                        <input 
                          required
                          type="tel" 
                          placeholder="024 XXX XXXX"
                          className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-bold"
                          value={formData.phone}
                          onChange={e => setFormData({...formData, phone: e.target.value})}
                        />
                      </div>
                      <button className="w-full py-5 bg-green-600 hover:bg-green-700 text-white font-black rounded-2xl shadow-xl shadow-green-500/30 transition-all active:scale-95 text-lg mt-4 flex items-center justify-center gap-3">
                        <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.316 1.592 5.448 0 9.886-4.438 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.438-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
                        Send via WhatsApp
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
                      <svg className="w-10 h-10 fill-current" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.316 1.592 5.448 0 9.886-4.438 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.438-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
                    </div>
                    <h3 className="text-3xl font-black text-slate-800 mb-4 tracking-tight">Redirecting...</h3>
                    <p className="text-slate-500 font-bold leading-relaxed px-4">
                      Thanks, <span className="text-blue-600">{formData.name}</span>! We've generated your request for <span className="font-black text-slate-800">{formData.shopName}</span>. 
                      Please finish sending it on <span className="text-green-600">WhatsApp</span>.
                    </p>
                    <button 
                      onClick={() => setShowDemoModal(false)}
                      className="mt-12 w-full py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-slate-800 transition-all"
                    >
                      Got it!
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
