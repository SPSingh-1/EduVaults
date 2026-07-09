import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import EduFlowLogo from '../../components/common/Logo';
import { apiClient } from '../../api/apiClient';

const CountUp = ({ to, duration = 1500, suffix = '', decimals = 0, prefix = '' }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = parseFloat(to);
    if (isNaN(end)) return;

    let startTime = null;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const rate = Math.min(progress / duration, 1);
      
      // Easing out quadratic
      const easedRate = rate * (2 - rate);
      const val = easedRate * (end - start) + start;
      
      setCount(val);

      if (rate < 1) {
        requestAnimationFrame(animate);
      } else {
        setCount(end);
      }
    };

    requestAnimationFrame(animate);
  }, [to, duration]);

  return (
    <span>
      {prefix}
      {count.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
      {suffix}
    </span>
  );
};

const FeatureCard = ({ icon, title, desc }) => (
  <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all">
    <div className="text-3xl mb-3">{icon}</div>
    <h3 className="font-display font-semibold text-primary text-sm mb-1">{title}</h3>
    <p className="text-gray-500 text-xs leading-relaxed">{desc}</p>
  </div>
);

const Landing = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalSchools: 12, totalStudents: 1500 });
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(''); // 'Standard', 'Yearly', 'Enterprise', 'CustomDev'
  const [form, setForm] = useState({
    schoolName: '',
    address: '',
    city: '',
    website: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    phone: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [error, setError] = useState('');
  const [inquiryForm, setInquiryForm] = useState({ name: '', email: '', phone: '', message: '', isDemoRequest: false });
  const [submittingInquiry, setSubmittingInquiry] = useState(false);

  const handleInquirySubmit = async (e) => {
    e.preventDefault();
    if (!inquiryForm.name || !inquiryForm.email || !inquiryForm.message) {
      alert('Please fill in all required fields.');
      return;
    }
    setSubmittingInquiry(true);
    try {
      await apiClient.post('/auth/submit-inquiry', inquiryForm);
      alert("Thank you! Your inquiry has been sent. We'll review it and get back to you shortly.");
      setInquiryForm({ name: '', email: '', phone: '', message: '', isDemoRequest: false });
    } catch (err) {
      console.error(err);
      alert('Failed to submit inquiry. Please try again.');
    } finally {
      setSubmittingInquiry(false);
    }
  };

  const [contacts, setContacts] = useState({
    contactEmail: 'support@eduvault.com',
    contactPhone: '+91 99999 88888',
    contactAddress: 'EduVault Systems HQ, 12th Floor, Tech Tower, Sector 62, Noida, NCR, India',
    contactHours: 'Monday - Saturday: 9:00 AM - 6:00 PM IST'
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await apiClient.get('/auth/public-stats');
        if (res.data) {
          setStats({
            totalSchools: res.data.totalSchools || 12,
            totalStudents: res.data.totalStudents || 1500
          });
        }
      } catch (err) {
        console.error('Failed to fetch public stats:', err);
      }
    };

    const fetchSettings = async () => {
      try {
        const res = await apiClient.get('/auth/settings');
        if (res.data) {
          setContacts({
            contactEmail: res.data.contactEmail || 'support@eduvault.com',
            contactPhone: res.data.contactPhone || '+91 99999 88888',
            contactAddress: res.data.contactAddress || 'EduVault Systems HQ, 12th Floor, Tech Tower, Sector 62, Noida, NCR, India',
            contactHours: res.data.contactHours || 'Monday - Saturday: 9:00 AM - 6:00 PM IST'
          });
        }
      } catch (err) {
        console.error('Failed to fetch public settings:', err);
      }
    };

    fetchStats();
    fetchSettings();
  }, []);

  const loadScript = (src) => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const registerAndSubmit = async (paymentResponse) => {
    setSubmitting(true);
    setError('');
    try {
      await apiClient.post('/auth/register-purchase', {
        schoolName: form.schoolName,
        address: form.address,
        city: form.city,
        website: form.website || '',
        adminName: form.adminName,
        adminEmail: form.adminEmail,
        phone: form.phone,
        planType: selectedPlan,
        razorpayPaymentId: paymentResponse.razorpay_payment_id || '',
        razorpayOrderId: paymentResponse.razorpay_order_id || '',
        razorpaySignature: paymentResponse.razorpay_signature || ''
      });
      setPaymentSuccess(true);
      setForm({
        schoolName: '',
        address: '',
        city: '',
        website: '',
        adminName: '',
        adminEmail: '',
        phone: ''
      });
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Registration failed. Please contact support.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (!form.schoolName || !form.adminName || !form.adminEmail || !form.phone) {
      setError('Please fill in all required fields.');
      return;
    }

    if (selectedPlan === 'Enterprise' || selectedPlan === 'CustomDev') {
      // Free / Quote request
      setSubmitting(true);
      setError('');
      try {
        await apiClient.post('/auth/register-purchase', {
          schoolName: form.schoolName,
          address: form.address,
          city: form.city,
          website: form.website || '',
          adminName: form.adminName,
          adminEmail: form.adminEmail,
          phone: form.phone,
          planType: selectedPlan,
          razorpayPaymentId: 'quote_request',
          razorpayOrderId: 'quote_request',
          razorpaySignature: 'quote_request'
        });
        setPaymentSuccess(true);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to submit quote request.');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const orderRes = await apiClient.post('/auth/public-order', { planType: selectedPlan });
      const orderData = orderRes.data;

      if (orderData.isMock) {
        setSubmitting(false);
        const proceed = window.confirm("Razorpay credentials not configured. Proceed with simulated payment?");
        if (proceed) {
          const mockPayment = {
            razorpay_payment_id: `pay_mock_${Math.random().toString(36).substring(7)}`,
            razorpay_order_id: orderData.orderId,
            razorpay_signature: 'mock_signature'
          };
          await registerAndSubmit(mockPayment);
        }
      } else {
        const scriptLoaded = await loadScript('https://checkout.razorpay.com/v1/checkout.js');
        setSubmitting(false);
        if (!scriptLoaded) {
          alert('Failed to load Razorpay SDK. Please check your connection.');
          return;
        }

        const options = {
          key: orderData.keyId,
          amount: orderData.amount,
          currency: orderData.currency,
          name: "EduVault Systems",
          description: `${selectedPlan} Plan Subscription`,
          order_id: orderData.orderId,
          handler: async (response) => {
            await registerAndSubmit(response);
          },
          prefill: {
            name: form.adminName,
            email: form.adminEmail,
            contact: form.phone
          },
          theme: {
            color: "#1a2744"
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      }
    } catch (err) {
      console.error(err);
      setError('Failed to initialize payment. Please try again.');
      setSubmitting(false);
    }
  };

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-primary to-blue-900 text-white">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-4 sm:px-8 py-5 border-b border-white/10">
        <EduFlowLogo size={42} />
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-blue-200">
          <span className="hover:text-white cursor-pointer" onClick={() => scrollToSection('features')}>Features</span>
          <span className="hover:text-white cursor-pointer" onClick={() => scrollToSection('how-it-works')}>How It Works</span>
          <span className="hover:text-white cursor-pointer" onClick={() => scrollToSection('benefits')}>Benefits</span>
          <span className="hover:text-white cursor-pointer" onClick={() => scrollToSection('pricing')}>Pricing</span>
          <span className="hover:text-white cursor-pointer" onClick={() => navigate('/demo')}>Demo</span>
          <span className="hover:text-white cursor-pointer" onClick={() => scrollToSection('contact')}>Contact</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/login')} className="bg-accent hover:bg-accent-light text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-all">Login</button>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-10 md:py-20 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
        <div>
          <div className="inline-flex items-center gap-2 bg-white/10 text-blue-200 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 border border-white/20">
            ⭐ TRUSTED BY <CountUp to={stats.totalSchools} />+ SCHOOLS
          </div>
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold leading-tight mb-6">
            Simplify Your<br /><span className="text-accent">School</span> Management
          </h1>
          <p className="text-blue-200 text-base md:text-lg leading-relaxed mb-8">
            The all-in-one platform to manage students, teachers, attendance, fees, exams, and parent communications effortlessly.
          </p>
          <div className="flex items-center gap-4 flex-wrap">
            <button onClick={() => navigate('/login')} className="w-full sm:w-auto bg-accent hover:bg-accent-light text-white font-bold px-7 py-3.5 rounded-xl transition-all text-sm">
              🚀 Login to Dashboard
            </button>
            <button onClick={() => navigate('/demo')} className="flex items-center justify-center gap-2 text-blue-200 hover:text-white text-sm font-medium w-full sm:w-auto py-2 sm:py-0">
              ▶ Watch Demo
            </button>
          </div>
          <div className="flex items-center gap-4 sm:gap-6 mt-8 text-[11px] sm:text-xs text-blue-300 flex-wrap">
            <span>✓ No credit card required</span>
            <span>✓ Setup in 5 minutes</span>
            <span>✓ Free support</span>
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur rounded-2xl p-4 sm:p-6 border border-white/20">
          <div className="bg-primary rounded-xl p-4 mb-3 border border-white/10">
            <div className="text-xs text-blue-300 mb-2">Today's Overview</div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { k: 'Attendance', comp: <CountUp to={94.2} decimals={1} suffix="%" /> },
                { k: 'Students', comp: <CountUp to={stats.totalStudents} /> },
                { k: 'Pending Dues', comp: <CountUp to={12400} prefix="Rs." /> },
                { k: 'Notices Sent', comp: <CountUp to={150} /> }
              ].map(({ k, comp }) => (
                <div key={k} className="bg-white/10 rounded-lg p-3">
                  <div className="text-xs text-blue-300">{k}</div>
                  <div className="font-display font-bold text-white text-lg">{comp}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="text-xs text-blue-300 text-center">Live dashboard preview</div>
        </div>
      </div>

      {/* Features */}
      <div id="features" className="bg-white/5 py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-8">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-center mb-3">Everything You Need to Run Your Institution</h2>
          <p className="text-blue-200 text-center text-xs sm:text-sm mb-10">Powerful features designed for admins, teachers, and parents</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {[
              ['🎓','Multi-School System','Manage multiple campuses from one super admin dashboard'],
              ['👨‍🎓','Student Lifecycle','From admission to graduation, track every student milestone'],
              ['📋','Simple Attendance','Mark attendance digitally, get instant alerts for absences'],
              ['📊','Exam & Report Cards','Schedule exams, enter marks, and auto-generate report cards'],
              ['💰','Fee Management','Configure fee structures, track payments, send bulk reminders'],
              ['📢','Announcements','Broadcast notices to students, teachers, and parents instantly'],
              ['📈','Analytics','Deep insights on performance, attendance, and financials'],
              ['🔒','Secure & Reliable','Role-based access, audit logs, daily backups, 99.9% uptime'],
            ].map(([i,t,d])=><FeatureCard key={t} icon={i} title={t} desc={d} />)}
          </div>
        </div>
      </div>

      {/* How it works */}
      <div id="how-it-works" className="max-w-6xl mx-auto px-8 py-16">
        <h2 className="font-display text-3xl font-bold text-center mb-12">Get Your School Online in Minutes</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            ['1','Create School Profile','Sign up and enter your school details. Your dashboard is ready instantly.'],
            ['2','Add Teachers & Students','Import via CSV or add manually. Everyone gets their own secure login.'],
            ['3','Start Managing','Go live immediately — attendance, fees, exams all in one place.'],
          ].map(([n,t,d])=>(
            <div key={n} className="text-center">
              <div className="w-14 h-14 bg-accent rounded-2xl flex items-center justify-center text-white font-display font-bold text-xl mx-auto mb-4">{n}</div>
              <h3 className="font-display font-semibold text-white text-lg mb-2">{t}</h3>
              <p className="text-blue-200 text-sm">{d}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing */}
      <div id="pricing" className="bg-white/5 py-16">
        <div className="max-w-6xl mx-auto px-8 text-center">
          <h2 className="font-display text-3xl font-bold mb-3">Simple, Transparent Pricing</h2>
          <p className="text-blue-200 text-sm mb-10">No hidden fees. Scale as you grow.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            <div className="bg-white/10 rounded-2xl p-7 border border-white/20">
              <div className="text-xs font-bold text-accent uppercase tracking-wider mb-2">Standard Plan</div>
              <div className="font-display text-4xl font-bold text-white mb-1">$49 <span className="text-lg text-blue-300">/month</span></div>
              <p className="text-blue-200 text-sm mb-6">Everything a school needs to manage up to 500 students</p>
              <ul className="space-y-2 text-sm text-blue-200 mb-7">
                {['Up to 500 Students','Attendance management','Automated Report Cards','Parent & Staff Support','Full Fee Management'].map(f=>(
                  <li key={f} className="flex items-center gap-2"><span className="text-green-400">✓</span>{f}</li>
                ))}
              </ul>
              <button onClick={() => { setSelectedPlan('Standard'); setError(''); setPaymentSuccess(false); setModalOpen(true); }} className="w-full bg-primary hover:bg-primary-light text-white font-semibold py-3 rounded-xl transition-all">Get Started Today</button>
            </div>
            <div className="bg-accent/20 rounded-2xl p-7 border-2 border-accent relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-white text-xs font-bold px-4 py-1 rounded-full">MOST POPULAR</div>
              <div className="text-xs font-bold text-accent uppercase tracking-wider mb-2">Enterprise</div>
              <div className="font-display text-4xl font-bold text-white mb-1">Custom</div>
              <p className="text-blue-200 text-sm mb-6">For large school groups and multi-campus networks</p>
              <ul className="space-y-2 text-sm text-blue-200 mb-7">
                {['Unlimited Schools','White-label branding','Multi-school Management','Dedicated Account Manager','Advanced Analytics & API','Priority 24/7 Support'].map(f=>(
                  <li key={f} className="flex items-center gap-2"><span className="text-green-400">✓</span>{f}</li>
                ))}
              </ul>
              <button onClick={() => { setSelectedPlan('Enterprise'); setError(''); setPaymentSuccess(false); setModalOpen(true); }} className="w-full bg-accent hover:bg-accent-light text-white font-semibold py-3 rounded-xl transition-all">Contact Sales</button>
            </div>
            {/* Custom Pricing Card */}
            <div className="bg-white/10 rounded-2xl p-7 border border-white/20">
              <div className="text-xs font-bold text-yellow-400 uppercase tracking-wider mb-2">Custom Development</div>
              <div className="font-display text-4xl font-bold text-white mb-1">$199–$999 <span className="text-lg text-blue-300">/pages</span></div>
              <p className="text-blue-200 text-sm mb-6">Need extra pages or modifications to existing features? We'll quote based on your requirements.</p>
              <ul className="space-y-2 text-sm text-blue-200 mb-7">
                {[
                  'Custom page design & development',
                  'Modifications to existing modules',
                  'Tailored workflows & automation',
                  'Branding & UI customizations',
                  'Pricing based on scope & complexity',
                  'Dedicated dev support throughout',
                ].map(f=>(
                  <li key={f} className="flex items-center gap-2"><span className="text-yellow-400">✦</span>{f}</li>
                ))}
              </ul>
              <button onClick={() => { setSelectedPlan('CustomDev'); setError(''); setPaymentSuccess(false); setModalOpen(true); }} className="w-full bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-400/40 text-yellow-300 font-semibold py-3 rounded-xl transition-all">Request a Custom Quote</button>
            </div>
            {/* Yearly Plan Card */}
            <div className="bg-green-500/10 rounded-2xl p-7 border border-green-400/30 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs font-bold px-4 py-1 rounded-full">SAVE UP TO $100</div>
              <div className="text-xs font-bold text-green-400 uppercase tracking-wider mb-2">Yearly Plan</div>
              <div className="font-display text-4xl font-bold text-white mb-1">₹39,999 <span className="text-lg text-blue-300">/year</span></div>
              <p className="text-blue-200 text-sm mb-6">Pay annually and enjoy loyalty discounts — the longer your relationship with us, the more you save.</p>
              <ul className="space-y-2 text-sm text-blue-200 mb-7">
                {[
                  '$50 off for new yearly subscribers',
                  'Up to $100 off for long-term clients',
                  'All Standard Plan features included',
                  'Priority onboarding & setup assistance',
                  'Locked-in pricing for 12 months',
                  'Free feature upgrades during the year',
                ].map(f=>(
                  <li key={f} className="flex items-center gap-2"><span className="text-green-400">✓</span>{f}</li>
                ))}
              </ul>
              <button onClick={() => { setSelectedPlan('Yearly'); setError(''); setPaymentSuccess(false); setModalOpen(true); }} className="w-full bg-green-500/30 hover:bg-green-500/40 border border-green-400/40 text-green-300 font-semibold py-3 rounded-xl transition-all">Get Yearly Discount</button>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Section */}
      <div id="contact" className="bg-white/5 py-16 border-t border-b border-white/10">
        <div className="max-w-4xl mx-auto px-8">
          <h2 className="font-display text-3xl font-bold text-center mb-3">Get in Touch</h2>
          <p className="text-blue-200 text-center text-sm mb-10">Have questions about EduVault? We are here to help.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            <div className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/20 space-y-5">
              <h3 className="font-display font-semibold text-lg text-accent">Contact Details</h3>
              <div className="space-y-4 text-xs text-blue-200">
                <div className="flex items-start gap-3">
                  <span className="text-lg mt-0.5">📧</span>
                  <div>
                    <div className="font-semibold text-white text-sm">Email Address</div>
                    <div className="text-xs text-gray-300">{contacts.contactEmail}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-lg mt-0.5">📞</span>
                  <div>
                    <div className="font-semibold text-white text-sm">Phone Number</div>
                    <div className="text-xs text-gray-300">{contacts.contactPhone}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-lg mt-0.5">🏢</span>
                  <div>
                    <div className="font-semibold text-white text-sm">Office Address</div>
                    <div className="text-xs text-gray-300">{contacts.contactAddress}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-lg mt-0.5">⏰</span>
                  <div>
                    <div className="font-semibold text-white text-sm">Working Hours</div>
                    <div className="text-xs text-gray-300">{contacts.contactHours}</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/20">
              <h3 className="font-display font-semibold text-lg text-accent mb-4">Send a Message</h3>
              <form onSubmit={handleInquirySubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <input required aria-label="Your Name" placeholder="Your Name" value={inquiryForm.name} onChange={e => setInquiryForm(p => ({ ...p, name: e.target.value }))} className="w-full text-xs bg-slate-900/60 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-accent" />
                  <input aria-label="Your Phone (Optional)" placeholder="Your Phone (Optional)" value={inquiryForm.phone || ''} onChange={e => setInquiryForm(p => ({ ...p, phone: e.target.value }))} className="w-full text-xs bg-slate-900/60 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-accent" />
                </div>
                <input required type="email" aria-label="Your Email" placeholder="Your Email" value={inquiryForm.email} onChange={e => setInquiryForm(p => ({ ...p, email: e.target.value }))} className="w-full text-xs bg-slate-900/60 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-accent" />
                <div>
                  <select aria-label="Message Category" value={inquiryForm.isDemoRequest ? "demo" : "inquiry"} onChange={e => setInquiryForm(p => ({ ...p, isDemoRequest: e.target.value === "demo" }))} className="w-full text-xs bg-slate-900/60 border border-white/10 rounded-lg p-3 text-gray-400 focus:outline-none focus:border-accent">
                    <option className="bg-slate-900 text-white" value="inquiry">General Inquiry</option>
                    <option className="bg-slate-900 text-white" value="demo">Request Live Demo Call</option>
                  </select>
                </div>
                <textarea required rows="4" aria-label="Your Message" placeholder="Your Message" value={inquiryForm.message} onChange={e => setInquiryForm(p => ({ ...p, message: e.target.value }))} className="w-full text-xs bg-slate-900/60 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-accent"></textarea>
                <button type="submit" disabled={submittingInquiry} className="w-full bg-accent hover:bg-accent-light text-white font-bold py-2.5 rounded-lg text-xs transition-all flex items-center justify-center gap-2">
                  {submittingInquiry ? '⏳ Sending...' : 'Send Inquiry'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div id="benefits" className="max-w-4xl mx-auto px-4 sm:px-8 py-16 text-center">
        <div className="bg-accent/20 rounded-2xl p-6 sm:p-12 border border-accent/30">
          <h2 className="font-display text-2xl sm:text-3xl font-bold mb-4">Ready to Modernize Your School?</h2>
          <p className="text-blue-200 text-xs sm:text-sm mb-8">Join hundreds of schools already using EduFlow. No credit card required.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => navigate('/login')} className="w-full sm:w-auto bg-accent hover:bg-accent-light text-white font-bold px-8 py-3.5 rounded-xl transition-all">Login to Portal</button>
            <button onClick={() => scrollToSection('contact')} className="w-full sm:w-auto border border-white/30 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-white/10 transition-all">Talk to an Expert</button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 px-4 sm:px-8 py-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center">
          <EduFlowLogo size={32} />
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-xs text-blue-300">
            <span className="hover:text-white cursor-pointer">Privacy Policy</span>
            <span className="hover:text-white cursor-pointer">Terms of Service</span>
            <span className="hover:text-white cursor-pointer">Cookie Settings</span>
          </div>
          <div className="text-xs text-blue-400">© 2026 EduVault Systems Inc.</div>
        </div>
      </footer>

      {/* Purchase Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-white/15 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="bg-primary px-6 py-5 border-b border-white/10 flex justify-between items-center">
              <div>
                <h3 className="font-display font-bold text-white text-lg">
                  {selectedPlan === 'Enterprise' || selectedPlan === 'CustomDev' ? 'Request Details' : 'Purchase Plan'}
                </h3>
                <p className="text-blue-200 text-xs mt-0.5">Selected: <span className="text-accent font-bold">{selectedPlan} Plan</span></p>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-white hover:text-red-400 text-lg font-bold">✕</button>
            </div>
            
            <div className="p-6">
              {paymentSuccess ? (
                <div className="text-center py-6 space-y-4">
                  <div className="text-5xl">✅</div>
                  <h4 className="text-xl font-bold text-green-400">Request Received Successfully!</h4>
                  <p className="text-blue-100 text-sm leading-relaxed px-4">
                    Wait for 24 hour check you details then give you to credential. access the website.
                  </p>
                  <button onClick={() => setModalOpen(false)} className="bg-accent hover:bg-accent-light text-white text-xs font-semibold px-6 py-2 rounded-lg transition-all">
                    Close Window
                  </button>
                </div>
              ) : (
                <form onSubmit={handleCheckout} className="space-y-4">
                  {error && <div className="bg-red-500/20 border border-red-500/40 text-red-200 text-xs font-semibold rounded-lg p-3">{error}</div>}
                  
                  <div>
                    <label htmlFor="school-name" className="block text-xs font-semibold text-blue-200 mb-1">School / Institution Name *</label>
                    <input required id="school-name" value={form.schoolName} onChange={e => setForm(p => ({ ...p, schoolName: e.target.value }))} placeholder="Greenwood High School" className="w-full text-xs bg-slate-800/80 border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-accent" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="school-address" className="block text-xs font-semibold text-blue-200 mb-1">Address *</label>
                      <input required id="school-address" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder="123 Education Lane" className="w-full text-xs bg-slate-800/80 border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-accent" />
                    </div>
                    <div>
                      <label htmlFor="school-city" className="block text-xs font-semibold text-blue-200 mb-1">City *</label>
                      <input required id="school-city" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} placeholder="New Delhi" className="w-full text-xs bg-slate-800/80 border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-accent" />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="school-website" className="block text-xs font-semibold text-blue-200 mb-1">Website URL</label>
                    <input id="school-website" value={form.website} onChange={e => setForm(p => ({ ...p, website: e.target.value }))} placeholder="https://greenwood.edu" className="w-full text-xs bg-slate-800/80 border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-accent" />
                  </div>
                  
                  <hr className="border-white/10 my-1" />
                  
                  <div>
                    <label htmlFor="admin-name" className="block text-xs font-semibold text-blue-200 mb-1">Administrator Full Name *</label>
                    <input required id="admin-name" value={form.adminName} onChange={e => setForm(p => ({ ...p, adminName: e.target.value }))} placeholder="Dr. S. P. Singh" className="w-full text-xs bg-slate-800/80 border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-accent" />
                  </div>
                  
                  <div>
                    <label htmlFor="admin-email" className="block text-xs font-semibold text-blue-200 mb-1">Admin Email * (For Contact Details)</label>
                    <input required id="admin-email" type="email" value={form.adminEmail} onChange={e => setForm(p => ({ ...p, adminEmail: e.target.value }))} placeholder="admin@greenwood.edu" className="w-full text-xs bg-slate-800/80 border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-accent" />
                  </div>

                  <div>
                    <label htmlFor="admin-phone" className="block text-xs font-semibold text-blue-200 mb-1">Contact Phone Number *</label>
                    <input required id="admin-phone" type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+91 98765 43210" className="w-full text-xs bg-slate-800/80 border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-accent" />
                  </div>

                  <button type="submit" disabled={submitting} className="w-full bg-accent hover:bg-accent-light text-white font-bold py-3 rounded-lg text-xs mt-2 transition-all flex items-center justify-center gap-2">
                    {submitting ? '⏳ Processing...' : selectedPlan === 'Enterprise' || selectedPlan === 'CustomDev' ? '📩 Send Details' : '💳 Proceed to Payment'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Landing;