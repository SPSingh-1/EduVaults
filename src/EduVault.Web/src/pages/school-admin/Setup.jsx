import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import Topbar from '../../components/layout/Topbar';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import { apiClient } from '../../api/apiClient';
import { formatGrade, formatSection, sortClasses } from '../../utils/classUtils';
import { ensureArray } from '../../utils/arrayUtils';

import InfrastructureTab from './setup/InfrastructureTab';
import TimetableTab from './setup/TimetableTab';
import SubstitutionsTab from './setup/SubstitutionsTab';
import FeeRulesTab from './setup/FeeRulesTab';
import ClassSubjectsTab from './setup/ClassSubjectsTab';
import PromotionSetupTab from './setup/PromotionSetupTab';
import PasswordRulesTab from './setup/PasswordRulesTab';
import BillingTab from './setup/BillingTab';

const VALID_TABS = [
  'infrastructure',
  'timetable',
  'substitutions',
  'fees',
  'class-subjects',
  'promotion-setup',
  'password-rules',
  'billing'
];

const Setup = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get('tab');
  const initialTab = VALID_TABS.includes(urlTab) ? urlTab : 'infrastructure';

  const [activeTab, setActiveTab] = useState(initialTab);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [activeAlertsCount, setActiveAlertsCount] = useState(0);

  // Sync tab with URL if changed externally
  useEffect(() => {
    if (urlTab && VALID_TABS.includes(urlTab) && urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [urlTab]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId }, { replace: true });
  };

  const fetchSharedMeta = async () => {
    try {
      const [clsRes, teachRes, subjRes, deptRes, alertRes, periodsRes] = await Promise.all([
        apiClient.get('/academics/classes').catch(() => ({ data: [] })),
        apiClient.get('/academics/teachers').catch(() => ({ data: [] })),
        apiClient.get('/academics/subjects').catch(() => ({ data: [] })),
        apiClient.get('/academics/departments').catch(() => ({ data: [] })),
        apiClient.get('/academics/timetable/remarks').catch(() => ({ data: [] })),
        apiClient.get('/academics/timetable/periods').catch(() => ({ data: [] }))
      ]);

      setClasses(sortClasses(ensureArray(clsRes.data)));
      setTeachers(ensureArray(teachRes.data));
      setSubjects(ensureArray(subjRes.data));
      setDepartments(ensureArray(deptRes.data));
      setActiveAlertsCount(ensureArray(alertRes.data).length);
      setPeriods(ensureArray(periodsRes.data));
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
      if (!c) return;
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
      const aLower = (a?.formattedGrade || '').toLowerCase();
      const bLower = (b?.formattedGrade || '').toLowerCase();

      const aTier = Object.keys(tierOrder).find(k => aLower.includes(k));
      const bTier = Object.keys(tierOrder).find(k => bLower.includes(k));

      if (aTier && bTier) return tierOrder[aTier] - tierOrder[bTier];
      if (aTier) return -1;
      if (bTier) return 1;

      const aNum = parseInt((a?.formattedGrade || '').replace(/\D/g, ''), 10);
      const bNum = parseInt((b?.formattedGrade || '').replace(/\D/g, ''), 10);
      if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;

      return (a?.formattedGrade || '').localeCompare(b?.formattedGrade || '');
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
              onClick={() => handleTabChange(tab.id)}
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
        <ErrorBoundary key={activeTab}>
          {activeTab === 'infrastructure' && <InfrastructureTab />}
          {activeTab === 'timetable' && (
            <TimetableTab
              classes={classes}
              subjects={subjects}
              teachers={teachers}
              departments={departments}
              periods={periods}
              uniqueGradeClasses={uniqueGradeClasses}
              onNavigateToTab={handleTabChange}
            />
          )}
          {activeTab === 'substitutions' && (
            <SubstitutionsTab
              classes={classes}
              subjects={subjects}
              teachers={teachers}
              periods={periods}
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
        </ErrorBoundary>
      </div>
    </div>
  );
};

export default Setup;
