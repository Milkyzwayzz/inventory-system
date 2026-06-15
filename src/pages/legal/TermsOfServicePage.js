import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  FileText, 
  CheckCircle2,
  Clock,
  Shield,
  Scale,
  ExternalLink,
  ChevronRight,
  Info,
  AlertCircle,
  Mail,
  UserCheck
} from 'lucide-react';

const App = () => {
  const [activeSection, setActiveSection] = useState('account');
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = totalHeight > 0 ? (window.scrollY / totalHeight) * 100 : 0;
      setScrollProgress(progress);

      const sections = ['account', 'payments', 'prints', 'privacy', 'termination', 'contact'];
      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top >= 0 && rect.top <= 300) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id) => {
    const element = document.getElementById(id);
    if (element) {
      window.scrollTo({
        top: element.offsetTop - 100,
        behavior: 'smooth'
      });
    }
  };

  const navItems = [
    { id: 'account', label: 'Registration', icon: UserCheck },
    { id: 'payments', label: 'Billing', icon: Clock },
    { id: 'prints', label: 'Print Jobs', icon: FileText },
    { id: 'privacy', label: 'Privacy', icon: Shield },
    { id: 'termination', label: 'Closure', icon: AlertCircle },
    { id: 'contact', label: 'Support', icon: Mail },
  ];

  const Section = ({ id, icon: Icon, title, tldr, children, colorClass }) => (
    <section id={id} className="mb-20 scroll-mt-24">
      <div className="flex items-center gap-4 mb-6">
        <div className={`p-3 rounded-2xl ${colorClass} bg-opacity-10 text-opacity-100`}>
          <Icon size={28} className={colorClass.replace('bg-', 'text-')} />
        </div>
        <h2 className="text-3xl font-extrabold text-slate-800">{title}</h2>
      </div>
      
      <div className="section-card glass-panel rounded-3xl p-8 md:p-10 border border-slate-100 relative overflow-hidden">
        <div className="mb-8 p-5 bg-slate-50/50 rounded-2xl border border-slate-100 flex gap-4 items-start">
          <Info size={20} className="text-indigo-500 mt-1 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1 text-[10px]">In short</p>
            <p className="text-slate-700 font-medium leading-relaxed italic text-sm md:text-base">{tldr}</p>
          </div>
        </div>
        
        <div className="text-slate-600 leading-relaxed text-base md:text-lg space-y-6">
          {children}
        </div>
      </div>
    </section>
  );

  return (
    <div className="min-h-screen bg-[#F4F5F7] text-slate-900 selection:bg-indigo-100">
      {/* Reading Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-1.5 bg-slate-200 z-[100]">
        <div 
          className="progress-bar h-full bg-gradient-to-r from-indigo-500 to-purple-500"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Decorative Background Blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-200/30 rounded-full blur-[120px] animate-blob" />
        <div className="absolute bottom-[10%] right-[-5%] w-[35%] h-[35%] bg-purple-200/30 rounded-full blur-[120px] animate-blob" style={{ animationDelay: '2s' }} />
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12 relative z-10">
        <header className="flex justify-between items-center mb-24 animate-slide-up">
          <button 
            onClick={() => window.history.back()}
            className="group flex items-center gap-3 px-6 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-all hover:shadow-lg"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            Back
          </button>
          
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">v1.1.0 • Updated Dec 2026</span>
          </div>
        </header>

        <div className="flex flex-col lg:flex-row gap-16">
          <aside className="lg:w-72 hidden lg:block">
            <div className="sticky top-24 rounded-[2.5rem] bg-white border border-slate-200/70 shadow-lg shadow-slate-200/20 p-4 space-y-2 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <div className="mb-8 px-4">
                <h3 className="text-2xl font-black text-slate-800 mb-2">Legal</h3>
                <p className="text-slate-400 text-sm font-medium">Agreement & Guidelines</p>
              </div>
              
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollTo(item.id)}
                  className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-left font-bold transition-all duration-300 ${
                    activeSection === item.id 
                    ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/20' 
                    : 'text-slate-500 hover:text-indigo-800 hover:bg-slate-100'
                  }`}
                >
                  <item.icon size={20} className={activeSection === item.id ? 'text-white' : 'text-slate-400'} />
                  {item.label}
                </button>
              ))}

              <div className="mt-12 p-6 bg-indigo-600 rounded-3xl text-white shadow-xl shadow-indigo-200">
                <h4 className="font-bold mb-2 text-sm md:text-base">Need a PDF?</h4>
                <p className="text-[11px] text-indigo-100 mb-4 leading-relaxed">Download our terms for your records or legal team.</p>
                <button className="w-full py-2 bg-white/20 hover:bg-white/30 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2">
                  Download <ExternalLink size={14} />
                </button>
              </div>
            </div>
          </aside>

          <main className="flex-1 max-w-3xl animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="mb-20">
              <h1 className="text-5xl md:text-7xl font-black text-slate-900 mb-8 leading-[1.1]">
                Terms of <br/>
                <span className="text-gradient">Service</span>
              </h1>
              <p className="text-lg md:text-xl text-slate-500 font-medium leading-relaxed">
                Welcome to PRESS. We've written our terms in clear language to help you understand your rights and our obligations. By using our platform, you're agreeing to these rules.
              </p>
            </div>

            <Section 
              id="account" 
              icon={UserCheck} 
              title="1. Account Registration" 
              colorClass="bg-indigo-500"
              tldr="You must be an adult, provide real info, and keep your password safe."
            >
              <p>To access the full suite of PRESS services, including our cloud-based print management, you must register for an account. By doing so, you represent that you are at least 18 years of age and capable of entering into a binding contract.</p>
              
              <div className="grid sm:grid-cols-2 gap-4 mt-8">
                {[
                  "Accurate & complete information",
                  "Keep login credentials private",
                  "One user per account license",
                  "Notification of unauthorized use"
                ].map((text, i) => (
                  <div key={i} className="flex items-center gap-3 p-4 bg-white/50 rounded-2xl border border-slate-100 shadow-sm">
                    <CheckCircle2 size={18} className="text-indigo-500 flex-shrink-0" />
                    <span className="text-xs md:text-sm font-bold text-slate-700">{text}</span>
                  </div>
                ))}
              </div>
            </Section>

            <Section 
              id="payments" 
              icon={Clock} 
              title="2. Billing & Payments" 
              colorClass="bg-amber-500"
              tldr="Payments are up-front, processed by Stripe, and usually non-refundable."
            >
              <p>Our pricing is transparent. We use industry-standard encryption to handle your sensitive financial data.</p>
              <ul className="space-y-4">
                <li className="flex gap-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2.5 flex-shrink-0" />
                  <span><strong>Subscriptions:</strong> Billed at the start of each cycle. Auto-renewal is active by default.</span>
                </li>
                <li className="flex gap-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2.5 flex-shrink-0" />
                  <span><strong>Taxes:</strong> Unless stated, prices do not include VAT or local sales tax.</span>
                </li>
                <li className="flex gap-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2.5 flex-shrink-0" />
                  <span><strong>Grace Period:</strong> We allow 72 hours to resolve payment failures before suspension.</span>
                </li>
              </ul>
            </Section>

            <Section 
              id="prints" 
              icon={FileText} 
              title="3. Print Services" 
              colorClass="bg-blue-500"
              tldr="You own what you print, but you can't print illegal or hateful content."
            >
              <p>PRESS provides a conduit between your digital files and physical output. While we offer automated checks, the ultimate responsibility for file quality lies with the user.</p>
              
              <div className="bg-red-50 p-6 rounded-3xl border border-red-100 my-8">
                <h4 className="flex items-center gap-2 text-red-700 font-bold mb-3 uppercase text-[10px] tracking-widest">
                  <AlertCircle size={16} /> Restricted Content
                </h4>
                <p className="text-red-900/70 text-sm leading-relaxed italic">
                  "Any material that promotes hate speech, contains child exploitative imagery, violates trademark/copyright laws, or encourages illegal acts is strictly prohibited and will be reported to authorities if necessary."
                </p>
              </div>
            </Section>

            <Section 
              id="privacy" 
              icon={Shield} 
              title="4. Data & Privacy" 
              colorClass="bg-emerald-500"
              tldr="We value your privacy. We only collect what's needed to make the app work."
            >
              <p>Your data is yours. We act as data processors to provide the service you've requested. We do not sell your personal information to third parties.</p>
              <div className="flex flex-wrap gap-2 mt-6">
                {['GDPR Compliant', 'Encryption at Rest', 'SSL Secured', 'CCPA Friendly'].map(tag => (
                  <span key={tag} className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black rounded-full uppercase">
                    {tag}
                  </span>
                ))}
              </div>
              <p className="mt-6 text-indigo-600 font-bold flex items-center gap-2 cursor-pointer hover:underline text-sm md:text-base">
                Read full Privacy Policy <ChevronRight size={16} />
              </p>
            </Section>

            <Section 
              id="termination" 
              icon={AlertCircle} 
              title="5. Account Termination" 
              colorClass="bg-rose-500"
              tldr="You can leave anytime. We can remove users who break the rules."
            >
              <p>We believe in freedom of movement. You may close your account through the settings dashboard at any time. Upon closure, we will purge your data according to our data retention policy (usually within 30 days).</p>
            </Section>

            <section id="contact" className="mt-32 mb-40 text-center">
              <div className="bg-white p-8 md:p-12 rounded-[3rem] border border-slate-200 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-[4rem]" />
                
                <div className="w-16 h-16 md:w-20 md:h-20 bg-indigo-100 rounded-3xl flex items-center justify-center mx-auto mb-8 text-indigo-600">
                  <Mail size={32} />
                </div>
                
                <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">Still have questions?</h2>
                <p className="text-base md:text-lg text-slate-500 mb-10 max-w-md mx-auto">
                  Our legal team is available for clarification on any of these points. We usually respond within 24 hours.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <a href="mailto:legal@press.com" className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold text-base hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100">
                    Email Legal Team
                  </a>
                  <button className="px-8 py-4 bg-slate-100 text-slate-700 rounded-2xl font-bold text-base hover:bg-slate-200 transition-all">
                    Visit Help Center
                  </button>
                </div>
              </div>
            </section>
          </main>
        </div>

        <footer className="py-12 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-8 text-slate-400 font-medium text-sm">
          <div className="flex items-center gap-2 text-slate-800 font-black text-xl italic">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg" />
            PRESS.
          </div>
          <div className="flex gap-8">
            <span className="hover:text-indigo-600 cursor-pointer">Privacy</span>
            <span className="hover:text-indigo-600 cursor-pointer">Cookie Policy</span>
            <span className="hover:text-indigo-600 cursor-pointer">Accessibility</span>
          </div>
          <p>© 2026 PRESS Printing Solutions Inc.</p>
        </footer>
      </div>
    </div>
  );
};

export default App;
