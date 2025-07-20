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
  scheduledPosts: 50, // Added missing property
  drafts: 20, // Added missing property
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
    if (key === 'pages' || key === 'scheduledPosts' || key === 'drafts') {
        const numValue = parseInt(value as string, 10);
        setDraftPlan(p => ({ ...p, limits: { ...p.limits, [key]: isNaN(numValue) ? 0 : numValue } }));
    } else if (typeof value === 'boolean') {
        setDraftPlan(p => ({ ...p, limits: { ...p.limits, [key]: value } }));
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-4 z-50 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl p-8 w-full max-w-5xl max-h-[85vh] overflow-y-auto relative mt-8 mb-8"
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

        <div className="space-y-8">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="id" className="block text-base font-medium mb-3 text-gray-700">
                Plan ID
              </label>
              <input
                type="text"
                id="id"
                value={draftPlan.id}
                onChange={e => setDraftPlan(p => ({ ...p, id: e.target.value.toLowerCase().replace(/s/g, '-') }))}
                className="w-full px-4 py-3 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., free, pro"
                disabled={!!plan}
              />
            </div>
            <div>
              <label htmlFor="name" className="block text-base font-medium mb-3 text-gray-700">
                Plan Name
              </label>
              <input
                type="text"
                id="name"
                value={draftPlan.name}
                onChange={e => setDraftPlan(p => ({ ...p, name: e.target.value }))}
                className="w-full px-4 py-3 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Free, Professional"
              />
            </div>
          </div>

          {/* Price Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="price" className="block text-base font-medium mb-3 text-gray-700">
                Price
              </label>
              <input
                type="number"
                id="price"
                value={draftPlan.price}
                onChange={e => setDraftPlan(p => ({ ...p, price: parseFloat(e.target.value) || 0 }))}
                className="w-full px-4 py-3 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="pricePeriod" className="block text-base font-medium mb-3 text-gray-700">
                Price Period
              </label>
              <select
                id="pricePeriod"
                value={draftPlan.pricePeriod}
                onChange={e => setDraftPlan(p => ({ ...p, pricePeriod: e.target.value as any }))}
                className="w-full px-4 py-3 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
                <option value="one-time">One Time</option>
              </select>
            </div>
          </div>

          {/* Features */}
          <div>
            <label htmlFor="features" className="block text-base font-medium mb-3 text-gray-700">
              Features (one per line)
            </label>
            <textarea
              id="features"
              value={draftPlan.features.join('
')}
              onChange={(e) => setDraftPlan(p => ({...p, features: e.target.value.split('
')}))}
              rows={6}
              className="w-full px-4 py-3 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder={`- Feature 1
- Feature 2
- Feature 3`}
            />
          </div>

          {/* Limits and Features */}
          <fieldset className="border border-gray-300 p-6 rounded-lg">
            <legend className="px-3 text-lg font-semibold text-gray-800 bg-white">Limits and Features</legend>
            <div className="space-y-6 mt-6">

              {/* Pages Limit */}
              <div>
                <label htmlFor="limit-pages" className="block text-base font-medium mb-3 text-gray-700">
                  Number of Pages (-1 for unlimited)
                </label>
                <input
                  type="number"
                  id="limit-pages"
                  value={draftPlan.limits.pages}
                  onChange={e => handleLimitChange('pages', e.target.value)}
                  className="w-full px-4 py-3 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Scheduled Posts Limit */}
              <div>
                <label htmlFor="limit-scheduled-posts" className="block text-base font-medium mb-3 text-gray-700">
                  Number of Scheduled Posts (-1 for unlimited)
                </label>
                <input
                  type="number"
                  id="limit-scheduled-posts"
                  value={draftPlan.limits.scheduledPosts}
                  onChange={e => handleLimitChange('scheduledPosts', e.target.value)}
                  className="w-full px-4 py-3 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Drafts Limit */}
              <div>
                <label htmlFor="limit-drafts" className="block text-base font-medium mb-3 text-gray-700">
                  Number of Drafts (-1 for unlimited)
                </label>
                <input
                  type="number"
                  id="limit-drafts"
                  value={draftPlan.limits.drafts}
                  onChange={e => handleLimitChange('drafts', e.target.value)}
                  className="w-full px-4 py-3 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Checkbox Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center space-x-4">
                  <input
                    type="checkbox"
                    id="limit-ai-text"
                    checked={draftPlan.limits.aiText}
                    onChange={e => handleLimitChange('aiText', e.target.checked)}
                    className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="limit-ai-text" className="text-base text-gray-700">
                    AI Text Features
                  </label>
                </div>

                <div className="flex items-center space-x-4">
                  <input
                    type="checkbox"
                    id="limit-ai-image"
                    checked={draftPlan.limits.aiImage}
                    onChange={e => handleLimitChange('aiImage', e.target.checked)}
                    className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="limit-ai-image" className="text-base text-gray-700">
                    AI Image Features
                  </label>
                </div>

                <div className="flex items-center space-x-4">
                  <input
                    type="checkbox"
                    id="limit-responder"
                    checked={draftPlan.limits.autoResponder}
                    onChange={e => handleLimitChange('autoResponder', e.target.checked)}
                    className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="limit-responder" className="text-base text-gray-700">
                    Auto Responder
                  </label>
                </div>

                <div className="flex items-center space-x-4">
                  <input
                    type="checkbox"
                    id="limit-planner"
                    checked={draftPlan.limits.contentPlanner}
                    onChange={e => handleLimitChange('contentPlanner', e.target.checked)}
                    className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="limit-planner" className="text-base text-gray-700">
                    Content Planner
                  </label>
                </div>

                <div className="flex items-center space-x-4">
                  <input
                    type="checkbox"
                    id="limit-bulk"
                    checked={draftPlan.limits.bulkScheduling}
                    onChange={e => handleLimitChange('bulkScheduling', e.target.checked)}
                    className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="limit-bulk" className="text-base text-gray-700">
                    Bulk Scheduling
                  </label>
                </div>

                <div className="flex items-center space-x-4">
                  <input
                    type="checkbox"
                    id="limit-approval"
                    checked={draftPlan.limits.contentApprovalWorkflow}
                    onChange={e => handleLimitChange('contentApprovalWorkflow', e.target.checked)}
                    className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="limit-approval" className="text-base text-gray-700">
                    Content Approval Workflow
                  </label>
                </div>

                <div className="flex items-center space-x-4">
                  <input
                    type="checkbox"
                    id="limit-analytics"
                    checked={draftPlan.limits.deepAnalytics}
                    onChange={e => handleLimitChange('deepAnalytics', e.target.checked)}
                    className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="limit-analytics" className="text-base text-gray-700">
                    Deep Analytics
                  </label>
                </div>

                <div className="flex items-center space-x-4">
                  <input
                    type="checkbox"
                    id="adminOnly"
                    checked={draftPlan.adminOnly}
                    onChange={e => setDraftPlan(p => ({ ...p, adminOnly: e.target.checked }))}
                    className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="adminOnly" className="text-base text-gray-700">
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