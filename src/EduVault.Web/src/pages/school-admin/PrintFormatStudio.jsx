import { useState, useEffect } from 'react';
import Topbar from '../../components/layout/Topbar';
import { apiClient } from '../../api/apiClient';
import Loader from '../../components/common/Loader';
import PrintIframe from '../../components/print/PrintIframe';
import { 
  Printer, Sparkles, Layers, Sliders, CheckCircle2, 
  AlertTriangle, RefreshCw, Plus, Trash2, Eye, Star, 
  FileText, Copy, Code, Play, ArrowRight, Upload,
  UploadCloud, Image as ImageIcon, X
} from 'lucide-react';

const DOCUMENT_TYPES = [
  { id: 'FeeReceipt', label: 'Fee Receipt / Cash Memo', icon: '💰' },
  { id: 'ReportCard', label: 'Student Report Card / Marksheet', icon: '📊' },
  { id: 'SalarySlip', label: 'Employee Salary Payslip', icon: '💵' },
  { id: 'AdmitCard', label: 'Exam Admit Card / Hall Ticket', icon: '🎫' },
  { id: 'GatePass', label: 'Gate Pass / Visitor Token', icon: '🚪' },
  { id: 'TransferCertificate', label: 'Transfer Certificate (TC)', icon: '📜' }
];

const PAPER_SIZES = [
  { id: 'Thermal80mm', label: '80mm POS Thermal Slip', desc: 'Fast, inkless paper roll for counter billing' },
  { id: 'A4Single', label: 'A4 Single Sheet', desc: 'Full-page professional letterhead standard' },
  { id: 'A4TwinCopy', label: 'A4 Twin-Copy (Cut in Half)', desc: '2 identical copies on 1 page with cut line' },
  { id: 'A5Portrait', label: 'A5 Compact Portrait', desc: 'Cost-saving half-A4 booklet size' },
  { id: 'CR80ID', label: 'CR80 PVC Plastic Card', desc: 'Standard credit-card sized student/staff ID' }
];

const MERGE_TAGS = [
  { tag: '{{school.name}}', desc: 'School Official Name' },
  { tag: '{{school.address}}', desc: 'School Full Address' },
  { tag: '{{school.phone}}', desc: 'School Contact Number' },
  { tag: '{{school.affiliationNo}}', desc: 'Board Affiliation No.' },
  { tag: '{{student.name}}', desc: 'Student Full Name' },
  { tag: '{{student.rollNo}}', desc: 'Student Roll Number' },
  { tag: '{{student.admissionNo}}', desc: 'Official Admission No.' },
  { tag: '{{student.class}}', desc: 'Class / Standard' },
  { tag: '{{student.section}}', desc: 'Section / Division' },
  { tag: '{{student.fatherName}}', desc: 'Father / Guardian Name' },
  { tag: '{{fee.receiptNo}}', desc: 'Unique Receipt Serial' },
  { tag: '{{fee.date}}', desc: 'Payment Date (DD/MM/YYYY)' },
  { tag: '{{fee.totalPaid}}', desc: 'Total Amount Paid (₹)' },
  { tag: '{{fee.amountInWords}}', desc: 'Amount Written in Words' },
  { tag: '{{fee.itemsTable}}', desc: 'Breakdown Itemized Table' },
  { tag: '{{fee.cashierName}}', desc: 'Name of Cashier' },
  { tag: '{{exam.academicYear}}', desc: 'Session Year (e.g. 2025-26)' },
  { tag: '{{exam.marksTable}}', desc: 'Subjects & Marks Table' },
  { tag: '{{exam.percentage}}', desc: 'Aggregate Percentage' },
  { tag: '{{exam.grade}}', desc: 'Overall Grade (e.g. A1)' },
  { tag: '{{employee.name}}', desc: 'Staff Member Name' },
  { tag: '{{salary.month}}', desc: 'Salary Month (e.g. October)' },
  { tag: '{{salary.netSalary}}', desc: 'Net In-Hand Pay (₹)' }
];

const PrintFormatStudio = () => {
  const [activeTab, setActiveTab] = useState('templates');
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Selected template for preview/edit
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [editorHtml, setEditorHtml] = useState('');
  const [editorName, setEditorName] = useState('');
  const [editorDocType, setEditorDocType] = useState('FeeReceipt');
  const [editorPaperSize, setEditorPaperSize] = useState('A4Single');

  // AI Generator state
  const [aiDocType, setAiDocType] = useState('FeeReceipt');
  const [aiPaperSize, setAiPaperSize] = useState('A4TwinCopy');
  const [aiPrompt, setAiPrompt] = useState('Clean twin-copy fee receipt for students with school logo on top-left, student details box, itemized tuition fee table, and cashier signature line.');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiGeneratedResult, setAiGeneratedResult] = useState(null);
  const [aiImage, setAiImage] = useState(null);
  const [aiImageName, setAiImageName] = useState('');
  const [aiImageSize, setAiImageSize] = useState('');
  const [aiFileType, setAiFileType] = useState('image'); // 'image' | 'pdf'
  const [isDraggingImage, setIsDraggingImage] = useState(false);

  // Print execution state
  const [printContent, setPrintContent] = useState('');
  const [triggerPrintFn, setTriggerPrintFn] = useState(null);

  // Simulator / Test Render state
  const [simDocType, setSimDocType] = useState('FeeReceipt');
  const [simRecordId, setSimRecordId] = useState('sample-demo-record');
  const [simLoading, setSimLoading] = useState(false);
  const [simResultHtml, setSimResultHtml] = useState('');

  useEffect(() => {
    fetchTemplates();
  }, []);

  const showNotification = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await apiClient.get('/print-templates');
      setTemplates(res.data || []);
      if (res.data && res.data.length > 0 && !selectedTemplate) {
        handleSelectTemplate(res.data[0]);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load print templates.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = (tpl) => {
    setSelectedTemplate(tpl);
    setEditorHtml(tpl.HtmlContent || tpl.htmlContent || '');
    setEditorName(tpl.TemplateName || tpl.templateName || '');
    setEditorDocType(tpl.DocumentType || tpl.documentType || 'FeeReceipt');
    setEditorPaperSize(tpl.PaperSize || tpl.paperSize || 'A4Single');
  };

  const handleSetDefault = async (id) => {
    try {
      await apiClient.post(`/print-templates/${id}/set-default`);
      showNotification('Format set as active default for this document type!');
      fetchTemplates();
    } catch (err) {
      setError('Failed to update default template.');
    }
  };

  const handleDeleteTemplate = async (id) => {
    if (!confirm('Are you sure you want to deactivate this template?')) return;
    try {
      await apiClient.delete(`/print-templates/${id}`);
      showNotification('Template deactivated successfully.');
      fetchTemplates();
    } catch (err) {
      setError('Failed to deactivate template.');
    }
  };

  const handleSaveEditorChanges = async () => {
    try {
      if (selectedTemplate?.id || selectedTemplate?.Id) {
        const id = selectedTemplate.id || selectedTemplate.Id;
        await apiClient.put(`/print-templates/${id}`, {
          templateName: editorName,
          htmlContent: editorHtml,
          paperSize: editorPaperSize,
          documentType: editorDocType
        });
        showNotification('Template changes saved successfully!');
      } else {
        // Create new
        const res = await apiClient.post('/print-templates', {
          templateName: editorName || 'Custom Print Format',
          htmlContent: editorHtml,
          paperSize: editorPaperSize,
          documentType: editorDocType,
          isDefault: false
        });
        showNotification('New print format created and registered!');
        handleSelectTemplate(res.data);
      }
      fetchTemplates();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save template.');
    }
  };

  // AI Generator trigger
  const handleImageFile = (file) => {
    if (!file) return;
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isImage && !isPdf) {
      setError('Please select a valid image (PNG, JPG, WEBP) or PDF document.');
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setError('File size should be under 12MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setAiImage(e.target.result);
      setAiImageName(file.name);
      setAiImageSize((file.size / 1024).toFixed(1) + ' KB');
      setAiFileType(isPdf ? 'pdf' : 'image');
      showNotification(`${isPdf ? 'PDF document' : 'Photo'} "${file.name}" attached! Click Generate to replicate it.`);
    };
    reader.readAsDataURL(file);
  };

  const handleDropImage = (e) => {
    e.preventDefault();
    setIsDraggingImage(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveImage = () => {
    setAiImage(null);
    setAiImageName('');
    setAiImageSize('');
    setAiFileType('image');
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim() && !aiImage) {
      setError('Please provide a layout prompt or upload a sample document/photo.');
      return;
    }
    try {
      setAiLoading(true);
      setError('');
      const res = await apiClient.post('/print-templates/ai-generate', {
        documentType: aiDocType,
        paperSize: aiPaperSize,
        prompt: aiPrompt.trim() || 'Faithfully clone the visual layout, tables, borders, and typography of the uploaded document and generate an EduVault print template with merge tags.',
        base64Image: aiImage || null
      });
      setAiGeneratedResult(res.data);
      setEditorHtml(res.data.htmlContent);
      setEditorName(res.data.templateName);
      setEditorDocType(res.data.documentType);
      setEditorPaperSize(res.data.paperSize);
      showNotification(aiImage ? `AI successfully cloned format from ${aiFileType === 'pdf' ? 'PDF' : 'photo'}! Review live preview and click Save.` : 'AI format generated! Review live preview and click Save.');
    } catch (err) {
      setError(err.response?.data?.error || 'AI generation failed.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSaveAiTemplate = async () => {
    if (!aiGeneratedResult) return;
    try {
      await apiClient.post('/print-templates', {
        templateName: editorName || aiGeneratedResult.templateName,
        documentType: editorDocType || aiGeneratedResult.documentType,
        paperSize: editorPaperSize || aiGeneratedResult.paperSize,
        htmlContent: editorHtml || aiGeneratedResult.htmlContent,
        wasAiGenerated: true,
        aiPromptUsed: aiPrompt,
        isDefault: false
      });
      showNotification('AI template saved to school formats gallery!');
      setActiveTab('templates');
      fetchTemplates();
    } catch (err) {
      setError('Failed to save AI template.');
    }
  };

  // Simulator / Test Print
  const handleRunSimulation = async (targetDocType) => {
    const docType = targetDocType || simDocType;
    try {
      setSimLoading(true);
      setError('');
      
      // Match template specifically for the chosen document type
      const matchingTpl = templates.find(t => 
        (t.documentType || t.DocumentType)?.toLowerCase() === docType?.toLowerCase() && (t.isDefault || t.IsDefault)
      ) || templates.find(t => 
        (t.documentType || t.DocumentType)?.toLowerCase() === docType?.toLowerCase()
      );

      const params = matchingTpl ? { templateId: matchingTpl.id || matchingTpl.Id } : {};
      const recordId = simRecordId?.trim() || 'sample-demo-record';
      const res = await apiClient.get(`/print-templates/render/${docType}/${recordId}`, {
        params
      });
      setSimResultHtml(res.data.html);
      showNotification(`Real data merged for ${docType}!`);
    } catch (err) {
      setError('Simulation failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setSimLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'simulator' && !simResultHtml) {
      handleRunSimulation(simDocType);
    }
  }, [activeTab]);

  const handleTestPrint = (htmlToPrint) => {
    setPrintContent(htmlToPrint);
    setTimeout(() => {
      if (triggerPrintFn) triggerPrintFn();
    }, 150);
  };

  if (loading && templates.length === 0) {
    return <Loader fullScreen text="Loading AI Print Format Studio..." />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16">
      {/* Hidden zero-pollution isolated print frame */}
      <PrintIframe 
        htmlContent={printContent} 
        onReady={(printFn) => setTriggerPrintFn(() => printFn)} 
      />

      <Topbar 
        title="AI & Visual Print Format Studio" 
        subtitle="Dynamic Layout Engine, Thermal POS Slips, CBSE Marksheets & AI Generator" 
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Global Notifications */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-700 text-sm shadow-sm">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span className="flex-1 font-medium">{error}</span>
            <button onClick={() => setError('')} className="text-red-500 hover:text-red-700 font-bold">&times;</button>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-700 text-sm shadow-sm animate-fade-in">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span className="flex-1 font-semibold">{successMsg}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 border-b border-slate-200 pb-4">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'templates', label: '1. School Formats Gallery', icon: Layers, count: templates.length },
              { id: 'ai-generator', label: '2. 🤖 AI Format Generator', icon: Sparkles, badge: 'Smart' },
              { id: 'visual-studio', label: '3. Visual Block & Code Studio', icon: Sliders },
              { id: 'simulator', label: '4. Live Data Print Simulator', icon: Play }
            ].map(t => {
              const Icon = t.icon;
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                    isActive 
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' 
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {t.label}
                  {t.count !== undefined && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${isActive ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      {t.count}
                    </span>
                  )}
                  {t.badge && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-400 text-amber-950 text-[9px] font-black uppercase">
                      {t.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <button 
            onClick={fetchTemplates}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-white hover:bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh Formats
          </button>
        </div>

        {/* TAB 1: TEMPLATES GALLERY */}
        {activeTab === 'templates' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left Column: Template Cards List */}
              <div className="md:col-span-1 space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Available Templates ({templates.length})</span>
                  <button
                    onClick={() => {
                      setSelectedTemplate(null);
                      setEditorName('New Custom Template');
                      setEditorDocType('FeeReceipt');
                      setEditorPaperSize('A4Single');
                      setEditorHtml('<div class="print-zone-a4" style="font-family:sans-serif; padding:16px;"><h1>{{school.name}}</h1><p>Document Content</p></div>');
                      setActiveTab('visual-studio');
                    }}
                    className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                  >
                    <Plus className="w-3.5 h-3.5" /> Create New
                  </button>
                </div>

                <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
                  {templates.map(tpl => {
                    const isSelected = selectedTemplate?.id === tpl.id || selectedTemplate?.Id === tpl.id;
                    const docInfo = DOCUMENT_TYPES.find(d => d.id === tpl.documentType || d.id === tpl.DocumentType);

                    return (
                      <div
                        key={tpl.id || tpl.Id}
                        onClick={() => handleSelectTemplate(tpl)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-500/20 shadow-sm' 
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                            <span>{docInfo?.icon || '📄'}</span>
                            <span className="truncate">{tpl.templateName || tpl.TemplateName}</span>
                          </div>
                          {tpl.isDefault || tpl.IsDefault ? (
                            <span className="shrink-0 text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                              <Star className="w-3 h-3 fill-emerald-600 text-emerald-600" /> Default
                            </span>
                          ) : null}
                        </div>

                        <p className="text-[11px] text-slate-500 line-clamp-1 mb-2.5">
                          {tpl.description || tpl.Description || 'Configured print format'}
                        </p>

                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-100">
                          <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-bold">
                            {tpl.paperSize || tpl.PaperSize}
                          </span>
                          <span className="text-slate-500 font-semibold">
                            {tpl.documentType || tpl.DocumentType}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Template Detail & Live Preview */}
              <div className="md:col-span-2 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
                {selectedTemplate ? (
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-base font-bold text-slate-900">
                            {selectedTemplate.templateName || selectedTemplate.TemplateName}
                          </h2>
                          {(selectedTemplate.isDefault || selectedTemplate.IsDefault) && (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                              ACTIVE DEFAULT
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Document: <strong>{selectedTemplate.documentType || selectedTemplate.DocumentType}</strong> | Paper: <strong>{selectedTemplate.paperSize || selectedTemplate.PaperSize}</strong>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {selectedTemplate.isDefault || selectedTemplate.IsDefault ? (
                          <button
                            onClick={() => handleSetDefault(selectedTemplate.id || selectedTemplate.Id)}
                            className="flex items-center gap-1 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-xl border border-amber-300 transition-all cursor-pointer shadow-2xs"
                            title="Click to remove Default status"
                          >
                            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /> Default
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSetDefault(selectedTemplate.id || selectedTemplate.Id)}
                            className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200 transition-colors cursor-pointer"
                          >
                            <Star className="w-3.5 h-3.5" /> Make Default
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setActiveTab('visual-studio');
                          }}
                          className="flex items-center gap-1 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl border border-indigo-200 transition-colors"
                        >
                          <Sliders className="w-3.5 h-3.5" /> Edit Template
                        </button>
                        <button
                          onClick={() => handleTestPrint(selectedTemplate.htmlContent || selectedTemplate.HtmlContent)}
                          className="flex items-center gap-1 text-xs font-bold text-white bg-slate-900 hover:bg-black px-3.5 py-1.5 rounded-xl transition-colors shadow-sm"
                        >
                          <Printer className="w-3.5 h-3.5" /> Test Print
                        </button>
                      </div>
                    </div>

                    {/* Live Preview Container */}
                    <div className="bg-slate-100 rounded-2xl p-4 border border-slate-200 overflow-hidden min-h-[500px] flex items-center justify-center">
                      <iframe
                        title="template-live-preview"
                        srcDoc={`
                          <!DOCTYPE html>
                          <html>
                            <head>
                              <style>
                                body { margin: 0; padding: 12px; background: #fff; font-family: sans-serif; font-size: 11pt; }
                                .print-zone-thermal { width: 72mm; margin: 0 auto; font-family: 'Courier New', monospace; }
                                .print-zone-a4 { width: 100%; max-width: 190mm; margin: 0 auto; }
                                .print-zone-twin-copy { width: 100%; max-width: 190mm; margin: 0 auto; }
                                .print-scissor-line { border-top: 1px dashed #999; text-align: center; margin: 4mm 0; color: #888; font-size: 8pt; }
                                table { width: 100%; border-collapse: collapse; }
                              </style>
                            </head>
                            <body>
                              ${selectedTemplate.htmlContent || selectedTemplate.HtmlContent}
                            </body>
                          </html>
                        `}
                        className="w-full bg-white shadow-md rounded-xl border border-slate-300"
                        style={{ height: '540px' }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-20 text-slate-400">
                    <FileText className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                    <p className="text-xs">Select a template from the list on the left to preview.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: AI FORMAT GENERATOR */}
        {activeTab === 'ai-generator' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
                <Sparkles className="w-5 h-5" />
                <span>Describe the Print Slip You Need</span>
              </div>
              <p className="text-xs text-slate-500">
                Type your requirements in plain English or Hinglish. Our AI generator will build a pixel-perfect, printer-friendly layout with accurate merge tags.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Document Type</label>
                <select
                  value={aiDocType}
                  onChange={e => setAiDocType(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none"
                >
                  {DOCUMENT_TYPES.map(d => (
                    <option key={d.id} value={d.id}>{d.icon} {d.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target Paper Sizing</label>
                <select
                  value={aiPaperSize}
                  onChange={e => setAiPaperSize(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none"
                >
                  {PAPER_SIZES.map(p => (
                    <option key={p.id} value={p.id}>{p.label} — {p.desc}</option>
                  ))}
                </select>
              </div>

              {/* Photo / PDF Document Upload Dropzone */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                    Upload Sample Document (PDF or Photo/Scan)
                  </label>
                  <span className="text-[10px] text-slate-400">PDF, PNG, JPG, WEBP (Max 12MB)</span>
                </div>

                {!aiImage ? (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDraggingImage(true); }}
                    onDragLeave={() => setIsDraggingImage(false)}
                    onDrop={handleDropImage}
                    onClick={() => document.getElementById('ai-image-upload-school')?.click()}
                    className={`border-2 border-dashed rounded-xl p-3.5 text-center cursor-pointer transition-all ${
                      isDraggingImage
                        ? 'border-indigo-500 bg-indigo-50/60 scale-[1.01]'
                        : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50/70 bg-slate-50/30'
                    }`}
                  >
                    <input
                      id="ai-image-upload-school"
                      type="file"
                      accept="image/*,application/pdf,.pdf"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleImageFile(e.target.files[0]);
                        }
                      }}
                    />
                    <div className="flex flex-col items-center justify-center gap-1">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-xs">
                        <UploadCloud className="w-4 h-4" />
                      </div>
                      <p className="text-[11px] font-semibold text-slate-700">
                        <span className="text-indigo-600 underline underline-offset-2">Click to upload</span> or drag a PDF or photo
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Fee slip, marksheet, certificate in PDF or Image — AI will replicate its layout!
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-2.5 bg-indigo-50/60 border border-indigo-200 rounded-xl">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {aiFileType === 'pdf' ? (
                        <div className="w-10 h-10 rounded-lg bg-red-100 border border-red-200 flex flex-col items-center justify-center text-red-600 font-black text-[9px] shadow-xs">
                          <FileText className="w-4 h-4 mb-0.5" />
                          <span>PDF</span>
                        </div>
                      ) : (
                        <img
                          src={aiImage}
                          alt="Sample"
                          className="w-10 h-10 object-cover rounded-lg border border-indigo-200"
                        />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${aiFileType === 'pdf' ? 'bg-red-600 text-white' : 'bg-indigo-600 text-white'}`}>
                            {aiFileType === 'pdf' ? 'PDF ATTACHED' : 'PHOTO ATTACHED'}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-800 truncate max-w-[160px]">
                            {aiImageName}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500">
                          {aiImageSize} • AI Vision will replicate this {aiFileType === 'pdf' ? 'PDF' : 'document'} layout
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Remove document"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Layout Instructions & Design Prompt</label>
                <textarea
                  rows={5}
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  placeholder="e.g. Include student photo box on right, school affiliation number, fee receipt with late fee column, bilingual receipt..."
                  className="w-full p-3 text-xs border border-slate-200 rounded-xl focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 text-[11px] text-indigo-900">
                <strong>💡 Pro-Tip:</strong> You can ask for thermal 80mm receipts, twin-copy A4 slips with a cut line, CBSE marksheet style, or custom dual-signature blocks.
              </div>

              <button
                onClick={handleAiGenerate}
                disabled={aiLoading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md transition-all"
              >
                <Sparkles className="w-4 h-4" />
                {aiLoading ? 'AI Generator is Synthesizing Format...' : 'Generate New Print Format'}
              </button>
            </div>

            {/* AI Result & Live Preview */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Live AI Template Preview</h3>
                    <span className="text-xs text-slate-500">Instant sandbox compilation</span>
                  </div>
                  {editorHtml && (
                    <button
                      onClick={handleSaveAiTemplate}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Save Format to School
                    </button>
                  )}
                </div>

                {editorHtml ? (
                  <iframe
                    title="ai-preview"
                    srcDoc={`
                      <!DOCTYPE html>
                      <html>
                        <head>
                          <style>
                            body { margin: 0; padding: 12px; background: #fff; font-family: sans-serif; font-size: 11pt; }
                            .print-zone-thermal { width: 72mm; margin: 0 auto; font-family: 'Courier New', monospace; }
                            .print-zone-a4 { width: 100%; max-width: 190mm; margin: 0 auto; }
                            .print-zone-twin-copy { width: 100%; max-width: 190mm; margin: 0 auto; }
                            .print-scissor-line { border-top: 1px dashed #999; text-align: center; margin: 4mm 0; color: #888; font-size: 8pt; }
                            table { width: 100%; border-collapse: collapse; }
                          </style>
                        </head>
                        <body>
                          ${editorHtml}
                        </body>
                      </html>
                    `}
                    className="w-full bg-white shadow-inner rounded-xl border border-slate-200"
                    style={{ height: '480px' }}
                  />
                ) : (
                  <div className="text-center py-28 text-slate-400">
                    <Sparkles className="w-12 h-12 mx-auto mb-2 text-slate-300 animate-pulse" />
                    <p className="text-xs">Fill in your prompt on the left and click Generate to see the live template.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: VISUAL BLOCK & CODE STUDIO */}
        {activeTab === 'visual-studio' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Column: Properties & Merge Tag Helper */}
            <div className="md:col-span-1 space-y-4">
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3">
                <h3 className="text-sm font-bold text-slate-900">Format Properties</h3>
                
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Format Name</label>
                  <input 
                    type="text"
                    value={editorName}
                    onChange={e => setEditorName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Doc Type</label>
                    <select
                      value={editorDocType}
                      onChange={e => setEditorDocType(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-xl bg-white"
                    >
                      {DOCUMENT_TYPES.map(d => (
                        <option key={d.id} value={d.id}>{d.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Paper Size</label>
                    <select
                      value={editorPaperSize}
                      onChange={e => setEditorPaperSize(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-xl bg-white"
                    >
                      {PAPER_SIZES.map(p => (
                        <option key={p.id} value={p.id}>{p.id}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleSaveEditorChanges}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" /> Save Format Configuration
                </button>
              </div>

              {/* Supported Merge Tags Cheat Sheet */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Available Merge Tags (Click to Copy)</h3>
                <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                  {MERGE_TAGS.map(m => (
                    <div 
                      key={m.tag}
                      onClick={() => {
                        navigator.clipboard.writeText(m.tag);
                        showNotification(`Copied ${m.tag} to clipboard`);
                      }}
                      className="p-2 rounded-xl bg-slate-50 hover:bg-indigo-50 border border-slate-100 cursor-pointer flex items-center justify-between text-xs transition-colors"
                    >
                      <span className="font-mono font-bold text-indigo-700 text-[11px]">{m.tag}</span>
                      <span className="text-[10px] text-slate-400">{m.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: HTML Editor & Preview */}
            <div className="md:col-span-2 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Code className="w-4 h-4 text-indigo-600" />
                  <span className="text-sm font-bold text-slate-900">HTML & CSS Template Code</span>
                </div>
                <button
                  onClick={() => handleTestPrint(editorHtml)}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" /> Test Print
                </button>
              </div>

              <textarea
                rows={12}
                value={editorHtml}
                onChange={e => setEditorHtml(e.target.value)}
                className="w-full p-4 font-mono text-xs bg-slate-900 text-emerald-400 rounded-2xl border border-slate-800 focus:outline-none"
              />

              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Live Render Output</h4>
                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50">
                  <iframe
                    title="editor-live-preview"
                    srcDoc={editorHtml}
                    className="w-full bg-white rounded-xl shadow-xs border border-slate-200"
                    style={{ height: '320px' }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: LIVE SIMULATOR */}
        {activeTab === 'simulator' && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm max-w-4xl mx-auto space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">Real Data Merging Simulator</h2>
              <p className="text-xs text-slate-500">
                Test how your active school formats merge with real database records before teachers or receptionists use them.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 items-end">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Document Type</label>
                <select
                  value={simDocType}
                  onChange={e => {
                    const nextDoc = e.target.value;
                    setSimDocType(nextDoc);
                    handleRunSimulation(nextDoc);
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  {DOCUMENT_TYPES.map(d => (
                    <option key={d.id} value={d.id}>{d.icon} {d.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Record ID / Sample</label>
                <input 
                  type="text"
                  value={simRecordId}
                  onChange={e => setSimRecordId(e.target.value)}
                  placeholder="Record GUID or leave for demo data"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                />
              </div>

              <div>
                <button
                  onClick={() => handleRunSimulation(simDocType)}
                  disabled={simLoading}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all"
                >
                  <Play className="w-3.5 h-3.5" />
                  {simLoading ? 'Rendering Real Data...' : 'Run Simulation'}
                </button>
              </div>
            </div>

            {simResultHtml && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Compiled Result (Ready for Print)
                  </span>
                  <button
                    onClick={() => handleTestPrint(simResultHtml)}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold shadow-sm"
                  >
                    <Printer className="w-3.5 h-3.5" /> Print Merged Document
                  </button>
                </div>

                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-100">
                  <iframe
                    title="simulation-output"
                    srcDoc={simResultHtml}
                    className="w-full bg-white rounded-xl shadow-md border border-slate-300"
                    style={{ height: '480px' }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PrintFormatStudio;
