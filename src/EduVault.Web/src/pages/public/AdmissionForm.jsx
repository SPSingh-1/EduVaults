import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  User,
  Users,
  MapPin,
  School,
  HeartPulse,
  FileCheck2,
  Copy,
  Printer,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  Globe,
  Languages
} from 'lucide-react';

const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5265/api';
const API_BASE = rawApiUrl.replace(/\/api\/?$/, '');

const DEFAULT_CLASSES = [
  'Nursery', 'LKG', 'UKG',
  'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5',
  'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10',
  'Class 11', 'Class 12'
];

// Comprehensive 3-Language Dictionary
const translations = {
  hi: {
    languageLabel: 'भाषा',
    selectLanguageHeading: 'आवेदन पत्र की भाषा चुनें',
    selectLanguageDesc: 'आप अपनी सुविधानुसार भाषा चुन सकते हैं। पूरा फॉर्म इसी भाषा में रहेगा।',
    portalSubtitle: 'ऑनलाइन विद्यालय प्रवेश पंजीकरण पोर्टल',
    schoolPortalUnavailable: 'विद्यालय प्रवेश पोर्टल अनुपलब्ध है',
    tryAgain: 'पुनः प्रयास करें',
    stepOf: 'चरण {current} / {total}',
    steps: [
      { title: 'गोपनीयता एवं सहमति', desc: 'डेटा संरक्षण सहमति' },
      { title: 'छात्र का विवरण', desc: 'नाम, जन्म तिथि, कक्षा' },
      { title: 'माता-पिता का विवरण', desc: 'माता एवं पिता की जानकारी' },
      { title: 'निवास का पता', desc: 'स्थायी पता' },
      { title: 'पूर्व विद्यालय रिकॉर्ड', desc: 'पिछला शैक्षणिक विवरण' },
      { title: 'स्वास्थ्य एवं आपातकालीन', desc: 'चिकित्सा एवं संपर्क' },
      { title: 'समीक्षा एवं सबमिट', desc: 'जांचें एवं जमा करें' }
    ],
    dpdpNoticeTitle: 'डेटा संरक्षण एवं गोपनीयता सूचना (DPDP Act 2023)',
    dpdpNoticeText: 'आपकी और आपके बच्चे की व्यक्तिगत जानकारी का उपयोग केवल विद्यालय प्रवेश और शैक्षणिक पंजीकरण के लिए किया जाएगा। आधार संख्या वैकल्पिक है और एन्क्रिप्टेड रूप में सुरक्षित रखी जाती है।',
    consentCheckboxText: 'मैं पुष्टि करता/करती हूँ कि मैं विद्यालय में प्रवेश और छात्र प्रोफ़ाइल निर्माण के लिए स्वेच्छा से यह विवरण प्रदान कर रहा/रही हूँ। *',
    formQuickTip: '💡 सूचना: यह आवेदन पत्र छोटे चरणों में विभाजित है (केवल 2-3 मिनट लगेंगे)। आपकी जानकारी स्वतः सुरक्षित हो रही है।',

    classApplyingFor: 'प्रवेश हेतु कक्षा *',
    selectClassPlaceholder: '-- कक्षा का चयन करें --',
    childFirstName: 'छात्र का प्रथम नाम *',
    childMiddleName: 'मध्य नाम (वैकल्पिक)',
    childLastName: 'उपनाम / अंतिम नाम *',
    dob: 'जन्म तिथि *',
    gender: 'लिंग *',
    genderOptions: { Male: 'बालक', Female: 'बालिका', Other: 'अन्य' },
    category: 'वर्ग (Category)',
    categoryOptions: { GEN: 'सामान्य (General)', OBC: 'अन्य पिछड़ा वर्ग (OBC)', SC: 'अनुसूचित जाति (SC)', ST: 'अनुसूचित जनजाति (ST)', EWS: 'ईडब्ल्यूएस (EWS)' },
    bloodGroup: 'रक्त समूह (Blood Group)',
    religion: 'धर्म (Religion)',
    religionOptions: { Hindu: 'हिन्दू', Muslim: 'मुस्लिम', Sikh: 'सिख', Christian: 'ईसाई', Jain: 'जैन', Buddhist: 'बौद्ध', Other: 'अन्य' },
    aadhaarNumber: 'छात्र का आधार नंबर',
    aadhaarOptionalHint: '(वैकल्पिक — यदि उपलब्ध हो)',
    aadhaarPrivacyNote: '🔒 DPDP सुरक्षित: केवल अंतिम 4 अंक विद्यालय प्रशासन को दिखाई देंगे।',

    fatherSectionTitle: 'पिता / अभिभावक का विवरण',
    fatherName: 'पिता का पूरा नाम *',
    fatherPhone: 'मोबाइल / व्हाट्सएप नंबर *',
    fatherPhoneHint: '(लॉगिन विवरण और सूचनाएँ इसी नंबर पर भेजी जाएँगी)',
    fatherOccupation: 'पिता का व्यवसाय',
    fatherEmail: 'पिता का ईमेल (वैकल्पिक)',
    motherSectionTitle: 'माता का विवरण',
    motherName: 'माता का पूरा नाम',
    motherOccupation: 'माता का व्यवसाय',
    annualFamilyIncome: 'वार्षिक पारिवारिक आय',
    incomeOptions: [
      { value: 'Below ₹1 Lakh', label: '₹1 लाख से कम' },
      { value: '₹1L - ₹3L', label: '₹1 लाख - ₹3 लाख' },
      { value: '₹3L - ₹6L', label: '₹3 लाख - ₹6 लाख' },
      { value: '₹6L - ₹12L', label: '₹6 लाख - ₹12 लाख' },
      { value: 'Above ₹12 Lakh', label: '₹12 लाख से अधिक' }
    ],

    houseNo: 'मकान / फ्लैट संख्या',
    streetOrVillage: 'गली / मोहल्ला / गाँव',
    city: 'शहर / नगर *',
    district: 'ज़िला',
    state: 'राज्य *',
    pincode: 'पिन कोड *',

    prevSchoolNote: 'यदि नर्सरी या केजी में प्रवेश ले रहे हैं, तो यह अनुभाग खाली छोड़ सकते हैं।',
    prevSchoolName: 'पूर्व विद्यालय का नाम',
    prevBoard: 'पूर्व शिक्षा बोर्ड',
    prevClass: 'पिछली उत्तीर्ण कक्षा',
    tcNumber: 'स्थानांतरण प्रमाण पत्र (TC) संख्या',
    lastExamPercent: 'अंतिम परीक्षा का प्रतिशत / ग्रेड',
    motherTongue: 'मातृभाषा',
    reasonForLeaving: 'विद्यालय छोड़ने का कारण',

    heightCm: 'ऊँचाई (सेमी में)',
    weightKg: 'वज़न (किग्रा में)',
    chronicIllness: 'कोई ज्ञात एलर्जी या पुरानी बीमारी',
    emergencySectionTitle: 'आपत्कालीन संपर्क विवरण *',
    emergencyName: 'संपर्क व्यक्ति का नाम *',
    emergencyRelation: 'संबंध *',
    relationOptions: { Father: 'पिता', Mother: 'माता', Uncle: 'रिश्तेदार', Guardian: 'अभिभावक' },
    emergencyPhone: 'आपत्कालीन फ़ोन नंबर *',

    reviewTitle: 'आवेदन सारांश समीक्षा',
    reviewSubtitle: 'कृपया आवेदन जमा करने से पहले सभी विवरणों की जांच करें:',
    studentLabel: 'छात्र:',
    classLabel: 'प्रवेश कक्षा:',
    dobLabel: 'जन्म तिथि:',
    genderLabel: 'लिंग:',
    fatherLabel: 'पिता / अभिभावक:',
    phoneLabel: 'मोबाइल नंबर:',
    addressLabel: 'पता:',
    prevSchoolLabel: 'पूर्व विद्यालय:',
    documentsNoteTitle: '📄 प्रवेश के दिन आवश्यक मूल/छायाप्रति दस्तावेज:',
    documentsNoteDesc: 'वर्तमान में ऑनलाइन दस्तावेज अपलोड करने की आवश्यकता नहीं है। प्रवेश पुष्टि के दिन कृपया निम्नलिखित दस्तावेजों की प्रतियां विद्यालय में लाएं:',
    documentList: [
      'छात्र की 4 पासपोर्ट साइज फोटो',
      'बच्चे का जन्म प्रमाण पत्र (नगर निगम / अस्पताल)',
      'स्थानांतरण प्रमाण पत्र (TC) एवं अंकतालिका (यदि अन्य विद्यालय से आ रहे हैं)',
      'माता-पिता का पहचान एवं निवास प्रमाण पत्र (आधार कार्ड / वोटर आईडी)'
    ],
    submissionNotice: '✅ आवेदन जमा होते ही आपको एक आधिकारिक आवेदन क्रमांक (Application ID) प्राप्त होगा और आवेदन विद्यालय प्रशासन के पास समीक्षा हेतु जाएगा।',

    backBtn: 'पिछला',
    nextBtn: 'अगला चरण',
    submitBtn: 'आवेदन जमा करें',
    submittingBtn: 'आवेदन जमा हो रहा है...',
    copyAppId: 'आईडी कॉपी करें',
    copiedText: 'कॉपी कर लिया गया!',
    printBtn: 'प्रिंट / पीडीएफ सेव करें',
    newFormBtn: 'नया आवेदन भरें',

    successRegistered: 'आवेदन सफलतापूर्वक पंजीकृत',
    successHeading: 'प्रवेश आवेदन प्राप्त हुआ!',
    successSubheading: 'धन्यवाद, {fatherName} जी। {childName} के प्रवेश का आवेदन सफलतापूर्वक {schoolName} में जमा कर दिया गया है।',
    officialAppId: 'आपका आधिकारिक आवेदन क्रमांक (Application ID):',
    appliedForGrade: 'चयनित कक्षा:',
    nextStepsTitle: 'आगे के चरण:',
    nextStepsList: [
      '1. विद्यालय प्रशासन आपके आवेदन की समीक्षा करेगा।',
      '2. स्वीकृति मिलते ही आपके व्हाट्सएप नंबर ({phone}) पर छात्र पोर्टल लॉगिन विवरण प्रेषित कर दिया जाएगा।',
      '3. कृपया सत्यापन के दिन छात्र की फोटो, जन्म प्रमाण पत्र एवं टीसी (TC) साथ लाएं।'
    ],

    errorFillAll: 'कृपया आगे बढ़ने से पहले इस पृष्ठ पर लाल रंग से चिह्नित सभी अनिवार्य फ़ील्ड भरें।',
    errorConsent: 'कृपया आगे बढ़ने के लिए डेटा गोपनीयता घोषणा स्वीकार करें।',
    errorFirstName: 'छात्र का प्रथम नाम अनिवार्य है।',
    errorLastName: 'छात्र का उपनाम (अंतिम नाम) अनिवार्य है।',
    errorDob: 'जन्म तिथि चुनना अनिवार्य है।',
    errorClass: 'कृपया कक्षा का चयन करें।',
    errorGender: 'लिंग का चयन करना अनिवार्य है।',
    errorFatherName: 'पिता / अभिभावक का पूरा नाम अनिवार्य है।',
    errorFatherPhone: 'कृपया वैध 10 अंकों का मोबाइल नंबर दर्ज करें।',
    errorCity: 'शहर / नगर का नाम अनिवार्य है।',
    errorState: 'राज्य का नाम अनिवार्य है।',
    errorPincode: 'कृपया वैध 6 अंकों का पिन कोड दर्ज करें।',
    errorEmergencyName: 'आपत्कालीन संपर्क व्यक्ति का नाम अनिवार्य है।',
    errorEmergencyPhone: 'कृपया वैध 10 अंकों का आपत्कालीन फ़ोन नंबर दर्ज करें।'
  },

  en: {
    languageLabel: 'Language',
    selectLanguageHeading: 'Choose Form Language',
    selectLanguageDesc: 'Select your preferred language. The entire form will be presented in this language.',
    portalSubtitle: 'Online Student Admission Portal',
    schoolPortalUnavailable: 'School Admission Portal Unavailable',
    tryAgain: 'Try Again',
    stepOf: 'Step {current} of {total}',
    steps: [
      { title: 'Privacy & Consent', desc: 'DPDP Data Privacy' },
      { title: 'Student Info', desc: 'Name, DOB, Class' },
      { title: 'Parents Info', desc: 'Father & Mother' },
      { title: 'Address', desc: 'Residential Address' },
      { title: 'Past School', desc: 'Academic Record' },
      { title: 'Health & Emergency', desc: 'Medical & Contact' },
      { title: 'Review & Submit', desc: 'Confirm & Submit' }
    ],
    dpdpNoticeTitle: 'Data Protection & Privacy Notice (DPDP Act 2023)',
    dpdpNoticeText: 'Your and your child’s personal details will only be used for school admission and academic registration. Aadhaar number is optional and securely stored in encrypted format.',
    consentCheckboxText: 'I hereby give my voluntary consent to provide these details for school admission and student profile creation. *',
    formQuickTip: '💡 Note: The form consists of short steps (takes only 2-3 minutes). Your progress is automatically saved.',

    classApplyingFor: 'Class Applying For *',
    selectClassPlaceholder: '-- Select Class --',
    childFirstName: "Student's First Name *",
    childMiddleName: 'Middle Name (Optional)',
    childLastName: 'Last Name / Surname *',
    dob: 'Date of Birth *',
    gender: 'Gender *',
    genderOptions: { Male: 'Male', Female: 'Female', Other: 'Other' },
    category: 'Category',
    categoryOptions: { GEN: 'General', OBC: 'OBC', SC: 'SC', ST: 'ST', EWS: 'EWS' },
    bloodGroup: 'Blood Group',
    religion: 'Religion',
    religionOptions: { Hindu: 'Hindu', Muslim: 'Muslim', Sikh: 'Sikh', Christian: 'Christian', Jain: 'Jain', Buddhist: 'Buddhist', Other: 'Other' },
    aadhaarNumber: 'Student Aadhaar Number',
    aadhaarOptionalHint: '(Optional — If Available)',
    aadhaarPrivacyNote: '🔒 DPDP Compliant: Stored encrypted. Only last 4 digits visible to administrators.',

    fatherSectionTitle: "Father / Guardian's Details",
    fatherName: "Father's Full Name *",
    fatherPhone: 'Mobile / WhatsApp Number *',
    fatherPhoneHint: '(Login credentials and updates will be delivered here)',
    fatherOccupation: "Father's Occupation",
    fatherEmail: "Father's Email (Optional)",
    motherSectionTitle: "Mother's Details",
    motherName: "Mother's Full Name",
    motherOccupation: "Mother's Occupation",
    annualFamilyIncome: 'Annual Family Income',
    incomeOptions: [
      { value: 'Below ₹1 Lakh', label: 'Below ₹1 Lakh' },
      { value: '₹1L - ₹3L', label: '₹1 Lakh - ₹3 Lakh' },
      { value: '₹3L - ₹6L', label: '₹3 Lakh - ₹6 Lakh' },
      { value: '₹6L - ₹12L', label: '₹6 Lakh - ₹12 Lakh' },
      { value: 'Above ₹12 Lakh', label: 'Above ₹12 Lakh' }
    ],

    houseNo: 'House / Flat No.',
    streetOrVillage: 'Street / Colony / Village',
    city: 'City / Town *',
    district: 'District',
    state: 'State *',
    pincode: 'Pincode *',

    prevSchoolNote: 'If applying for Nursery or KG, you may leave this section blank.',
    prevSchoolName: 'Previous School Name',
    prevBoard: 'Previous Education Board',
    prevClass: 'Class Last Studied',
    tcNumber: 'Transfer Certificate (TC) Number',
    lastExamPercent: 'Last Exam Percentage or Grade',
    motherTongue: 'Mother Tongue',
    reasonForLeaving: 'Reason for Leaving',

    heightCm: 'Height (cm)',
    weightKg: 'Weight (kg)',
    chronicIllness: 'Known Allergies or Chronic Illness',
    emergencySectionTitle: 'Emergency Contact Details *',
    emergencyName: 'Contact Person Name *',
    emergencyRelation: 'Relationship *',
    relationOptions: { Father: 'Father', Mother: 'Mother', Uncle: 'Relative', Guardian: 'Guardian' },
    emergencyPhone: 'Emergency Contact Phone *',

    reviewTitle: 'Application Summary Review',
    reviewSubtitle: 'Please verify all information before final submission:',
    studentLabel: 'Student:',
    classLabel: 'Target Class:',
    dobLabel: 'DOB:',
    genderLabel: 'Gender:',
    fatherLabel: 'Father / Guardian:',
    phoneLabel: 'Mobile Number:',
    addressLabel: 'Address:',
    prevSchoolLabel: 'Previous School:',
    documentsNoteTitle: '📄 Physical Documents Required on Enrollment Day:',
    documentsNoteDesc: 'Online document upload is not required at this stage. Please bring physical copies of the following documents to the school reception on confirmation day:',
    documentList: [
      '4 Passport Size Student Photographs',
      "Child's Birth Certificate (Municipal Corporation / Hospital)",
      'Transfer Certificate (TC) & Previous Marksheet (if transferring from another school)',
      "Parent's Identity & Address Proof (Aadhaar / Voter ID)"
    ],
    submissionNotice: '✅ Upon submission, you will receive an official Application ID and your request will be reviewed by the school administration.',

    backBtn: 'Back',
    nextBtn: 'Next Step',
    submitBtn: 'Submit Application',
    submittingBtn: 'Submitting Application...',
    copyAppId: 'Copy Application ID',
    copiedText: 'Copied to clipboard!',
    printBtn: 'Print / Save PDF',
    newFormBtn: 'New Application',

    successRegistered: 'Application Registered Successfully',
    successHeading: 'Admission Application Received!',
    successSubheading: 'Thank you, {fatherName}. The admission application for {childName} has been submitted to {schoolName}.',
    officialAppId: 'Your Official Application ID:',
    appliedForGrade: 'Applied for Grade:',
    nextStepsTitle: 'Next Steps:',
    nextStepsList: [
      '1. School administration will review your application.',
      '2. Upon approval, your student portal login credentials will be sent to your WhatsApp number ({phone}).',
      '3. Please bring student photos, birth certificate copy, and TC on the verification day.'
    ],

    errorFillAll: 'Please fill in all highlighted required fields on this page before proceeding.',
    errorConsent: 'Please accept the data privacy declaration to proceed.',
    errorFirstName: "Student's First Name is required.",
    errorLastName: "Student's Last Name is required.",
    errorDob: 'Please select the Date of Birth.',
    errorClass: 'Please select the class applying for.',
    errorGender: 'Please select Gender.',
    errorFatherName: "Father / Guardian's full name is required.",
    errorFatherPhone: 'Please enter a valid 10-digit mobile number.',
    errorCity: 'City / Town is required.',
    errorState: 'State is required.',
    errorPincode: 'Please enter a valid 6-digit pincode.',
    errorEmergencyName: 'Emergency contact name is required.',
    errorEmergencyPhone: 'Please enter a valid 10-digit emergency contact phone.'
  },

  hinglish: {
    languageLabel: 'Language',
    selectLanguageHeading: 'Form Ki Bhasha Chunein',
    selectLanguageDesc: 'Aap apni suvidhanusar bhasha chun sakte hain. Pura form isi bhasha mein rahega.',
    portalSubtitle: 'Online School Admission Registration Portal',
    schoolPortalUnavailable: 'School Admission Portal Available Nahi Hai',
    tryAgain: 'Dobara Koshish Karein',
    stepOf: 'Step {current} of {total}',
    steps: [
      { title: 'Privacy & Consent', desc: 'Data Privacy Consent' },
      { title: 'Student Details', desc: 'Naam, DOB, Class' },
      { title: 'Parents Details', desc: 'Mata-Pita Ki Jankari' },
      { title: 'Address Details', desc: 'Ghar Ka Pata' },
      { title: 'Previous School', desc: 'Purane School Ka Record' },
      { title: 'Health & Emergency', desc: 'Medical & Contact' },
      { title: 'Review & Submit', desc: 'Check Karein Aur Submit Karein' }
    ],
    dpdpNoticeTitle: 'Data Protection & Privacy Notice (DPDP Act 2023)',
    dpdpNoticeText: 'Aapki aur aapke bachche ki personal details sirf school admission aur academic registration ke liye use ki jayegi. Aadhaar number optional hai aur encrypted format mein safe rakha jaata hai.',
    consentCheckboxText: 'Main confirm karta/karti hu ki main is school mein admission ke liye apni iccha se yeh details provide kar raha/rahi hu. *',
    formQuickTip: '💡 Tip: Form chote steps mein divided hai (sirf 2-3 minute lagenge). Aapka data auto-save ho raha hai.',

    classApplyingFor: 'Kis Class Mein Admission Chahiye *',
    selectClassPlaceholder: '-- Class Select Karein --',
    childFirstName: 'Bachche Ka Pehla Naam (First Name) *',
    childMiddleName: 'Middle Name (Optional)',
    childLastName: 'Surname / Last Name *',
    dob: 'Janam Tithi (Date of Birth) *',
    gender: 'Linga (Gender) *',
    genderOptions: { Male: 'Boy (Male)', Female: 'Girl (Female)', Other: 'Other' },
    category: 'Category (Jaati)',
    categoryOptions: { GEN: 'General', OBC: 'OBC', SC: 'SC', ST: 'ST', EWS: 'EWS' },
    bloodGroup: 'Blood Group',
    religion: 'Dharma (Religion)',
    religionOptions: { Hindu: 'Hindu', Muslim: 'Muslim', Sikh: 'Sikh', Christian: 'Christian', Jain: 'Jain', Buddhist: 'Buddhist', Other: 'Other' },
    aadhaarNumber: 'Student Aadhaar Number',
    aadhaarOptionalHint: '(Optional — Agar Available Ho)',
    aadhaarPrivacyNote: '🔒 DPDP Safe: Encrypted rahega. Sirf aakhiri 4 digits school admin ko dikhenge.',

    fatherSectionTitle: 'Pita Ji Ka Vivaran (Father Details)',
    fatherName: 'Pita Ji Ka Pura Naam *',
    fatherPhone: 'Mobile / WhatsApp Number *',
    fatherPhoneHint: '(Login credentials aur updates isi number par aayenge)',
    fatherOccupation: 'Pita Ji Ka Vyavsay (Occupation)',
    fatherEmail: "Father's Email (Optional)",
    motherSectionTitle: 'Mata Ji Ka Vivaran (Mother Details)',
    motherName: 'Mata Ji Ka Pura Naam',
    motherOccupation: "Mother's Occupation",
    annualFamilyIncome: 'Varshik Parivarik Aay (Annual Income)',
    incomeOptions: [
      { value: 'Below ₹1 Lakh', label: '₹1 Lakh Se Kam' },
      { value: '₹1L - ₹3L', label: '₹1 Lakh - ₹3 Lakh' },
      { value: '₹3L - ₹6L', label: '₹3 Lakh - ₹6 Lakh' },
      { value: '₹6L - ₹12L', label: '₹6 Lakh - ₹12 Lakh' },
      { value: 'Above ₹12 Lakh', label: '₹12 Lakh Se Adhik' }
    ],

    houseNo: 'Makan / Flat No.',
    streetOrVillage: 'Gali / Mohalla / Gaon',
    city: 'Shahar / Town *',
    district: 'Zila (District)',
    state: 'Rajya (State) *',
    pincode: 'Pincode *',

    prevSchoolNote: 'Agar bacha nursery ya KG mein aa raha hai toh yeh step khali chhod sakte hain.',
    prevSchoolName: 'Purane School Ka Naam',
    prevBoard: 'Purana Education Board',
    prevClass: 'Aakhiri Pass Ki Hui Class',
    tcNumber: 'TC Number (Transfer Certificate)',
    lastExamPercent: 'Aakhiri Exam Ka % ya Grade',
    motherTongue: 'Matribhasha (Mother Tongue)',
    reasonForLeaving: 'School Chhodne Ka Karan',

    heightCm: 'Height (cm mein)',
    weightKg: 'Weight (kg mein)',
    chronicIllness: 'Koi Allergy ya Purani Bimari',
    emergencySectionTitle: 'Emergency Contact Details *',
    emergencyName: 'Contact Person Ka Naam *',
    emergencyRelation: 'Sambandh (Relation) *',
    relationOptions: { Father: 'Father (Pita)', Mother: 'Mother (Mata)', Uncle: 'Relative', Guardian: 'Guardian' },
    emergencyPhone: 'Emergency Phone Number *',

    reviewTitle: 'Summary Review (Puri Jankari Check Karein)',
    reviewSubtitle: 'Kripya form submit karne se pehle sari details check kar lein:',
    studentLabel: 'Student:',
    classLabel: 'Admission Class:',
    dobLabel: 'DOB:',
    genderLabel: 'Gender:',
    fatherLabel: 'Father:',
    phoneLabel: 'WhatsApp Number:',
    addressLabel: 'Address:',
    prevSchoolLabel: 'Previous School:',
    documentsNoteTitle: '📄 Admission Ke Din Zaroori Documents:',
    documentsNoteDesc: 'Aapko abhi online documents upload karne ki jarurat nahi hai. Admission confirm hone ke din kripya yeh documents school office layen:',
    documentList: [
      'Student ke 4 Passport Size Photos',
      'Bachche ka Birth Certificate (Nagar Nigam / Hospital)',
      'Transfer Certificate (TC) aur Marksheet (agar purane school se aa rahe hain)',
      'Parents ka ID aur Address Proof (Aadhaar / Voter ID)'
    ],
    submissionNotice: '✅ Submit karte hi aapko ek Application ID milegi aur application school admin approval ke liye jayegi.',

    backBtn: 'Pichhe',
    nextBtn: 'Agla Step',
    submitBtn: 'Application Submit Karein',
    submittingBtn: 'Application Submit Ho Rahi Hai...',
    copyAppId: 'ID Copy Karein',
    copiedText: 'Copy Ho Gayi!',
    printBtn: 'Print / Save PDF',
    newFormBtn: 'Naya Form Bharein',

    successRegistered: 'Application Successfully Registered',
    successHeading: 'Shandar! Application Received',
    successSubheading: 'Dhanyawad, {fatherName} ji. {childName} ke admission ki application successfully {schoolName} mein submit ho gayi hai.',
    officialAppId: 'Aapka Official Application ID:',
    appliedForGrade: 'Applied Class:',
    nextStepsTitle: 'Agle Kadam (Next Steps):',
    nextStepsList: [
      '1. School administration aapki application review karegi.',
      '2. Approval milte hi aapke WhatsApp number ({phone}) par student portal login password & ID bhej diya jayega.',
      '3. Kripya physical verification ke din student photos, birth certificate xerox aur TC saath layen.'
    ],

    errorFillAll: 'Kripya aage badhne se pehle is page par red border wale sabhi zaroori fields bharein.',
    errorConsent: 'Kripya data privacy declaration ko accept karein.',
    errorFirstName: 'Student ka First Name bharna zaroori hai.',
    errorLastName: 'Student ka Last Name (Surname) bharna zaroori hai.',
    errorDob: 'Date of Birth select karein.',
    errorClass: 'Class select karna zaroori hai.',
    errorGender: 'Gender select karein.',
    errorFatherName: 'Pita Ji ka pura naam bharna zaroori hai.',
    errorFatherPhone: 'Kripya 10-digit ka valid mobile number dalein.',
    errorCity: 'City / Town ka naam bharna zaroori hai.',
    errorState: 'State bharna zaroori hai.',
    errorPincode: 'Kripya 6-digit ka valid pincode dalein.',
    errorEmergencyName: 'Emergency contact person ka naam bharna zaroori hai.',
    errorEmergencyPhone: 'Kripya 10-digit ka valid emergency number dalein.'
  }
};

export default function AdmissionForm() {
  const { schoolCode } = useParams();
  const navigate = useNavigate();

  // Language state: 'hi' | 'en' | 'hinglish' (Default to 'hi')
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('eduvault_admission_lang') || 'hi';
  });

  const t = translations[lang] || translations.hi;

  const handleLanguageChange = (newLang) => {
    setLang(newLang);
    localStorage.setItem('eduvault_admission_lang', newLang);
  };

  // School data
  const [school, setSchool] = useState(null);
  const [loadingSchool, setLoadingSchool] = useState(true);
  const [schoolError, setSchoolError] = useState('');

  // Form step: 0 to 6
  const [currentStep, setCurrentStep] = useState(0);

  // Field validation errors object: { [fieldName]: errorMessage }
  const [fieldErrors, setFieldErrors] = useState({});

  // Bot detection invisible honeypot
  const [websiteUrl, setWebsiteUrl] = useState('');

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [copiedAppId, setCopiedAppId] = useState(false);

  // Comprehensive Form State
  const [formData, setFormData] = useState({
    // Step 0: Consent
    privacyConsent: false,

    // Step 1: Student
    targetClass: 'Class 1',
    childFirstName: '',
    childMiddleName: '',
    childLastName: '',
    dateOfBirth: '',
    gender: 'Male',
    category: 'GEN',
    bloodGroup: 'B+',
    religion: 'Hindu',
    motherTongue: 'Hindi',
    nationality: 'Indian',
    placeOfBirth: '',
    aadhaarNumber: '',

    // Step 2: Parents / Guardian
    fatherName: '',
    fatherPhone: '',
    fatherOccupation: '',
    fatherQualification: '',
    fatherEmail: '',
    motherName: '',
    motherPhone: '',
    motherOccupation: '',
    annualFamilyIncome: '₹3L - ₹6L',

    // Step 3: Address
    houseNo: '',
    streetOrVillage: '',
    city: '',
    district: '',
    state: 'Delhi',
    pincode: '',

    // Step 4: Previous School
    previousSchoolName: '',
    previousBoard: 'CBSE',
    previousClassStudied: '',
    previousTcNumber: '',
    previousTcDate: '',
    lastExamPercentage: '',
    reasonForLeaving: '',

    // Step 5: Medical & Emergency
    heightCm: '',
    weightKg: '',
    hasDisability: false,
    disabilityType: '',
    chronicIllness: 'None',
    currentMedication: 'None',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: 'Father'
  });

  // Load school info & draft from localStorage
  useEffect(() => {
    const fetchSchool = async () => {
      try {
        setLoadingSchool(true);
        const res = await axios.get(`${API_BASE}/api/public/school/${schoolCode}`);
        setSchool(res.data);

        // Filter and clean classes
        const validClasses = Array.isArray(res.data.classes)
          ? res.data.classes.filter(c => c && typeof c === 'string' && c.trim().length > 0)
          : [];

        // Auto default target class to first offered class
        if (validClasses.length > 0) {
          setFormData(prev => ({
            ...prev,
            targetClass: prev.targetClass && validClasses.includes(prev.targetClass) ? prev.targetClass : validClasses[0],
            city: prev.city || res.data.city || ''
          }));
        } else {
          setFormData(prev => ({
            ...prev,
            targetClass: prev.targetClass || DEFAULT_CLASSES[3],
            city: prev.city || res.data.city || ''
          }));
        }

        // Restore draft from localStorage if present
        const savedDraft = localStorage.getItem(`eduvault_admission_draft_${schoolCode?.toUpperCase()}`);
        if (savedDraft) {
          try {
            const parsed = JSON.parse(savedDraft);
            setFormData(prev => ({ ...prev, ...parsed }));
          } catch (e) {
            console.warn('Could not parse saved draft:', e);
          }
        }
      } catch (err) {
        console.error('Error fetching school:', err);
        setSchoolError(err.response?.data?.error || 'School not found or admission portal is temporarily inactive.');
      } finally {
        setLoadingSchool(false);
      }
    };

    if (schoolCode) {
      fetchSchool();
    }
  }, [schoolCode]);

  // Autosave draft on change
  useEffect(() => {
    if (schoolCode && !submitSuccess) {
      localStorage.setItem(`eduvault_admission_draft_${schoolCode.toUpperCase()}`, JSON.stringify(formData));
    }
  }, [formData, schoolCode, submitSuccess]);

  // Update field and clear its validation error immediately
  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  // Resolve available classes
  const availableClasses = (school?.classes && school.classes.filter(c => c && typeof c === 'string' && c.trim().length > 0).length > 0)
    ? school.classes.filter(c => c && typeof c === 'string' && c.trim().length > 0)
    : DEFAULT_CLASSES;

  // Validate a specific step
  const validateStep = (step) => {
    const errors = {};

    if (step === 0) {
      if (!formData.privacyConsent) {
        errors.privacyConsent = t.errorConsent;
      }
    } else if (step === 1) {
      if (!formData.targetClass?.trim()) {
        errors.targetClass = t.errorClass;
      }
      if (!formData.childFirstName?.trim()) {
        errors.childFirstName = t.errorFirstName;
      }
      if (!formData.childLastName?.trim()) {
        errors.childLastName = t.errorLastName;
      }
      if (!formData.dateOfBirth) {
        errors.dateOfBirth = t.errorDob;
      }
      if (!formData.gender) {
        errors.gender = t.errorGender;
      }
    } else if (step === 2) {
      if (!formData.fatherName?.trim()) {
        errors.fatherName = t.errorFatherName;
      }
      const cleanPhone = (formData.fatherPhone || '').replace(/\D/g, '');
      if (!cleanPhone) {
        errors.fatherPhone = t.errorFatherPhone;
      } else if (cleanPhone.length !== 10) {
        errors.fatherPhone = t.errorFatherPhone;
      }
    } else if (step === 3) {
      if (!formData.city?.trim()) {
        errors.city = t.errorCity;
      }
      if (!formData.state?.trim()) {
        errors.state = t.errorState;
      }
      const cleanPin = (formData.pincode || '').replace(/\D/g, '');
      if (!cleanPin || cleanPin.length !== 6) {
        errors.pincode = t.errorPincode;
      }
    } else if (step === 5) {
      const effName = formData.emergencyContactName?.trim() || formData.fatherName?.trim();
      const effPhone = (formData.emergencyContactPhone?.trim() || formData.fatherPhone?.trim() || '').replace(/\D/g, '');
      if (!effName) {
        errors.emergencyContactName = t.errorEmergencyName;
      }
      if (!effPhone || effPhone.length !== 10) {
        errors.emergencyContactPhone = t.errorEmergencyPhone;
      }
    }

    return errors;
  };

  // Advance step with immediate validation on current step
  const handleNext = () => {
    setErrorMessage('');
    const errors = validateStep(currentStep);
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      setErrorMessage(t.errorFillAll);
      const firstField = Object.keys(errors)[0];
      const el = document.getElementById(`field-${firstField}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus();
      }
      return;
    }

    // Auto-propagate emergency defaults if moving from step 2
    if (currentStep === 2) {
      setFormData(prev => ({
        ...prev,
        emergencyContactName: prev.emergencyContactName?.trim() ? prev.emergencyContactName : prev.fatherName,
        emergencyContactPhone: prev.emergencyContactPhone?.trim() ? prev.emergencyContactPhone : prev.fatherPhone
      }));
    }

    setCurrentStep(prev => Math.min(prev + 1, t.steps.length - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrev = () => {
    setErrorMessage('');
    setCurrentStep(prev => Math.max(prev - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');

    // Comprehensive check across all steps before submitting
    for (let s = 0; s <= 5; s++) {
      const errs = validateStep(s);
      if (Object.keys(errs).length > 0) {
        setCurrentStep(s);
        setFieldErrors(errs);
        setErrorMessage(t.errorFillAll);
        const firstField = Object.keys(errs)[0];
        const el = document.getElementById(`field-${firstField}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.focus();
        }
        return;
      }
    }

    setSubmitting(true);

    try {
      const payload = {
        websiteUrl: websiteUrl || null, // Honeypot
        privacyConsent: formData.privacyConsent,
        targetClass: formData.targetClass,

        childFirstName: formData.childFirstName.trim(),
        childMiddleName: formData.childMiddleName?.trim() || null,
        childLastName: formData.childLastName.trim(),
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        category: formData.category,
        bloodGroup: formData.bloodGroup,
        religion: formData.religion,
        motherTongue: formData.motherTongue,
        nationality: formData.nationality,
        placeOfBirth: formData.placeOfBirth || null,
        aadhaarNumber: formData.aadhaarNumber?.trim() || null,

        fatherName: formData.fatherName.trim(),
        fatherPhone: formData.fatherPhone.trim(),
        fatherOccupation: formData.fatherOccupation || null,
        fatherQualification: formData.fatherQualification || null,
        fatherEmail: formData.fatherEmail || null,
        motherName: formData.motherName || null,
        motherPhone: formData.motherPhone || null,
        motherOccupation: formData.motherOccupation || null,
        annualFamilyIncome: formData.annualFamilyIncome || null,

        houseNo: formData.houseNo || null,
        streetOrVillage: formData.streetOrVillage || null,
        city: formData.city.trim(),
        district: formData.district || null,
        state: formData.state.trim(),
        pincode: formData.pincode.trim(),

        previousSchoolName: formData.previousSchoolName || null,
        previousBoard: formData.previousBoard || null,
        previousClassStudied: formData.previousClassStudied || null,
        previousTcNumber: formData.previousTcNumber || null,
        previousTcDate: formData.previousTcDate || null,
        lastExamPercentage: formData.lastExamPercentage || null,
        reasonForLeaving: formData.reasonForLeaving || null,

        heightCm: formData.heightCm && !isNaN(formData.heightCm) ? parseFloat(formData.heightCm) : null,
        weightKg: formData.weightKg && !isNaN(formData.weightKg) ? parseFloat(formData.weightKg) : null,
        hasDisability: formData.hasDisability,
        disabilityType: formData.disabilityType || null,
        chronicIllness: formData.chronicIllness || 'None',
        currentMedication: formData.currentMedication || 'None',

        emergencyContactName: formData.emergencyContactName?.trim() || formData.fatherName.trim(),
        emergencyContactPhone: formData.emergencyContactPhone?.trim() || formData.fatherPhone.trim(),
        emergencyContactRelation: formData.emergencyContactRelation || 'Father'
      };

      const res = await axios.post(`${API_BASE}/api/public/admission/${schoolCode}`, payload);

      setSubmitSuccess(res.data);
      // Clear saved draft on success
      localStorage.removeItem(`eduvault_admission_draft_${schoolCode.toUpperCase()}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Submission failed:', err);
      let errStr = '';
      if (err.response?.status === 409) {
        errStr = err.response.data?.message || err.response.data?.error || 'An application with this phone number was already registered recently.';
      } else if (err.response?.status === 429) {
        errStr = 'Too many submissions. Please wait a while before trying again.';
      } else if (err.response?.data?.errors) {
        // Flatten ASP.NET ModelState validation dictionary
        errStr = Object.values(err.response.data.errors).flat().join(' | ');
      } else {
        errStr = err.response?.data?.error || err.response?.data?.message || 'Failed to submit admission application. Please check all fields.';
      }
      setErrorMessage(errStr);
    } finally {
      setSubmitting(false);
    }
  };

  const copyApplicationId = () => {
    if (submitSuccess?.applicationId) {
      navigator.clipboard.writeText(submitSuccess.applicationId);
      setCopiedAppId(true);
      setTimeout(() => setCopiedAppId(false), 2500);
    }
  };

  if (loadingSchool) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-white">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-300">Connecting to school admission portal...</p>
      </div>
    );
  }

  if (schoolError || !school) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 border border-slate-700 max-w-md w-full rounded-2xl p-6 text-center text-white shadow-2xl">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold mb-2">{t.schoolPortalUnavailable}</h2>
          <p className="text-xs text-slate-400 mb-6">{schoolError || 'The requested school portal is not active or the code is invalid.'}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition"
          >
            {t.tryAgain}
          </button>
        </div>
      </div>
    );
  }

  const theme = school.themeColor || '#2563eb';

  // ── SUCCESS VIEW ──
  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Top Language Switcher */}
          <div className="flex justify-end mb-4">
            <div className="inline-flex rounded-xl bg-slate-800/90 p-1 border border-slate-700 text-xs font-semibold">
              <button
                type="button"
                onClick={() => handleLanguageChange('hi')}
                className={`px-2.5 py-1 rounded-lg transition ${lang === 'hi' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                🇮🇳 हिन्दी
              </button>
              <button
                type="button"
                onClick={() => handleLanguageChange('en')}
                className={`px-2.5 py-1 rounded-lg transition ${lang === 'en' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                🇬🇧 English
              </button>
              <button
                type="button"
                onClick={() => handleLanguageChange('hinglish')}
                className={`px-2.5 py-1 rounded-lg transition ${lang === 'hinglish' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                💬 Hinglish
              </button>
            </div>
          </div>

          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="text-center mb-6">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              {t.successRegistered}
            </span>
            <h1 className="text-2xl font-black mt-3 text-white">{t.successHeading}</h1>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              {t.successSubheading
                .replace('{fatherName}', formData.fatherName || 'Parent')
                .replace('{childName}', submitSuccess.childName || `${formData.childFirstName} ${formData.childLastName}`)
                .replace('{schoolName}', school.name)}
            </p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 mb-6 text-center">
            <div className="text-xs text-slate-400 mb-1 font-medium">{t.officialAppId}</div>
            <div className="text-2xl sm:text-3xl font-mono font-black text-emerald-300 tracking-wider flex items-center justify-center gap-2">
              <span>{submitSuccess.applicationId}</span>
              <button
                onClick={copyApplicationId}
                title={t.copyAppId}
                className="p-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-white transition"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            {copiedAppId && <div className="text-[11px] text-emerald-400 font-semibold mt-1">{t.copiedText}</div>}
            <div className="text-[11px] text-slate-400 mt-2">
              {t.appliedForGrade} <span className="font-semibold text-slate-200">{submitSuccess.targetClass || formData.targetClass}</span>
            </div>
          </div>

          <div className="space-y-2 bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-xs text-slate-300 mb-6">
            <div className="font-semibold text-white flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" /> {t.nextStepsTitle}
            </div>
            <div className="text-slate-400 text-[11px] leading-relaxed space-y-1">
              {t.nextStepsList.map((stepText, idx) => (
                <div key={idx}>{stepText.replace('{phone}', formData.fatherPhone || '')}</div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => window.print()}
              className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition"
            >
              <Printer className="w-4 h-4" /> {t.printBtn}
            </button>
            <button
              onClick={() => {
                setSubmitSuccess(null);
                setCurrentStep(0);
                setFieldErrors({});
                setFormData({
                  privacyConsent: false,
                  targetClass: availableClasses[0] || 'Class 1',
                  childFirstName: '',
                  childMiddleName: '',
                  childLastName: '',
                  dateOfBirth: '',
                  gender: 'Male',
                  category: 'GEN',
                  bloodGroup: 'B+',
                  religion: 'Hindu',
                  motherTongue: 'Hindi',
                  nationality: 'Indian',
                  placeOfBirth: '',
                  aadhaarNumber: '',
                  fatherName: '',
                  fatherPhone: '',
                  fatherOccupation: '',
                  fatherQualification: '',
                  fatherEmail: '',
                  motherName: '',
                  motherPhone: '',
                  motherOccupation: '',
                  annualFamilyIncome: '₹3L - ₹6L',
                  houseNo: '',
                  streetOrVillage: '',
                  city: school.city || '',
                  district: '',
                  state: 'Delhi',
                  pincode: '',
                  previousSchoolName: '',
                  previousBoard: 'CBSE',
                  previousClassStudied: '',
                  previousTcNumber: '',
                  previousTcDate: '',
                  lastExamPercentage: '',
                  reasonForLeaving: '',
                  heightCm: '',
                  weightKg: '',
                  hasDisability: false,
                  disabilityType: '',
                  chronicIllness: 'None',
                  currentMedication: 'None',
                  emergencyContactName: '',
                  emergencyContactPhone: '',
                  emergencyContactRelation: 'Father'
                });
              }}
              className="py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition"
            >
              <RefreshCw className="w-4 h-4" /> {t.newFormBtn}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center py-6 px-3 sm:px-6">
      {/* Invisible Honeypot */}
      <div style={{ position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none' }} aria-hidden="true">
        <input
          type="text"
          name="website_url"
          tabIndex={-1}
          autoComplete="off"
          value={websiteUrl}
          onChange={e => setWebsiteUrl(e.target.value)}
        />
      </div>

      {/* Header with School Branding */}
      <div className="max-w-xl w-full mb-4 text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300 text-xs font-semibold mb-2">
          <GraduationCap className="w-4 h-4 text-blue-400" />
          <span>{t.portalSubtitle}</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{school.name}</h1>
        <p className="text-xs text-slate-400 mt-1">{school.address ? `${school.address}, ${school.city}` : school.city}</p>
      </div>

      {/* Form Container */}
      <div className="max-w-xl w-full bg-slate-900 border border-slate-800/80 rounded-3xl shadow-2xl p-5 sm:p-7 relative backdrop-blur-xl">
        
        {/* Top 3-Language Selector */}
        <div className="flex items-center justify-between gap-2 pb-4 mb-5 border-b border-slate-800">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
            <Languages className="w-4 h-4 text-blue-400" />
            <span>{t.languageLabel}:</span>
          </div>

          <div className="inline-flex rounded-xl bg-slate-800/90 p-1 border border-slate-700/80 shadow-inner">
            <button
              type="button"
              onClick={() => handleLanguageChange('hi')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                lang === 'hi'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🇮🇳 हिन्दी
            </button>
            <button
              type="button"
              onClick={() => handleLanguageChange('en')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                lang === 'en'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🇬🇧 English
            </button>
            <button
              type="button"
              onClick={() => handleLanguageChange('hinglish')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                lang === 'hinglish'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              💬 Hinglish
            </button>
          </div>
        </div>

        {/* Progress Stepper */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-2">
            <span>
              {t.stepOf.replace('{current}', currentStep + 1).replace('{total}', t.steps.length)}
            </span>
            <span className="text-blue-400 font-bold">{t.steps[currentStep].title}</span>
          </div>

          {/* Progress Bar */}
          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300 rounded-full"
              style={{ width: `${((currentStep + 1) / t.steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-950/70 border border-red-800 text-red-200 text-xs flex items-center gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="leading-relaxed font-medium">{errorMessage}</span>
          </div>
        )}

        {/* ── STEP 0: PRIVACY & DPDP CONSENT ── */}
        {currentStep === 0 && (
          <div className="space-y-4 animate-in fade-in">
            {/* Language Selection Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/40 to-indigo-950/40 border border-blue-800/40 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
                  <Languages className="w-4 h-4 text-blue-400" />
                  {t.selectLanguageHeading}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {t.selectLanguageDesc}
                </div>
              </div>

              <div className="flex gap-1.5">
                {['hi', 'en', 'hinglish'].map(l => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => handleLanguageChange(l)}
                    className={`py-1.5 px-3 rounded-xl text-xs font-bold border transition ${
                      lang === l
                        ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {l === 'hi' ? 'हिन्दी' : l === 'en' ? 'English' : 'Hinglish'}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-blue-950/30 border border-blue-900/60 text-blue-200 text-xs space-y-2">
              <div className="font-bold flex items-center gap-1.5 text-blue-300 text-sm">
                <ShieldCheck className="w-4 h-4" /> {t.dpdpNoticeTitle}
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                {t.dpdpNoticeText}
              </p>
            </div>

            <div className={`p-4 rounded-2xl bg-slate-800/50 border transition ${
              fieldErrors.privacyConsent ? 'border-red-500 bg-red-950/20 ring-1 ring-red-500' : 'border-slate-700/60'
            }`}>
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  id="field-privacyConsent"
                  type="checkbox"
                  checked={formData.privacyConsent}
                  onChange={e => updateField('privacyConsent', e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded text-blue-600 focus:ring-blue-500 border-slate-700 bg-slate-900"
                />
                <span className="text-xs text-slate-200 font-medium leading-relaxed">
                  {t.consentCheckboxText}
                </span>
              </label>
              {fieldErrors.privacyConsent && (
                <p className="text-[11px] text-red-400 mt-2 flex items-center gap-1 font-semibold">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  {fieldErrors.privacyConsent}
                </p>
              )}
            </div>

            <div className="p-3 bg-slate-950/40 rounded-xl text-[11px] text-slate-400">
              {t.formQuickTip}
            </div>
          </div>
        )}

        {/* ── STEP 1: STUDENT INFORMATION ── */}
        {currentStep === 1 && (
          <div className="space-y-4 animate-in fade-in">
            {/* Target Class Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {t.classApplyingFor}
              </label>
              <select
                id="field-targetClass"
                value={formData.targetClass}
                onChange={e => updateField('targetClass', e.target.value)}
                className={`w-full bg-slate-800 border rounded-xl p-2.5 text-xs text-white focus:outline-none font-semibold transition ${
                  fieldErrors.targetClass ? 'border-red-500 ring-1 ring-red-500 bg-red-950/20' : 'border-slate-700 focus:border-blue-500'
                }`}
              >
                <option value="">{t.selectClassPlaceholder}</option>
                {availableClasses.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              {fieldErrors.targetClass && (
                <p className="text-[11px] text-red-400 mt-1 flex items-center gap-1 font-semibold">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  {fieldErrors.targetClass}
                </p>
              )}
            </div>

            {/* Name Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {t.childFirstName}
                </label>
                <input
                  id="field-childFirstName"
                  type="text"
                  placeholder="e.g. Rahul"
                  value={formData.childFirstName}
                  onChange={e => updateField('childFirstName', e.target.value)}
                  className={`w-full bg-slate-800 border rounded-xl p-2.5 text-xs text-white focus:outline-none transition ${
                    fieldErrors.childFirstName ? 'border-red-500 ring-1 ring-red-500 bg-red-950/20' : 'border-slate-700 focus:border-blue-500'
                  }`}
                  required
                />
                {fieldErrors.childFirstName && (
                  <p className="text-[11px] text-red-400 mt-1 flex items-center gap-1 font-semibold">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    {fieldErrors.childFirstName}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {t.childMiddleName}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Kumar"
                  value={formData.childMiddleName}
                  onChange={e => updateField('childMiddleName', e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {t.childLastName}
                </label>
                <input
                  id="field-childLastName"
                  type="text"
                  placeholder="e.g. Sharma"
                  value={formData.childLastName}
                  onChange={e => updateField('childLastName', e.target.value)}
                  className={`w-full bg-slate-800 border rounded-xl p-2.5 text-xs text-white focus:outline-none transition ${
                    fieldErrors.childLastName ? 'border-red-500 ring-1 ring-red-500 bg-red-950/20' : 'border-slate-700 focus:border-blue-500'
                  }`}
                  required
                />
                {fieldErrors.childLastName && (
                  <p className="text-[11px] text-red-400 mt-1 flex items-center gap-1 font-semibold">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    {fieldErrors.childLastName}
                  </p>
                )}
              </div>
            </div>

            {/* DOB & Gender */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {t.dob}
                </label>
                <input
                  id="field-dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={e => updateField('dateOfBirth', e.target.value)}
                  className={`w-full bg-slate-800 border rounded-xl p-2.5 text-xs text-white focus:outline-none transition ${
                    fieldErrors.dateOfBirth ? 'border-red-500 ring-1 ring-red-500 bg-red-950/20' : 'border-slate-700 focus:border-blue-500'
                  }`}
                  required
                />
                {fieldErrors.dateOfBirth && (
                  <p className="text-[11px] text-red-400 mt-1 flex items-center gap-1 font-semibold">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    {fieldErrors.dateOfBirth}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {t.gender}
                </label>
                <div className="flex gap-2">
                  {['Male', 'Female', 'Other'].map(g => (
                    <button
                      type="button"
                      key={g}
                      onClick={() => updateField('gender', g)}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition ${
                        formData.gender === g
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                      }`}
                    >
                      {t.genderOptions[g] || g}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Category, Blood Group & Religion */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">{t.category}</label>
                <select
                  value={formData.category}
                  onChange={e => updateField('category', e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="GEN">{t.categoryOptions.GEN}</option>
                  <option value="OBC">{t.categoryOptions.OBC}</option>
                  <option value="SC">{t.categoryOptions.SC}</option>
                  <option value="ST">{t.categoryOptions.ST}</option>
                  <option value="EWS">{t.categoryOptions.EWS}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">{t.bloodGroup}</label>
                <select
                  value={formData.bloodGroup}
                  onChange={e => updateField('bloodGroup', e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(b => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-semibold text-slate-300 mb-1">{t.religion}</label>
                <select
                  value={formData.religion}
                  onChange={e => updateField('religion', e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Hindu">{t.religionOptions.Hindu}</option>
                  <option value="Muslim">{t.religionOptions.Muslim}</option>
                  <option value="Sikh">{t.religionOptions.Sikh}</option>
                  <option value="Christian">{t.religionOptions.Christian}</option>
                  <option value="Jain">{t.religionOptions.Jain}</option>
                  <option value="Buddhist">{t.religionOptions.Buddhist}</option>
                  <option value="Other">{t.religionOptions.Other}</option>
                </select>
              </div>
            </div>

            {/* Aadhaar */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {t.aadhaarNumber} <span className="text-slate-400 font-normal">{t.aadhaarOptionalHint}</span>
              </label>
              <input
                type="text"
                placeholder="12-digit Aadhaar (e.g. 1234 5678 9012)"
                value={formData.aadhaarNumber}
                onChange={e => updateField('aadhaarNumber', e.target.value)}
                maxLength={14}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                {t.aadhaarPrivacyNote}
              </p>
            </div>
          </div>
        )}

        {/* ── STEP 2: PARENTS DETAILS ── */}
        {currentStep === 2 && (
          <div className="space-y-4 animate-in fade-in">
            <div className="text-xs font-bold text-blue-400 uppercase tracking-wide flex items-center gap-1.5">
              <User className="w-4 h-4" /> {t.fatherSectionTitle}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">{t.fatherName}</label>
                <input
                  id="field-fatherName"
                  type="text"
                  placeholder="e.g. Ramesh Sharma"
                  value={formData.fatherName}
                  onChange={e => updateField('fatherName', e.target.value)}
                  className={`w-full bg-slate-800 border rounded-xl p-2.5 text-xs text-white focus:outline-none transition ${
                    fieldErrors.fatherName ? 'border-red-500 ring-1 ring-red-500 bg-red-950/20' : 'border-slate-700 focus:border-blue-500'
                  }`}
                  required
                />
                {fieldErrors.fatherName && (
                  <p className="text-[11px] text-red-400 mt-1 flex items-center gap-1 font-semibold">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    {fieldErrors.fatherName}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {t.fatherPhone}
                </label>
                <input
                  id="field-fatherPhone"
                  type="tel"
                  placeholder="10-digit mobile (e.g. 9876543210)"
                  value={formData.fatherPhone}
                  onChange={e => updateField('fatherPhone', e.target.value)}
                  maxLength={10}
                  className={`w-full bg-slate-800 border rounded-xl p-2.5 text-xs text-white focus:outline-none transition ${
                    fieldErrors.fatherPhone ? 'border-red-500 ring-1 ring-red-500 bg-red-950/20' : 'border-slate-700 focus:border-blue-500'
                  }`}
                  required
                />
                {fieldErrors.fatherPhone && (
                  <p className="text-[11px] text-red-400 mt-1 flex items-center gap-1 font-semibold">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    {fieldErrors.fatherPhone}
                  </p>
                )}
                <p className="text-[10px] text-blue-400 mt-1">{t.fatherPhoneHint}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">{t.fatherOccupation}</label>
                <input
                  type="text"
                  placeholder="e.g. Business / Service / Teacher"
                  value={formData.fatherOccupation}
                  onChange={e => updateField('fatherOccupation', e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">{t.fatherEmail}</label>
                <input
                  type="email"
                  placeholder="e.g. ramesh@gmail.com"
                  value={formData.fatherEmail}
                  onChange={e => updateField('fatherEmail', e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="border-t border-slate-800 pt-3">
              <div className="text-xs font-bold text-indigo-400 uppercase tracking-wide flex items-center gap-1.5 mb-3">
                <Users className="w-4 h-4" /> {t.motherSectionTitle}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">{t.motherName}</label>
                  <input
                    type="text"
                    placeholder="e.g. Sunita Sharma"
                    value={formData.motherName}
                    onChange={e => updateField('motherName', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">{t.motherOccupation}</label>
                  <input
                    type="text"
                    placeholder="e.g. Homemaker / Service"
                    value={formData.motherOccupation}
                    onChange={e => updateField('motherOccupation', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">{t.annualFamilyIncome}</label>
              <select
                value={formData.annualFamilyIncome}
                onChange={e => updateField('annualFamilyIncome', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                {t.incomeOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* ── STEP 3: ADDRESS DETAILS ── */}
        {currentStep === 3 && (
          <div className="space-y-4 animate-in fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">{t.houseNo}</label>
                <input
                  type="text"
                  placeholder="e.g. House No. 42, Block B"
                  value={formData.houseNo}
                  onChange={e => updateField('houseNo', e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">{t.streetOrVillage}</label>
                <input
                  type="text"
                  placeholder="e.g. Gandhi Nagar / Sector 14"
                  value={formData.streetOrVillage}
                  onChange={e => updateField('streetOrVillage', e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">{t.city}</label>
                <input
                  id="field-city"
                  type="text"
                  placeholder="e.g. Delhi / Jaipur"
                  value={formData.city}
                  onChange={e => updateField('city', e.target.value)}
                  className={`w-full bg-slate-800 border rounded-xl p-2.5 text-xs text-white focus:outline-none transition ${
                    fieldErrors.city ? 'border-red-500 ring-1 ring-red-500 bg-red-950/20' : 'border-slate-700 focus:border-blue-500'
                  }`}
                  required
                />
                {fieldErrors.city && (
                  <p className="text-[11px] text-red-400 mt-1 flex items-center gap-1 font-semibold">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    {fieldErrors.city}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">{t.district}</label>
                <input
                  type="text"
                  placeholder="e.g. South Delhi"
                  value={formData.district}
                  onChange={e => updateField('district', e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">{t.state}</label>
                <input
                  id="field-state"
                  type="text"
                  placeholder="e.g. Delhi / Uttar Pradesh / Rajasthan"
                  value={formData.state}
                  onChange={e => updateField('state', e.target.value)}
                  className={`w-full bg-slate-800 border rounded-xl p-2.5 text-xs text-white focus:outline-none transition ${
                    fieldErrors.state ? 'border-red-500 ring-1 ring-red-500 bg-red-950/20' : 'border-slate-700 focus:border-blue-500'
                  }`}
                  required
                />
                {fieldErrors.state && (
                  <p className="text-[11px] text-red-400 mt-1 flex items-center gap-1 font-semibold">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    {fieldErrors.state}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">{t.pincode}</label>
                <input
                  id="field-pincode"
                  type="text"
                  placeholder="6-digit PIN (e.g. 110001)"
                  value={formData.pincode}
                  onChange={e => updateField('pincode', e.target.value)}
                  maxLength={6}
                  className={`w-full bg-slate-800 border rounded-xl p-2.5 text-xs text-white focus:outline-none transition ${
                    fieldErrors.pincode ? 'border-red-500 ring-1 ring-red-500 bg-red-950/20' : 'border-slate-700 focus:border-blue-500'
                  }`}
                  required
                />
                {fieldErrors.pincode && (
                  <p className="text-[11px] text-red-400 mt-1 flex items-center gap-1 font-semibold">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    {fieldErrors.pincode}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 4: PREVIOUS SCHOOL RECORD ── */}
        {currentStep === 4 && (
          <div className="space-y-4 animate-in fade-in">
            <p className="text-xs text-slate-400">{t.prevSchoolNote}</p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">{t.prevSchoolName}</label>
              <input
                type="text"
                placeholder="e.g. Kendriya Vidyalaya / St. Mary School"
                value={formData.previousSchoolName}
                onChange={e => updateField('previousSchoolName', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">{t.prevBoard}</label>
                <select
                  value={formData.previousBoard}
                  onChange={e => updateField('previousBoard', e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="CBSE">CBSE</option>
                  <option value="ICSE">ICSE</option>
                  <option value="State Board">State Board</option>
                  <option value="IB / Cambridge">IB / Cambridge</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">{t.prevClass}</label>
                <input
                  type="text"
                  placeholder="e.g. Class 5"
                  value={formData.previousClassStudied}
                  onChange={e => updateField('previousClassStudied', e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">{t.tcNumber}</label>
                <input
                  type="text"
                  placeholder="e.g. TC-2025-081"
                  value={formData.previousTcNumber}
                  onChange={e => updateField('previousTcNumber', e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">{t.lastExamPercent}</label>
                <input
                  type="text"
                  placeholder="e.g. 84% or A+"
                  value={formData.lastExamPercentage}
                  onChange={e => updateField('lastExamPercentage', e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">{t.motherTongue}</label>
                <input
                  type="text"
                  placeholder="e.g. Hindi / Punjabi"
                  value={formData.motherTongue}
                  onChange={e => updateField('motherTongue', e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">{t.reasonForLeaving}</label>
                <input
                  type="text"
                  placeholder="e.g. Relocation / Better Education"
                  value={formData.reasonForLeaving}
                  onChange={e => updateField('reasonForLeaving', e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 5: MEDICAL & EMERGENCY ── */}
        {currentStep === 5 && (
          <div className="space-y-4 animate-in fade-in">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">{t.heightCm}</label>
                <input
                  type="number"
                  placeholder="e.g. 135"
                  value={formData.heightCm}
                  onChange={e => updateField('heightCm', e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">{t.weightKg}</label>
                <input
                  type="number"
                  placeholder="e.g. 32"
                  value={formData.weightKg}
                  onChange={e => updateField('weightKg', e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">{t.chronicIllness}</label>
              <input
                type="text"
                placeholder="e.g. Dust allergy, Asthma, or 'None'"
                value={formData.chronicIllness}
                onChange={e => updateField('chronicIllness', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="border-t border-slate-800 pt-3">
              <div className="text-xs font-bold text-amber-400 uppercase tracking-wide flex items-center gap-1.5 mb-2">
                <HeartPulse className="w-4 h-4" /> {t.emergencySectionTitle}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">{t.emergencyName}</label>
                  <input
                    id="field-emergencyContactName"
                    type="text"
                    placeholder="e.g. Ramesh Sharma"
                    value={formData.emergencyContactName || formData.fatherName}
                    onChange={e => updateField('emergencyContactName', e.target.value)}
                    className={`w-full bg-slate-800 border rounded-xl p-2.5 text-xs text-white focus:outline-none transition ${
                      fieldErrors.emergencyContactName ? 'border-red-500 ring-1 ring-red-500 bg-red-950/20' : 'border-slate-700 focus:border-blue-500'
                    }`}
                    required
                  />
                  {fieldErrors.emergencyContactName && (
                    <p className="text-[11px] text-red-400 mt-1 flex items-center gap-1 font-semibold">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      {fieldErrors.emergencyContactName}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">{t.emergencyRelation}</label>
                  <select
                    value={formData.emergencyContactRelation}
                    onChange={e => updateField('emergencyContactRelation', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="Father">{t.relationOptions.Father}</option>
                    <option value="Mother">{t.relationOptions.Mother}</option>
                    <option value="Uncle">{t.relationOptions.Uncle}</option>
                    <option value="Guardian">{t.relationOptions.Guardian}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">{t.emergencyPhone}</label>
                  <input
                    id="field-emergencyContactPhone"
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={formData.emergencyContactPhone || formData.fatherPhone}
                    onChange={e => updateField('emergencyContactPhone', e.target.value)}
                    maxLength={10}
                    className={`w-full bg-slate-800 border rounded-xl p-2.5 text-xs text-white focus:outline-none transition ${
                      fieldErrors.emergencyContactPhone ? 'border-red-500 ring-1 ring-red-500 bg-red-950/20' : 'border-slate-700 focus:border-blue-500'
                    }`}
                    required
                  />
                  {fieldErrors.emergencyContactPhone && (
                    <p className="text-[11px] text-red-400 mt-1 flex items-center gap-1 font-semibold">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      {fieldErrors.emergencyContactPhone}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 6: CONFIRM & SUBMIT ── */}
        {currentStep === 6 && (
          <div className="space-y-4 animate-in fade-in text-xs">
            <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-3">
              <div className="font-bold text-white text-sm border-b border-slate-700 pb-2">
                {t.reviewTitle}
              </div>
              <p className="text-[11px] text-slate-400">{t.reviewSubtitle}</p>

              <div className="grid grid-cols-2 gap-2 text-slate-300">
                <div>
                  <span className="text-slate-500">{t.studentLabel}</span>{' '}
                  <strong className="text-white">
                    {formData.childFirstName} {formData.childLastName}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500">{t.classLabel}</span>{' '}
                  <strong className="text-blue-400">{formData.targetClass}</strong>
                </div>
                <div>
                  <span className="text-slate-500">{t.dobLabel}</span> <strong className="text-white">{formData.dateOfBirth}</strong>
                </div>
                <div>
                  <span className="text-slate-500">{t.genderLabel}</span>{' '}
                  <strong className="text-white">{t.genderOptions[formData.gender] || formData.gender}</strong>
                </div>
                <div>
                  <span className="text-slate-500">{t.fatherLabel}</span>{' '}
                  <strong className="text-white">{formData.fatherName}</strong>
                </div>
                <div>
                  <span className="text-slate-500">{t.phoneLabel}</span>{' '}
                  <strong className="text-emerald-400">{formData.fatherPhone}</strong>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500">{t.addressLabel}</span>{' '}
                  <strong className="text-white">
                    {formData.houseNo ? `${formData.houseNo}, ` : ''}
                    {formData.streetOrVillage ? `${formData.streetOrVillage}, ` : ''}
                    {formData.city}, {formData.state} - {formData.pincode}
                  </strong>
                </div>
                {formData.previousSchoolName && (
                  <div className="col-span-2">
                    <span className="text-slate-500">{t.prevSchoolLabel}</span>{' '}
                    <strong className="text-white">
                      {formData.previousSchoolName} ({formData.previousClassStudied || 'N/A'})
                    </strong>
                  </div>
                )}
              </div>
            </div>

            {/* Documents Guidance Note */}
            <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-900/60 text-amber-200 space-y-1.5">
              <div className="font-bold flex items-center gap-1.5 text-xs">
                {t.documentsNoteTitle}
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                {t.documentsNoteDesc}
              </p>
              <ul className="text-[11px] text-slate-300 space-y-0.5 list-disc list-inside">
                {t.documentList.map((doc, idx) => (
                  <li key={idx}>{doc}</li>
                ))}
              </ul>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/50 text-[11px] text-slate-400 leading-relaxed">
              {t.submissionNotice}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-7 pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
          {currentStep > 0 ? (
            <button
              type="button"
              onClick={handlePrev}
              disabled={submitting}
              className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center gap-1.5 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> {t.backBtn}
            </button>
          ) : (
            <div />
          )}

          {currentStep < t.steps.length - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              className="py-2.5 px-5 rounded-xl font-bold text-xs flex items-center gap-1.5 text-white transition shadow-lg shadow-blue-500/20 hover:brightness-110"
              style={{ backgroundColor: theme }}
            >
              {t.nextBtn} <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="py-3 px-6 rounded-xl font-black text-xs flex items-center gap-2 text-white bg-emerald-600 hover:bg-emerald-500 transition shadow-lg shadow-emerald-600/30 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t.submittingBtn}
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" /> {t.submitBtn}
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 text-center text-[11px] text-slate-500">
        Powered by <span className="font-semibold text-slate-400">EduVault OS</span> • Secure Multi-Tenant School Infrastructure
      </div>
    </div>
  );
}
