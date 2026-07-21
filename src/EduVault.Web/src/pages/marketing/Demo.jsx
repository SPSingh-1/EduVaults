import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EduFlowLogo from '../../components/common/Logo';

const demoContent = {
  en: {
    title: "Interactive Product Walkthrough",
    subtitle: "Discover how EduVault automates school administration, attendance notifications, marks entries, and online Razorpay payments for everyone.",
    backToHome: "← Back to Home",
    roles: {
      admin: {
        label: "School Admin",
        icon: "🏫",
        color: "from-purple-600 to-pink-800",
        features: [
          {
            name: "Dashboard Overview",
            desc: "This is the School Admin main dashboard. It provides an immediate overview of the school's statistics (Active Students, Staff Members, and Classes) and displays the Student Enrollment Trend graph alongside a Platform Subscription Pending alert and quick action shortcuts.",
            image: "/school_admin_dashboard_overview.png"
          },
          {
            name: "Admission Form",
            desc: "The student admission form allows registering new students manually. It collects Student Personal Details (First Name, Last Name, Email, Password, Enrollment Class, Blood Group, Date of Birth) and Guardian Information (Guardian Name, Contact, Relationship, Address).",
            image: "/student_admission_form.png"
          },
          {
            name: "Bulk Student Import",
            desc: "The bulk student import tool allows administrators to upload a CSV file containing multiple student records to import them at once. Requires selecting a target class and choosing a valid CSV file with specific columns.",
            image: "/bulk_student_import.png"
          },
          {
            name: "Student Directory",
            desc: "The student directory lists all student records in a clean tabular grid. Administrators can search by name, filter by date, class, section, or status, and use action buttons to: View student profiles, Edit their information, or Delete their records permanently.",
            image: "/admin_student_grid.png"
          },
          {
            name: "Teacher Directory",
            desc: "Allows administrators to manage the school's teaching staff. Register new teachers, assign them to academic departments, record credentials, and manage qualifications.",
            image: "/school_admin_dashboard_overview.png"
          },
          {
            name: "Fees & Billing",
            desc: "Set tuition and transport fee structures, issue invoices, track unpaid balances, and monitor transaction receipts in real time.",
            image: "/fee_payment_mockup.png"
          }
        ]
      },
      teacher: {
        label: "Teacher",
        icon: "👨‍🏫",
        color: "from-emerald-600 to-teal-800",
        features: [
          {
            name: "Teacher Dashboard",
            desc: "This is the Teacher main dashboard page. It shows an immediate summary of the academic session, listing total classes assigned, active student enrollments, pending review gradebooks, and their direct deposit monthly salary details.",
            image: "/teacher_dashboard.png"
          },
          {
            name: "My Assigned Classes",
            desc: "Displays the teacher's active classes roster and interactive timetable grid, detailing period schedules, subject names, and section rooms (e.g. Class 1 - A).",
            image: "/teacher_assigned_classes.png"
          },
          {
            name: "Mark Student Attendance",
            desc: "Allows teachers to select their assigned class sections and log daily attendance (Present, Late, Absent). Saving the record instantly triggers automated bilingual WhatsApp alerts to the student's guardian.",
            image: "/teacher_mark_attendance.png"
          },
          {
            name: "My Attendance Logs",
            desc: "Provides a full interactive monthly log showing the teacher's own attendance, displaying overall attendance rate percentage alongside Present, Late, and Absent calendar days.",
            image: "/teacher_self_attendance.png"
          },
          {
            name: "Student Marks Entry",
            desc: "Enables teachers to input students' exam grade results (Theory and Practical marks) in a clean ledger structure. Finalizing locks the report cards from further editing.",
            image: "/teacher_marks_entry.png"
          }
        ]
      },
      student: {
        label: "Student & Parent",
        icon: "👨‍🎓",
        color: "from-amber-600 to-orange-800",
        features: [
          {
            name: "Fee Payment Portal",
            desc: "Parents can view detailed school fee invoices and pay online securely via 1-click Razorpay integration, supporting Cards, UPI, Netbanking, and Wallets.",
            image: "/fee_payment_mockup.png"
          },
          {
            name: "Attendance Calendar",
            desc: "Provides a monthly interactive attendance calendar displaying color-coded daily presence indicators (Green for Present, Yellow for Late, Red for Absent).",
            image: "/simple_attendance_mockup.png"
          },
          {
            name: "Report Card",
            desc: "Allows students and parents to view published report cards, view exam mark breakdowns, and download official approved term marksheets.",
            image: "/admin_student_grid.png"
          }
        ]
      }
    }
  },
  hi: {
    title: "इंटरएक्टिव उत्पाद डेमो",
    subtitle: "जानें कि कैसे एडुवॉल्ट स्कूल प्रशासन, माता-पिता को व्हाट्सएप संदेश, परीक्षा अंक प्रविष्टि और ऑनलाइन फीस भुगतान को आसान बनाता है।",
    backToHome: "← मुख्य पृष्ठ",
    roles: {
      admin: {
        label: "स्कूल एडमिन",
        icon: "🏫",
        color: "from-purple-600 to-pink-800",
        features: [
          {
            name: "डैशबोर्ड ओवरव्यू",
            desc: "यह स्कूल एडमिन का मुख्य डैशबोर्ड है। यह स्कूल के आँकड़ों (सक्रिय छात्रों, शिक्षकों और कक्षाओं) का विवरण देता है और प्लेटफॉर्म सदस्यता लंबित चेतावनी और त्वरित कार्यों के साथ छात्र नामांकन प्रवृत्ति ग्राफ़ प्रदर्शित करता है।",
            image: "/school_admin_dashboard_overview.png"
          },
          {
            name: "प्रवेश फ़ॉर्म (एडमिशन)",
            desc: "छात्र प्रवेश फॉर्म नए छात्रों को मैन्युअल रूप से पंजीकृत करने की अनुमति देता है। यह छात्र के व्यक्तिगत विवरण (नाम, ईमेल, पासवर्ड, कक्षा, रक्त समूह, जन्म तिथि) और अभिभावक की जानकारी (नाम, संपर्क, संबंध, पता) एकत्र करता है।",
            image: "/student_admission_form.png"
          },
          {
            name: "थोक छात्र आयात",
            desc: "बल्क स्टूडेंट इम्पोर्ट टूल स्कूल एडमिन को एक साथ कई छात्रों के रिकॉर्ड आयात करने के लिए एक सीएसवी फ़ाइल अपलोड करने की अनुमति देता है। इसके लिए एक लक्षित कक्षा का चयन करना और विशिष्ट कॉलम वाली वैध सीएसवी फ़ाइल चुनना आवश्यक है।",
            image: "/bulk_student_import.png"
          },
          {
            name: "छात्र तालिका (निर्देशिका)",
            desc: "छात्र निर्देशिका सभी छात्र रिकॉर्ड को एक साफ तालिका (ग्रिड) में सूचीबद्ध करती है। एडमिन नाम से खोज सकते हैं, कक्षा, अनुभाग या स्थिति से फ़िल्टर कर सकते हैं, और एक्शन बटन का उपयोग कर सकते हैं: छात्र प्रोफाइल देखने के लिए **View**, जानकारी बदलने के लिए **Edit**, या रिकॉर्ड को हमेशा के लिए हटाने के लिए **Delete**।",
            image: "/admin_student_grid.png"
          },
          {
            name: "शिक्षक निर्देशिका",
            desc: "स्कूल के शिक्षण कर्मचारियों को प्रबंधित करने की अनुमति देता है। नए शिक्षकों को पंजीकृत करें, उन्हें विभागों में नियुक्त करें, और उनकी योग्यताएं प्रबंधित करें।",
            image: "/school_admin_dashboard_overview.png"
          },
          {
            name: "फीस और बिलिंग",
            desc: "ट्यूशन और परिवहन शुल्क संरचनाएं निर्धारित करें, इनवॉइस जारी करें, बकाया राशि को ट्रैक करें और वास्तविक समय में लेनदेन रसीदों की निगरानी करें।",
            image: "/fee_payment_mockup.png"
          }
        ]
      },
      teacher: {
        label: "शिक्षक",
        icon: "👨‍🏫",
        color: "from-emerald-600 to-teal-800",
        features: [
          {
            name: "शिक्षक डैशबोर्ड",
            desc: "यह शिक्षक का मुख्य डैशबोर्ड पृष्ठ है। यह शैक्षणिक सत्र का विवरण देता है, जैसे कि कुल कक्षाएं, सक्रिय छात्र नामांकन, लंबित समीक्षा रिपोर्ट, और मासिक वेतन विवरण की सूची।",
            image: "/teacher_dashboard.png"
          },
          {
            name: "आवंटित कक्षाएं (My Classes)",
            desc: "शिक्षक के सक्रिय कक्षा रोस्टर और इंटरैक्टिव समय सारिणी ग्रिड को प्रदर्शित करता है, जिसमें अवधि कार्यक्रम, विषय का नाम और अनुभाग कमरे शामिल हैं (जैसे Class 1 - A)।",
            image: "/teacher_assigned_classes.png"
          },
          {
            name: "छात्र हाजिरी दर्ज करें",
            desc: "शिक्षकों को अपनी आवंटित कक्षाओं का चयन करने और दैनिक हाजिरी (उपस्थित, देरी, अनुपस्थित) दर्ज करने की अनुमति देता है। रिकॉर्ड सहेजने पर तुरंत अभिभावक को स्वचालित व्हाट्सएप सूचना चली जाती है।",
            image: "/teacher_mark_attendance.png"
          },
          {
            name: "मेरी उपस्थिति लॉग",
            desc: "शिक्षक की स्वयं की मासिक उपस्थिति लॉग प्रदान करता है, जो कुल उपस्थिति दर प्रतिशत के साथ कैलेंडर दिनों को दिखाता है।",
            image: "/teacher_self_attendance.png"
          },
          {
            name: "छात्र अंक प्रविष्टि (Marks Entry)",
            desc: "शिक्षकों को छात्रों के परीक्षा परिणामों (सिद्धांत और व्यावहारिक अंक) को सीधे दर्ज करने में सक्षम बनाता है। अंतिम रूप देने के बाद रिपोर्ट कार्ड लॉक हो जाता है।",
            image: "/teacher_marks_entry.png"
          }
        ]
      },
      student: {
        label: "छात्र और अभिभावक",
        icon: "👨‍🎓",
        color: "from-amber-600 to-orange-800",
        features: [
          {
            name: "शुल्क भुगतान पोर्टल",
            desc: "अभिभावक विस्तृत स्कूल शुल्क इनवॉइस देख सकते हैं और कार्ड, यूपीआई, नेटबैंकिंग और वॉलेट का समर्थन करने वाले 1-क्लिक रेज़रपे एकीकरण के माध्यम से सुरक्षित रूप से ऑनलाइन भुगतान कर सकते हैं।",
            image: "/fee_payment_mockup.png"
          },
          {
            name: "हाजिरी कैलेंडर",
            desc: "एक मासिक उपस्थिति कैलेंडर प्रदान करता है जो रंग-कोडित दैनिक उपस्थिति स्थिति (उपस्थित के लिए हरा, देरी के लिए पीला, अनुपस्थित के लिए लाल) प्रदर्शित करता है।",
            image: "/simple_attendance_mockup.png"
          },
          {
            name: "प्रगति पत्रक (Report Card)",
            desc: "छात्रों और अभिभावकों को प्रकाशित रिपोर्ट कार्ड देखने, परीक्षा अंकों का विवरण देखने और आधिकारिक स्वीकृत टर्म मार्कशीट डाउनलोड करने की अनुमति देता है।",
            image: "/admin_student_grid.png"
          }
        ]
      }
    }
  }
};

export const Demo = () => {
  const navigate = useNavigate();
  const [lang, setLang] = useState('en'); // 'en' or 'hi'
  const [activeRole, setActiveRole] = useState('admin'); // 'admin', 'teacher', 'student'
  const [activeFeatureIdx, setActiveFeatureIdx] = useState(0);

  const t = demoContent[lang];
  const currentRole = t.roles[activeRole];
  const currentFeature = currentRole.features[activeFeatureIdx];

  const getNextFeature = () => {
    if (activeFeatureIdx + 1 < currentRole.features.length) {
      return currentRole.features[activeFeatureIdx + 1];
    } else {
      const roleKeys = Object.keys(t.roles);
      const nextRoleIdx = (roleKeys.indexOf(activeRole) + 1) % roleKeys.length;
      return t.roles[roleKeys[nextRoleIdx]].features[0];
    }
  };

  const nextFeature = getNextFeature();

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">
      {/* Top Navbar */}
      <nav className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-slate-900/50 backdrop-blur">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
          <EduFlowLogo size={36} alwaysShowDefaultText={true} />
          <span className="font-display font-bold text-lg hidden sm:inline">EduVault Tour</span>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/')} 
            className="text-xs bg-accent hover:bg-accent-light text-white font-semibold rounded-lg px-4 py-2 transition-all"
          >
            {t.backToHome}
          </button>
        </div>
      </nav>

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Language Selector Toggle */}
        <div className="flex justify-end mb-6">
          <div className="inline-flex items-center gap-2 bg-slate-900 border border-white/10 rounded-full p-1 text-xs">
            <button 
              onClick={() => setLang('en')} 
              className={`px-4 py-1.5 rounded-full font-semibold transition-all ${lang === 'en' ? 'bg-accent text-white shadow' : 'text-gray-400 hover:text-white'}`}
            >
              English
            </button>
            <button 
              onClick={() => setLang('hi')} 
              className={`px-4 py-1.5 rounded-full font-semibold transition-all ${lang === 'hi' ? 'bg-accent text-white shadow' : 'text-gray-400 hover:text-white'}`}
            >
              हिन्दी
            </button>
          </div>
        </div>

        <div className="text-center max-w-2xl mx-auto mb-10">
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold mb-3">
            {t.title}
          </h1>
          <p className="text-gray-400 text-xs sm:text-sm">
            {t.subtitle}
          </p>
        </div>

        {/* Roles Tab Selector */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {Object.entries(t.roles).map(([roleKey, r]) => (
            <button
              key={roleKey}
              onClick={() => { setActiveRole(roleKey); setActiveFeatureIdx(0); }}
              className={`p-4 rounded-xl border transition-all text-center flex flex-col sm:flex-row items-center justify-center gap-3 relative overflow-hidden ${
                activeRole === roleKey 
                  ? 'bg-white/5 border-accent text-white shadow-md' 
                  : 'bg-white/2 border-white/5 text-gray-400 hover:border-white/10 hover:text-white'
              }`}
            >
              <span className="text-3xl">{r.icon}</span>
              <div>
                <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Role</div>
                <div className="text-xs sm:text-sm font-bold font-display">{r.label}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Sub-Feature Selector */}
        <div className="flex flex-wrap gap-2.5 mb-8 justify-center">
          {currentRole.features.map((feature, idx) => (
            <button
              key={idx}
              onClick={() => setActiveFeatureIdx(idx)}
              className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-all ${
                activeFeatureIdx === idx
                  ? 'bg-accent border-accent text-white shadow'
                  : 'bg-slate-900 border-white/10 text-gray-300 hover:border-white/20 hover:text-white'
              }`}
            >
              {feature.name}
            </button>
          ))}
        </div>

        {/* Showcase Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch text-left">
          {/* Explanation Area */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-accent bg-accent/15 px-3 py-1 rounded-full border border-accent/20">
                {currentRole.label} Features
              </span>
              <h2 className="font-display text-2xl sm:text-3xl font-extrabold leading-tight">
                {currentFeature.name}
              </h2>
              <p className="text-gray-300 text-xs sm:text-sm leading-relaxed font-normal">
                {currentFeature.desc}
              </p>
            </div>

            <div className="bg-slate-900 border border-white/10 rounded-xl p-4 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider">Next Feature Preview</div>
                <div className="text-xs font-bold mt-0.5 text-blue-200">
                  {nextFeature.name}
                </div>
              </div>
              <button 
                onClick={() => {
                  if (activeFeatureIdx + 1 < currentRole.features.length) {
                    setActiveFeatureIdx(activeFeatureIdx + 1);
                  } else {
                    const roleKeys = Object.keys(t.roles);
                    const nextRoleIdx = (roleKeys.indexOf(activeRole) + 1) % roleKeys.length;
                    setActiveRole(roleKeys[nextRoleIdx]);
                    setActiveFeatureIdx(0);
                  }
                }}
                className="bg-white/10 hover:bg-white/20 text-white rounded-lg px-3 py-1.5 text-[10px] font-semibold transition-all"
              >
                Next →
              </button>
            </div>
          </div>

          {/* Screenshot / Mockup Display */}
          <div className="lg:col-span-7">
            <div className={`bg-gradient-to-br ${currentRole.color} rounded-3xl p-1 shadow-2xl`}>
              <div className="bg-slate-950 rounded-[22px] overflow-hidden border border-white/10">
                {/* Mockup Header */}
                <div className="bg-slate-900 px-5 py-3 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
                    <span className="text-gray-400 font-mono text-[10px] ml-2 truncate max-w-[200px] sm:max-w-none">
                      https://eduvault.com/demo/{activeRole}/{currentFeature.name.toLowerCase().replace(/\s+/g, '-')}
                    </span>
                  </div>
                  <span className="bg-white/10 text-[8px] font-mono text-gray-400 px-2 py-0.5 rounded uppercase">
                    Interactive Screen
                  </span>
                </div>

                {/* Mockup Image Display */}
                <div className="p-4 bg-slate-950 flex justify-center items-center min-h-[300px]">
                  <img 
                    key={`${activeRole}_${activeFeatureIdx}`} 
                    src={currentFeature.image} 
                    alt={currentFeature.name} 
                    className="max-w-full h-auto rounded-lg border border-white/5 shadow-md object-contain max-h-[350px] animate-fadeIn" 
                  />
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
