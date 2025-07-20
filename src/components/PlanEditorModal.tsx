import React, { useState, useEffect } from 'react';
import { Plan, PlanLimits } from '../types';
import Button from './ui/Button';

interface PlanEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (plan: Plan) => void;
  plan: Plan | null;
}

const initialPlanLimits: PlanLimits = {
  pages: 1,
  aiText: true,
  aiImage: true,
  autoResponder: false,
  contentPlanner: false,
  bulkScheduling: false,
  contentApprovalWorkflow: false,
  deepAnalytics: false,
};

const initialPlan: Plan = {
  id: '',
  name: '',
  price: 0,
  pricePeriod: 'monthly',
  features: [],
  limits: initialPlanLimits,
  adminOnly: false, 
};

const PlanEditorModal: React.FC<PlanEditorModalProps> = ({ isOpen, onClose, onSave, plan }) => {
  const [draftPlan, setDraftPlan] = useState<Plan>(initialPlan);

  useEffect(() => {
    // Deep copy to prevent state mutation issues
    const newDraft = plan ? JSON.parse(JSON.stringify(plan)) : initialPlan;
    // Ensure new limits exist on old plans and adminOnly is set
    newDraft.limits = { ...initialPlanLimits, ...(newDraft.limits || {}) };
    newDraft.adminOnly = newDraft.adminOnly ?? false; 
    setDraftPlan(newDraft);
  }, [plan, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(draftPlan);
  };
  
  const handleLimitChange = (key: keyof PlanLimits, value: string | boolean) => {
    if (key === 'pages') {
        const numValue = parseInt(value as string, 10);
        setDraftPlan(p => ({ ...p, limits: { ...p.limits, [key]: isNaN(numValue) ? 0 : numValue } }));
    } else if (typeof value === 'boolean') {
        setDraftPlan(p => ({ ...p, limits: { ...p.limits, [key]: value } }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-2xl fade-in max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">{plan ? 'تعديل الخطة' : 'إضافة خطة جديدة'}</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label htmlFor="id" className="block text-sm font-medium">معرف الخطة (ID)</label><input type="text" id="id" value={draftPlan.id} onChange={e => setDraftPlan(p => ({ ...p, id: e.target.value.toLowerCase().replace(/\s/g, '-') }))} className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600" placeholder="e.g., free, pro" disabled={!!plan} /></div>
            <div><label htmlFor="name" className="block text-sm font-medium">اسم الخطة</label><input type="text" id="name" value={draftPlan.name} onChange={e => setDraftPlan(p => ({ ...p, name: e.target.value }))} className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600" placeholder="e.g., Free, Professional"/></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label htmlFor="price" className="block text-sm font-medium">السعر</label><input type="number" id="price" value={draftPlan.price} onChange={e => setDraftPlan(p => ({ ...p, price: parseFloat(e.target.value) || 0 }))} className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600" /></div>
            <div><label htmlFor="pricePeriod" className="block text-sm font-medium">فترة السعر</label><select id="pricePeriod" value={draftPlan.pricePeriod} onChange={e => setDraftPlan(p => ({ ...p, pricePeriod: e.target.value as any }))} className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"><option value="monthly">شهرياً</option><option value="yearly">سنوياً</option><option value="one-time">مرة واحدة</option></select></div>
          </div>
          <div>
            <label htmlFor="features" className="block text-sm font-medium">الميزات (ميزة واحدة في كل سطر)</label>
            <textarea 
              id="features" 
              value={draftPlan.features.join('\n')} 
              onChange={e => setDraftPlan(p => ({...p, features: e.target.value.split('\n')}))} 
              rows={5} 
              className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600" 
              placeholder="- ميزة ١..."
            />
          </div>
          <fieldset className="border p-4 rounded-md dark:border-gray-600">
            <legend className="px-2 font-semibold">الحدود والميزات</legend>
            <div className="grid grid-cols-2 gap-4">
                <div><label htmlFor="limit-pages" className="block text-sm font-medium">عدد الصفحات (-1 للانهائي)</label><input type="number" id="limit-pages" value={draftPlan.limits.pages} onChange={e => handleLimitChange('pages', e.target.value)} className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600" /></div>
                <div className="flex items-center pt-5"><input type="checkbox" id="limit-ai-text" checked={draftPlan.limits.aiText} onChange={e => handleLimitChange('aiText', e.target.checked)} className="h-4 w-4" /><label htmlFor="limit-ai-text" className="mr-2">ميزات نص AI</label></div>
                <div className="flex items-center pt-5"><input type="checkbox" id="limit-ai-image" checked={draftPlan.limits.aiImage} onChange={e => handleLimitChange('aiImage', e.target.checked)} className="h-4 w-4" /><label htmlFor="limit-ai-image" className="mr-2">ميزات صور AI</label></div>
                <div className="flex items-center"><input type="checkbox" id="limit-responder" checked={draftPlan.limits.autoResponder} onChange={e => handleLimitChange('autoResponder', e.target.checked)} className="h-4 w-4" /><label htmlFor="limit-responder" className="mr-2">الرد التلقائي</label></div>
                <div className="flex items-center"><input type="checkbox" id="limit-planner" checked={draftPlan.limits.contentPlanner} onChange={e => handleLimitChange('contentPlanner', e.target.checked)} className="h-4 w-4" /><label htmlFor="limit-planner" className="mr-2">مخطط المحتوى</label></div>
                <div className="flex items-center"><input type="checkbox" id="limit-bulk" checked={draftPlan.limits.bulkScheduling} onChange={e => handleLimitChange('bulkScheduling', e.target.checked)} className="h-4 w-4" /><label htmlFor="limit-bulk" className="mr-2">الجدولة المجمعة</label></div>
                <div className="flex items-center"><input type="checkbox" id="limit-approval" checked={draftPlan.limits.contentApprovalWorkflow} onChange={e => handleLimitChange('contentApprovalWorkflow', e.target.checked)} className="h-4 w-4" /><label htmlFor="limit-approval" className="mr-2">workflow موافقة المحتوى</label></div>
                <div className="flex items-center"><input type="checkbox" id="limit-analytics" checked={draftPlan.limits.deepAnalytics} onChange={e => handleLimitChange('deepAnalytics', e.target.checked)} className="h-4 w-4" /><label htmlFor="limit-analytics" className="mr-2">التحليلات العميقة</label></div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="adminOnly"
                    checked={draftPlan.adminOnly}
                    onChange={e => setDraftPlan(p => ({ ...p, adminOnly: e.target.checked }))}
                    className="h-4 w-4"
                  />
                  <label htmlFor="adminOnly" className="mr-2">خاص بالمسؤولين فقط</label>
                </div>

            </div>
          </fieldset>
        </div>
        <div className="mt-6 flex justify-end gap-3"><Button variant="secondary" onClick={onClose}>إلغاء</Button><Button onClick={handleSave}>حفظ الخطة</Button></div>
      </div>
    </div>
  );
};

export default PlanEditorModal;