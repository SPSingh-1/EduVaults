import { useState, useEffect, useMemo } from 'react';
import Topbar from '../../components/layout/Topbar';
import { apiClient } from '../../api/apiClient';
import { formatGrade, formatSection, sortClasses } from '../../utils/classUtils';

import InfrastructureTab from './setup/InfrastructureTab';
import TimetableTab from './setup/TimetableTab';
import SubstitutionsTab from './setup/SubstitutionsTab';
import FeeRulesTab from './setup/FeeRulesTab';
import ClassSubjectsTab from './setup/ClassSubjectsTab';
import PromotionSetupTab from './setup/PromotionSetupTab';
import PasswordRulesTab from './setup/PasswordRulesTab';
import BillingTab from './setup/BillingTab';

const Setup = () => {
  const [activeTab, setActiveTab] = useState('infrastructure');
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [activeAlertsCount, setActiveAlertsCount] = useState(0);

  const fetchSharedMeta = async () => {
    try {
      const [clsRes, teachRes, subjRes, deptRes, alertRes] = await Promise.all([
        apiClient.get('/academics/classes').catch(() => ({ data: [] })),
        apiClient.get('/academics/teachers').catch(() => ({ data: [] })),
        apiClient.get('/academics/subjects').catch(() => ({ data: [] })),
        apiClient.get('/academics/departments').catch(() => ({ data: [] })),
        apiClient.get('/academics/timetable/remarks').catch(() => ({ data: [] }))
      ]);

      setClasses(sortClasses(clsRes.data || []));
      setTeachers(teachRes.data || []);
      setSubjects(subjRes.data || []);
      setDepartments(deptRes.data || []);
      setActiveAlertsCount((alertRes.data || []).length);
    } catch (err) {
      console.error('Error fetching setup meta:', err);
    }
  };

  useEffect(() => {
    fetchSharedMeta();
  }, [activeTab]);

  // Group classes by unique Grade tier so single class appears only once
  const uniqueGradeClasses = useMemo(() => {
    const map = new Map();
    classes.forEach(c => {
      const gradeKey = formatGrade(c.grade);
      const cleanSec = formatSection(c.section);
      if (!map.has(gradeKey)) {
        map.set(gradeKey, {
          grade: c.grade,
          formattedGrade: gradeKey,
          sections: cleanSec ? [cleanSec] : [],
          classIds: [c.id],
          primaryClassId: c.id,
          classes: [c]
        });
      } else {
        const existing = map.get(gradeKey);
        if (cleanSec && !existing.sections.includes(cleanSec)) {
          existing.sections.push(cleanSec);
        }
        if (!existing.classIds.includes(c.id)) {
          existing.classIds.push(c.id);
        }
      }
    });

    const tierOrder = {
      'play group': 1,
      'nursery': 2,
      'lkg': 3,
      'ukg': 4,
      'kg': 5
    };

    return Array.from(map.values()).sort((a, b) => {
      const aLower = a.formattedGrade.toLowerCase();
      const bLower = b.formattedGrade.toLowerCase();

      const aTier = Object.keys(tierOrder).find(k => aLower.includes(k));
      const bTier = Object.keys(tierOrder).find(k => bLower.includes(k));

      if (aTier && bTier) return tierOrder[aTier] - tierOrder[bTier];
      if (aTier) return -1;
      if (bTier) return 1;

      const aNum = parseInt(a.formattedGrade.replace(/\D/g, ''), 10);
      const bNum = parseInt(b.formattedGrade.replace(/\D/g, ''), 10);
      if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;

      return a.formattedGrade.localeCompare(b.formattedGrade);
    });
  }, [classes]);

  const tabs = [
    { id: 'infrastructure', label: 'Infrastructure Setup', icon: '📂' },
    { id: 'timetable', label: 'Weekly Timetable Config', icon: '📅' },
    { id: 'substitutions', label: 'Substitution & Cover Alerts', icon: '👩‍🏫', badge: activeAlertsCount },
    { id: 'fees', label: 'Fee Rules Setup', icon: '💰' },
    { id: 'class-subjects', label: 'Class Subjects Mapping', icon: '📚' },
    { id: 'promotion-setup', label: 'Student Promotion Setup', icon: '🚀' },
    { id: 'password-rules', label: 'Password Rules Setup', icon: '🔐' },
    { id: 'billing', label: 'Billing & Subscription', icon: '💳' }
  ];

  return (
    <div>
      <Topbar title="Academic Setup & Configurations" subtitle="Dashboard › Academics › Setup" />

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-100 mt-4 px-6 overflow-x-auto whitespace-nowrap scrollbar-none gap-6">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 pb-3.5 text-xs font-bold transition-all relative border-b-2 cursor-pointer ${
                isActive
                  ? 'text-primary border-primary'
                  : 'text-gray-400 border-transparent hover:text-gray-700'
              }`}
            >
              <span className="text-sm">{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.badge > 0 && (
                <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-rose-500 text-white ml-0.5">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="p-6 space-y-6">
        {activeTab === 'infrastructure' && <InfrastructureTab />}
        {activeTab === 'timetable' && (
          <TimetableTab
            classes={classes}
            subjects={subjects}
            teachers={teachers}
            departments={departments}
            uniqueGradeClasses={uniqueGradeClasses}
          />
        )}
        {activeTab === 'substitutions' && (
          <SubstitutionsTab
            classes={classes}
            subjects={subjects}
            teachers={teachers}
          />
        )}
        {activeTab === 'fees' && (
          <FeeRulesTab
            classes={classes}
            uniqueGradeClasses={uniqueGradeClasses}
          />
        )}
        {activeTab === 'class-subjects' && (
          <ClassSubjectsTab
            classes={classes}
            subjects={subjects}
            teachers={teachers}
            uniqueGradeClasses={uniqueGradeClasses}
          />
        )}
        {activeTab === 'promotion-setup' && <PromotionSetupTab />}
        {activeTab === 'password-rules' && <PasswordRulesTab />}
        {activeTab === 'billing' && <BillingTab />}
      </div>
    </div>
  );
};

export default Setup;
