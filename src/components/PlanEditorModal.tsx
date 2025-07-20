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
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" 
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl font-semibold"
        >
          ×
        </button>

        <h2 className="text-2xl font-bold mb-6 text-gray-800">
          {plan ? 'Edit Plan' : 'Add New Plan'}
        </h2>
        
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="id" className="block text-sm font-medium mb-2 text-gray-700">
                Plan ID
              </label>
              <input 
                type="text" 
                id="id" 
                value={draftPlan.id} 
                onChange={e => setDraftPlan(p => ({ ...p, id: e.target.value.toLowerCase().replace(/\s/g, '-') }))} 
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                placeholder="e.g., free, pro" 
                disabled={!!plan} 
              />
            </div>
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-2 text-gray-700">
                Plan Name
              </label>
              <input 
                type="text" 
                id="name" 
                value={draftPlan.name} 
                onChange={e => setDraftPlan(p => ({ ...p, name: e.target.value }))} 
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                placeholder="e.g., Free, Professional"
              />
            </div>
          </div>

          {/* Price Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="price" className="block text-sm font-medium mb-2 text-gray-700">
                Price
              </label>
              <input 
                type="number" 
                id="price" 
                value={draftPlan.price} 
                onChange={e => setDraftPlan(p => ({ ...p, price: parseFloat(e.target.value) || 0 }))} 
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
              />
            </div>
            <div>
              <label htmlFor="pricePeriod" className="block text-sm font-medium mb-2 text-gray-700">
                Price Period
              </label>
              <select 
                id="pricePeriod" 
                value={draftPlan.pricePeriod} 
                onChange={e => setDraftPlan(p => ({ ...p, pricePeriod: e.target.value as any }))} 
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
                <option value="one-time">One Time</option>
              </select>
            </div>
          </div>

          {/* Features */}
          <div>
            <label htmlFor="features" className="block text-sm font-medium mb-2 text-gray-700">
              Features (one per line)
            </label>
            <textarea 
              id="features" 
              value={draftPlan.features.join('\n')} 
              onChange={(e) => setDraftPlan(p => ({...p, features: e.target.value.split('\n')}))} 
              rows={4} 
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" 
              placeholder="- Feature 1&#10;- Feature 2&#10;- Feature 3"
            />
          </div>

          {/* Limits and Features */}
          <fieldset className="border border-gray-300 p-4 rounded-md">
            <legend className="px-2 font-semibold text-gray-800 bg-white">Limits and Features</legend>
            <div className="space-y-4 mt-4">
              
              {/* Pages Limit */}
              <div>
                <label htmlFor="limit-pages" className="block text-sm font-medium mb-2 text-gray-700">
                  Number of Pages (-1 for unlimited)
                </label>
                <input 
                  type="number" 
                  id="limit-pages" 
                  value={draftPlan.limits.pages} 
                  onChange={e => handleLimitChange('pages', e.target.value)} 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                />
              </div>

              {/* Checkbox Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3">
                  <input 
                    type="checkbox" 
                    id="limit-ai-text" 
                    checked={draftPlan.limits.aiText} 
                    onChange={e => handleLimitChange('aiText', e.target.checked)} 
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" 
                  />
                  <label htmlFor="limit-ai-text" className="text-sm text-gray-700">
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
                  <label htmlFor="limit-ai-image" className="text-sm text-gray-700">
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
                  <label htmlFor="limit-responder" className="text-sm text-gray-700">
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
                  <label htmlFor="limit-planner" className="text-sm text-gray-700">
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
                  <label htmlFor="limit-bulk" className="text-sm text-gray-700">
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
                  <label htmlFor="limit-approval" className="text-sm text-gray-700">
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
                  <label htmlFor="limit-analytics" className="text-sm text-gray-700">
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
                  <label htmlFor="adminOnly" className="text-sm text-gray-700">
                    Admin Only
                  </label>
                </div>
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