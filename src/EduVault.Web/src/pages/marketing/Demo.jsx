import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import EduFlowLogo from '../../components/common/Logo';

const tourSteps = [
  {
    role: 'Super Admin',
    title: 'Multi-Campus Control Room',
    desc: 'The centralized dashboard for managing the entire platform. Monitor all onboarded schools, configure subscription plans, track payment collections, setup global SMS/WhatsApp settings, and handle ticket requests.',
    icon: '👑',
    color: 'from-blue-600 to-indigo-800',
    features: [
      'Multi-School Management: Register and suspend campuses instantly.',
      'Active Subscriptions Tracker: Real-time billing and invoice logs.',
      'Global Service Credentials: Set Razorpay & Twilio credentials.',
      'Support Center: Answer tickets submitted by school administrators.'
    ],
    mockup: {
      title: 'Super Admin Console',
      stats: [
        { label: 'Schools', value: '14 Active' },
        { label: 'Subscriptions', value: '₹1,56,000/mo' },
        { label: 'Pending Requests', value: '2 Review' }
      ],
      listTitle: 'Recent Registrations',
      listItems: [
        { name: 'Greenwood High School', status: 'Pending Review', badge: 'bg-yellow-500/20 text-yellow-400' },
        { name: 'Delhi Public Academy', status: 'Active', badge: 'bg-green-500/20 text-green-400' },
        { name: 'St. Mary Convent School', status: 'Active', badge: 'bg-green-500/20 text-green-400' }
      ]
    }
  },
  {
    role: 'School Admin',
    title: 'Institution Control Center',
    desc: 'Comprehensive tools for the school Principal or Administrator. Register teachers and students, organize grade classes and sections, setup customizable fee structures, approve gradebooks, and oversee daily operations.',
    icon: '🏫',
    color: 'from-purple-600 to-pink-800',
    features: [
      'Admission Portal: Simple CSV upload or single registration form.',
      'Class & Period Timetables: Visual schedule planner for classes.',
      'Fee Structure Configurator: Define tuition, transport, or custom fees.',
      'Report Cards Approval: Lock/unlock marks publication to parents.'
    ],
    mockup: {
      title: 'Greenwood High Admin Panel',
      stats: [
        { label: 'Students Enrolled', value: '840 Students' },
        { label: 'Active Teachers', value: '42 Staff' },
        { label: 'Collection Rate', value: '89.4%' }
      ],
      listTitle: 'Pending Report Cards Approval',
      listItems: [
        { name: 'Class 10 - Section A (Semester 1)', status: 'Awaiting Lock', badge: 'bg-yellow-500/20 text-yellow-400' },
        { name: 'Class 12 - Section C (Semester 1)', status: 'Approved', badge: 'bg-green-500/20 text-green-400' }
      ]
    }
  },
  {
    role: 'Teacher',
    title: 'Digital Classroom Assistant',
    desc: 'Empowers teachers to complete classroom tasks in seconds. Mark daily attendance with automatic parents alerts, input exam marks, schedule student homework, and broadcast immediate class notices.',
    icon: '👨‍🏫',
    color: 'from-emerald-600 to-teal-800',
    features: [
      'Simple Attendance marking: Save daily attendance in under 30 seconds.',
      'Bilingual WhatsApp Notifications: Auto-sends Present/Absent/Late alerts to parents.',
      'Marks Entry Board: Input exam metrics with automatic validation.',
      'Announcements Broadcast: Instantly alert your section on noticeboard.'
    ],
    mockup: {
      title: 'Teacher Portal (Class 10-A)',
      stats: [
        { label: 'Today\'s Attendance', value: '96.2% Present' },
        { label: 'Pending Marks', value: 'Science Test' },
        { label: 'Active Notices', value: '2 Board' }
      ],
      listTitle: 'Roster Status (Real-time WhatsApp Alerts Trigger)',
      listItems: [
        { name: 'Aarav Sharma', status: 'Present', badge: 'bg-green-500/20 text-green-400' },
        { name: 'Ishita Verma', status: 'Late (15 min)', badge: 'bg-yellow-500/20 text-yellow-400' },
        { name: 'Kabir Mehta', status: 'Absent', badge: 'bg-red-500/20 text-red-400' }
      ]
    }
  },
  {
    role: 'Student & Parent',
    title: 'Transparency Portal',
    desc: 'A unified portal for parents and students to monitor progress. View daily attendance charts, track homework deadlines, download approved report cards, and pay school invoices securely via Razorpay.',
    icon: '👨‍🎓',
    color: 'from-amber-600 to-orange-800',
    features: [
      'Razorpay Direct Payments: Pay school fees in 1-click via Cards, UPI, Netbanking.',
      'Real-Time Attendance Calendar: Track daily present, late, or absent record.',
      'Digital Marksheets: Instantly view and download approved results.',
      'Homework Ledger: Never miss a school submission deadline.'
    ],
    mockup: {
      title: 'Parent Portal (Aarav Sharma)',
      stats: [
        { label: 'Overall Attendance', value: '97.5% Average' },
        { label: 'Fees Due', value: '₹4,500' },
        { label: 'Exam Grade', value: 'A+ (Science)' }
      ],
      listTitle: 'School Transactions',
      listItems: [
        { name: 'Term 1 Tuition Fee Invoice', status: 'PAID (Razorpay)', badge: 'bg-green-500/20 text-green-400' },
        { name: 'Transport Fee Invoice', status: 'PENDING', badge: 'bg-red-500/20 text-red-400' }
      ]
    }
  }
];

export const Demo = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let interval;
    if (isPlaying) {
      interval = setInterval(() => {
        setProgress(p => {
          if (p >= 100) {
            setActiveStep(prev => (prev + 1) % tourSteps.length);
            return 0;
          }
          return p + 2; // increments progress
        });
      }, 100); // 5 seconds per step
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const handleStepClick = (idx) => {
    setActiveStep(idx);
    setProgress(0);
  };

  const step = tourSteps[activeStep];

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">
      {/* Top Navbar */}
      <nav className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-slate-900/50 backdrop-blur">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
          <EduFlowLogo size={36} />
          <span className="font-display font-bold text-lg hidden sm:inline">EduVault Tour</span>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsPlaying(!isPlaying)} 
            className="text-xs bg-white/10 hover:bg-white/20 text-blue-200 border border-white/10 rounded-full px-3 py-1.5 font-medium transition-all"
          >
            {isPlaying ? '⏸ Pause Autoplay' : '▶ Play Autoplay'}
          </button>
          <button 
            onClick={() => navigate('/')} 
            className="text-xs bg-accent hover:bg-accent-light text-white font-semibold rounded-lg px-4 py-2 transition-all"
          >
            ← Back to Home
          </button>
        </div>
      </nav>

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold mb-3">
            Interactive Product Walkthrough
          </h1>
          <p className="text-gray-400 text-xs sm:text-sm">
            Discover how EduVault automates school administration, attendance notifications, marks entries, and online Razorpay payments for everyone.
          </p>
        </div>

        {/* Roles Tab Selector */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {tourSteps.map((s, idx) => (
            <button
              key={s.role}
              onClick={() => handleStepClick(idx)}
              className={`p-3 rounded-xl border transition-all text-left flex items-center gap-3 relative overflow-hidden ${
                activeStep === idx 
                  ? 'bg-white/5 border-accent text-white shadow-md' 
                  : 'bg-white/2 border-white/5 text-gray-400 hover:border-white/10 hover:text-white'
              }`}
            >
              <span className="text-2xl">{s.icon}</span>
              <div>
                <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Role</div>
                <div className="text-xs font-bold font-display">{s.role}</div>
              </div>
              {/* Step Progress Line (Only shown on active item when autoplaying) */}
              {activeStep === idx && isPlaying && (
                <div className="absolute bottom-0 left-0 h-1 bg-accent transition-all duration-100" style={{ width: `${progress}%` }}></div>
              )}
            </button>
          ))}
        </div>

        {/* Showcase Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Explanation Area */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-accent bg-accent/15 px-3 py-1 rounded-full border border-accent/20">
                {step.role} Dashboard
              </span>
              <h2 className="font-display text-2xl sm:text-3xl font-extrabold leading-tight">
                {step.title}
              </h2>
              <p className="text-gray-300 text-xs sm:text-sm leading-relaxed">
                {step.desc}
              </p>
              
              <hr className="border-white/10 my-4" />
              
              <h3 className="font-display font-bold text-sm text-white">Core Functionality</h3>
              <ul className="space-y-2 text-xs text-gray-400">
                {step.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="text-accent mt-0.5">✦</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-slate-900 border border-white/10 rounded-xl p-4 flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-400">Next Dashboard Preview</div>
                <div className="text-xs font-bold mt-0.5 text-blue-200">
                  {tourSteps[(activeStep + 1) % tourSteps.length].role}
                </div>
              </div>
              <button 
                onClick={() => handleStepClick((activeStep + 1) % tourSteps.length)}
                className="bg-white/10 hover:bg-white/20 text-white rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all"
              >
                Next Dashboard →
              </button>
            </div>
          </div>

          {/* Interactive Interface Simulation Mockup */}
          <div className="lg:col-span-7">
            <div className={`bg-gradient-to-br ${step.color} rounded-3xl p-1 shadow-2xl`}>
              <div className="bg-slate-950 rounded-[22px] overflow-hidden border border-white/10">
                {/* Mockup Header */}
                <div className="bg-slate-900 px-5 py-3.5 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
                    <span className="text-gray-400 font-mono text-[10px] ml-2 truncate max-w-[200px] sm:max-w-none">
                      https://eduvault.com/dashboard/mockup
                    </span>
                  </div>
                  <span className="bg-white/10 text-[9px] font-mono text-gray-400 px-2 py-0.5 rounded uppercase">
                    Preview Mode
                  </span>
                </div>

                {/* Mockup Body */}
                <div className="p-5 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-display font-bold text-sm sm:text-base text-white">{step.mockup.title}</h4>
                    <span className="text-[10px] text-gray-500">Last updated: Just now</span>
                  </div>

                  {/* Quick Cards */}
                  <div className="grid grid-cols-3 gap-3">
                    {step.mockup.stats.map(s => (
                      <div key={s.label} className="bg-slate-900 border border-white/5 rounded-xl p-3">
                        <div className="text-[9px] text-gray-500 uppercase font-semibold truncate">{s.label}</div>
                        <div className="text-[11px] sm:text-sm font-bold text-white mt-1 truncate">{s.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* List Simulator */}
                  <div className="bg-slate-900 border border-white/5 rounded-xl p-4 space-y-3">
                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{step.mockup.listTitle}</div>
                    <div className="space-y-2">
                      {step.mockup.listItems.map((item, idx) => (
                        <div key={idx} className="bg-slate-950 border border-white/5 rounded-lg p-2.5 flex items-center justify-between text-xs">
                          <span className="font-medium text-gray-300">{item.name}</span>
                          <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${item.badge}`}>
                            {item.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Interactive Button Simulation */}
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 flex items-center gap-3 text-xs text-blue-300">
                    <span className="text-lg">💡</span>
                    <div>
                      <span className="font-semibold text-white">Feature Demo Tip:</span> Switch roles above to inspect other dashboard layouts. Use the "Pause Autoplay" controls to stop timer cycles.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Demo;
