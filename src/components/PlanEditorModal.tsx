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
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-start pt-8 pb-8 px-4 overflow-y-auto" 
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-2xl mx-auto my-auto min-h-fit"
        onClick={(e) => e.stopPropagation()}
        style={{ marginTop: '2rem', marginBottom: '2rem' }}
      >
        <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">
          {plan ? 'Edit Plan' : 'Add New Plan'}
        </h2>
        
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="id" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                Plan ID
              </label>
              <input 
                type="text" 
                id="id" 
                value={draftPlan.id} 
                onChange={e => setDraftPlan(p => ({ ...p, id: e.target.value.toLowerCase().replace(/\s/g, '-') }))} 
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                placeholder="e.g., free, pro" 
                disabled={!!plan} 
              />
            </div>
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                Plan Name
              </label>
              <input 
                type="text" 
                id="name" 
                value={draftPlan.name} 
                onChange={e => setDraftPlan(p => ({ ...p, name: e.target.value }))} 
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                placeholder="e.g., Free, Professional"
              />
            </div>
          </div>

          {/* Price Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="price" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                Price
              </label>
              <input 
                type="number" 
                id="price" 
                value={draftPlan.price} 
                onChange={e => setDraftPlan(p => ({ ...p, price: parseFloat(e.target.value) || 0 }))} 
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
              />
            </div>
            <div>
              <label htmlFor="pricePeriod" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                Price Period
              </label>
              <select 
                id="pricePeriod" 
                value={draftPlan.pricePeriod} 
                onChange={e => setDraftPlan(p => ({ ...p, pricePeriod: e.target.value as any }))} 
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
                <option value="one-time">One Time</option>
              </select>
            </div>
          </div>

          {/* Features */}
          <div>
            <label htmlFor="features" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Features (one per line)
            </label>
            <textarea 
              id="features" 
              value={draftPlan.features.join('\n')} 
              onChange={(e) => setDraftPlan(p => ({...p, features: e.target.value.split('\n')}))} 
              rows={4} 
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" 
              placeholder="- Feature 1&#10;- Feature 2&#10;- Feature 3"
            />
          </div>

          {/* Limits and Features */}
          <fieldset className="border border-gray-300 dark:border-gray-600 p-4 rounded-md">
            <legend className="px-2 font-semibold text-gray-800 dark:text-white">Limits and Features</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              
              {/* Pages Limit */}
              <div className="col-span-full">
                <label htmlFor="limit-pages" className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Number of Pages (-1 for unlimited)
                </label>
                <input 
                  type="number" 
                  id="limit-pages" 
                  value={draftPlan.limits.pages} 
                  onChange={e => handleLimitChange('pages', e.target.value)} 
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                />
              </div>

              {/* Checkbox Options */}
              <div className="flex items-center space-x-3">
                <input 
                  type="checkbox" 
                  id="limit-ai-text" 
                  checked={draftPlan.limits.aiText} 
                  onChange={e => handleLimitChange('aiText', e.target.checked)} 
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" 
                />
                <label htmlFor="limit-ai-text" className="text-sm text-gray-700 dark:text-gray-300">
                  AI Text Features
                </label>
              </div>

              <div className="flex items-center space-x-3">
                <input 
                  type="checkbox" 
                  id="limit-ai-image" 
                  checked={draftPlan.limits.aiImage} 
                  onChange={e => handleLimitChange('aiImage', e.target.checked)} 
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" 
                />
                <label htmlFor="limit-ai-image" className="text-sm text-gray-700 dark:text-gray-300">
                  AI Image Features
                </label>
              </div>

              <div className="flex items-center space-x-3">
                <input 
                  type="checkbox" 
                  id="limit-responder" 
                  checked={draftPlan.limits.autoResponder} 
                  onChange={e => handleLimitChange('autoResponder', e.target.checked)} 
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" 
                />
                <label htmlFor="limit-responder" className="text-sm text-gray-700 dark:text-gray-300">
                  Auto Responder
                </label>
              </div>

              <div className="flex items-center space-x-3">
                <input 
                  type="checkbox" 
                  id="limit-planner" 
                  checked={draftPlan.limits.contentPlanner} 
                  onChange={e => handleLimitChange('contentPlanner', e.target.checked)} 
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" 
                />
                <label htmlFor="limit-planner" className="text-sm text-gray-700 dark:text-gray-300">
                  Content Planner
                </label>
              </div>

              <div className="flex items-center space-x-3">
                <input 
                  type="checkbox" 
                  id="limit-bulk" 
                  checked={draftPlan.limits.bulkScheduling} 
                  onChange={e => handleLimitChange('bulkScheduling', e.target.checked)} 
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" 
                />
                <label htmlFor="limit-bulk" className="text-sm text-gray-700 dark:text-gray-300">
                  Bulk Scheduling
                </label>
              </div>

              <div className="flex items-center space-x-3">
                <input 
                  type="checkbox" 
                  id="limit-approval" 
                  checked={draftPlan.limits.contentApprovalWorkflow} 
                  onChange={e => handleLimitChange('contentApprovalWorkflow', e.target.checked)} 
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" 
                />
                <label htmlFor="limit-approval" className="text-sm text-gray-700 dark:text-gray-300">
                  Content Approval Workflow
                </label>
              </div>

              <div className="flex items-center space-x-3">
                <input 
                  type="checkbox" 
                  id="limit-analytics" 
                  checked={draftPlan.limits.deepAnalytics} 
                  onChange={e => handleLimitChange('deepAnalytics', e.target.checked)} 
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" 
                />
                <label htmlFor="limit-analytics" className="text-sm text-gray-700 dark:text-gray-300">
                  Deep Analytics
                </label>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="adminOnly"
                  checked={draftPlan.adminOnly}
                  onChange={e => setDraftPlan(p => ({ ...p, adminOnly: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="adminOnly" className="text-sm text-gray-700 dark:text-gray-300">
                  Admin Only
                </label>
              </div>
            </div>
          </fieldset>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex justify-end gap-3 border-t pt-6">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Plan
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PlanEditorModal;