import React, { useState } from 'react';
import { Target } from '../types';
import Button from './ui/Button';
import XMarkIcon from './icons/XMarkIcon';
import BriefcaseIcon from './icons/BriefcaseIcon';
import UserGroupIcon from './icons/UserGroupIcon';
import ChartBarIcon from './icons/ChartBarIcon';
import SparklesIcon from './icons/SparklesIcon';
import CalendarIcon from './icons/CalendarIcon';

interface CampaignCreationModalProps {
    isOpen: boolean;
    onClose: () => void;
    target: Target | null;
    onCreateCampaign: (campaignData: any) => Promise<void>;
}

interface CampaignFormData {
    name: string;
    objective: string;
    budget: string;
    budgetType: 'daily' | 'lifetime';
    startDate: string;
    endDate: string;
    status: 'ACTIVE' | 'PAUSED';
    targetAudience: {
        ageMin: number;
        ageMax: number;
        gender: 'all' | 'male' | 'female';
        locations: string[];
        interests: string[];
    };
    bidding: {
        strategy: string;
        amount: string;
    };
}

const CampaignCreationModal: React.FC<CampaignCreationModalProps> = ({ 
    isOpen, 
    onClose, 
    target, 
    onCreateCampaign 
}) => {
    const [formData, setFormData] = useState<CampaignFormData>({
        name: '',
        objective: 'CONVERSIONS',
        budget: '10',
        budgetType: 'daily',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'PAUSED',
        targetAudience: {
            ageMin: 18,
            ageMax: 65,
            gender: 'all',
            locations: [],
            interests: []
        },
        bidding: {
            strategy: 'LOWEST_COST',
            amount: '1.00'
        }
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    const totalSteps = 4;

    const objectives = [
        { value: 'CONVERSIONS', label: 'التحويلات' },
        { value: 'TRAFFIC', label: 'زيارة الموقع' },
        { value: 'ENGAGEMENT', label: 'التفاعل' },
        { value: 'LEAD_GENERATION', label: 'توليد العملاء المحتملين' },
        { value: 'SALES', label: 'المبيعات' },
        { value: 'BRAND_AWARENESS', label: 'زيادة الوعي بالعلامة التجارية' },
        { value: 'REACH', label: 'الوصول' }
    ];

    const biddingStrategies = [
        { value: 'LOWEST_COST', label: 'أقل تكلفة' },
        { value: 'TARGET_COST', label: 'التكلفة المستهدفة' },
        { value: 'CAPITAL_ADEQUACY', label: 'كفاية رأس المال' },
        { value: 'HIGHEST_VALUE', label: 'أعلى قيمة' }
    ];

    const handleInputChange = (field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleAudienceChange = (field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            targetAudience: {
                ...prev.targetAudience,
                [field]: value
            }
        }));
    };

    const handleBiddingChange = (field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            bidding: {
                ...prev.bidding,
                [field]: value
            }
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        try {
            await onCreateCampaign(formData);
            onClose();
        } catch (error) {
            console.error('Error creating campaign:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const nextStep = () => {
        if (currentStep < totalSteps) {
            setCurrentStep(currentStep + 1);
        }
    };

    const prevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const renderStepIndicator = () => {
        return (
            <div className="flex items-center justify-center mb-6">
                {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
                    <div key={step} className="flex items-center">
                        <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                                step === currentStep
                                    ? 'bg-blue-600 text-white'
                                    : step < currentStep
                                    ? 'bg-green-600 text-white'
                                    : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                            }`}
                        >
                            {step < currentStep ? '✓' : step}
                        </div>
                        {step < totalSteps && (
                            <div
                                className={`w-16 h-1 mx-2 ${
                                    step < currentStep
                                        ? 'bg-green-600'
                                        : 'bg-gray-200 dark:bg-gray-700'
                                }`}
                            />
                        )}
                    </div>
                ))}
            </div>
        );
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                اسم الحملة *
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => handleInputChange('name', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="أدخل اسم الحملة"
                                required
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                الهدف الإعلاني *
                            </label>
                            <select
                                value={formData.objective}
                                onChange={(e) => handleInputChange('objective', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                required
                            >
                                {objectives.map((objective) => (
                                    <option key={objective.value} value={objective.value}>
                                        {objective.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                الحالة الأولية
                            </label>
                            <div className="flex gap-4">
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        name="status"
                                        value="PAUSED"
                                        checked={formData.status === 'PAUSED'}
                                        onChange={(e) => handleInputChange('status', e.target.value)}
                                        className="mr-2"
                                    />
                                    متوقفة
                                </label>
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        name="status"
                                        value="ACTIVE"
                                        checked={formData.status === 'ACTIVE'}
                                        onChange={(e) => handleInputChange('status', e.target.value)}
                                        className="mr-2"
                                    />
                                    نشطة
                                </label>
                            </div>
                        </div>
                    </div>
                );

            case 2:
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                نوع الميزانية
                            </label>
                            <div className="flex gap-4">
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        name="budgetType"
                                        value="daily"
                                        checked={formData.budgetType === 'daily'}
                                        onChange={(e) => handleInputChange('budgetType', e.target.value)}
                                        className="mr-2"
                                    />
                                    يومية
                                </label>
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        name="budgetType"
                                        value="lifetime"
                                        checked={formData.budgetType === 'lifetime'}
                                        onChange={(e) => handleInputChange('budgetType', e.target.value)}
                                        className="mr-2"
                                    />
                                    إجمالية
                                </label>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                الميزانية ($) *
                            </label>
                            <input
                                type="number"
                                value={formData.budget}
                                onChange={(e) => handleInputChange('budget', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="0.00"
                                min="1"
                                step="0.01"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    تاريخ البدء *
                                </label>
                                <input
                                    type="date"
                                    value={formData.startDate}
                                    onChange={(e) => handleInputChange('startDate', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    تاريخ الانتهاء *
                                </label>
                                <input
                                    type="date"
                                    value={formData.endDate}
                                    onChange={(e) => handleInputChange('endDate', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    min={formData.startDate}
                                    required
                                />
                            </div>
                        </div>
                    </div>
                );

            case 3:
                return (
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                            استهداف الجمهور
                        </h3>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    العمر الأدنى
                                </label>
                                <input
                                    type="number"
                                    value={formData.targetAudience.ageMin}
                                    onChange={(e) => handleAudienceChange('ageMin', parseInt(e.target.value))}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    min="13"
                                    max="65"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    العمر الأقصى
                                </label>
                                <input
                                    type="number"
                                    value={formData.targetAudience.ageMax}
                                    onChange={(e) => handleAudienceChange('ageMax', parseInt(e.target.value))}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    min={formData.targetAudience.ageMin}
                                    max="65"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                الجنس
                            </label>
                            <select
                                value={formData.targetAudience.gender}
                                onChange={(e) => handleAudienceChange('gender', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            >
                                <option value="all">الجميع</option>
                                <option value="male">ذكور</option>
                                <option value="female">إناث</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                المواقع (مفصولة بفواصل)
                            </label>
                            <textarea
                                value={formData.targetAudience.locations.join(', ')}
                                onChange={(e) => handleAudienceChange('locations', e.target.value.split(',').map(s => s.trim()).filter(s => s))}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                rows={3}
                                placeholder="مثال: الرياض, جدة, الدمام"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                الاهتمامات (مفصولة بفواصل)
                            </label>
                            <textarea
                                value={formData.targetAudience.interests.join(', ')}
                                onChange={(e) => handleAudienceChange('interests', e.target.value.split(',').map(s => s.trim()).filter(s => s))}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                rows={3}
                                placeholder="مثال: التكنولوجيا, التسوق, الرياضة"
                            />
                        </div>
                    </div>
                );

            case 4:
                return (
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                            إعدادات المزايدة
                        </h3>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                استراتيجية المزايدة
                            </label>
                            <select
                                value={formData.bidding.strategy}
                                onChange={(e) => handleBiddingChange('strategy', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            >
                                {biddingStrategies.map((strategy) => (
                                    <option key={strategy.value} value={strategy.value}>
                                        {strategy.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                حد المزايدة ($)
                            </label>
                            <input
                                type="number"
                                value={formData.bidding.amount}
                                onChange={(e) => handleBiddingChange('amount', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="0.00"
                                min="0.01"
                                step="0.01"
                            />
                        </div>

                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                            <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">ملخص الحملة</h4>
                            <div className="space-y-2 text-sm text-blue-700 dark:text-blue-400">
                                <p><strong>الاسم:</strong> {formData.name}</p>
                                <p><strong>الهدف:</strong> {objectives.find(o => o.value === formData.objective)?.label}</p>
                                <p><strong>الميزانية:</strong> {formData.budgetType === 'daily' ? 'يومية' : 'إجمالية'} ${formData.budget}</p>
                                <p><strong>المدة:</strong> {formData.startDate} إلى {formData.endDate}</p>
                            </div>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    if (!isOpen || !target) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-6 border-b dark:border-gray-700">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">إنشاء حملة إعلانية جديدة</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            الصفحة: {target.name}
                        </p>
                    </div>
                    <Button onClick={onClose} variant="secondary" size="sm">
                        <XMarkIcon className="w-5 h-5"/>
                    </Button>
                </div>

                <div className="p-6 overflow-y-auto flex-grow">
                    {renderStepIndicator()}
                    <form onSubmit={handleSubmit}>
                        {renderStepContent()}
                    </form>
                </div>

                <div className="flex justify-between items-center p-6 border-t dark:border-gray-700">
                    <Button
                        type="button"
                        onClick={prevStep}
                        disabled={currentStep === 1}
                        variant="outline"
                    >
                        السابق
                    </Button>
                    
                    <div className="flex gap-3">
                        <Button
                            type="button"
                            onClick={onClose}
                            variant="secondary"
                        >
                            إلغاء
                        </Button>
                        
                        {currentStep < totalSteps ? (
                            <Button
                                type="button"
                                onClick={nextStep}
                                disabled={
                                    currentStep === 1 && !formData.name ||
                                    currentStep === 2 && (!formData.budget || !formData.startDate || !formData.endDate)
                                }
                            >
                                التالي
                            </Button>
                        ) : (
                            <Button
                                type="submit"
                                onClick={handleSubmit}
                                disabled={isSubmitting || !formData.name}
                            >
                                {isSubmitting ? 'جاري الإنشاء...' : 'إنشاء الحملة'}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CampaignCreationModal;