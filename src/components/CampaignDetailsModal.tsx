import React, { useState, useEffect } from 'react';
import { Target } from '../types';
import Button from './ui/Button';
import KpiCard from './ui/KpiCard';
import XMarkIcon from './icons/XMarkIcon';
import ChartBarIcon from './icons/ChartBarIcon';
import UserGroupIcon from './icons/UserGroupIcon';
import CursorArrowRaysIcon from './icons/CursorArrowRaysIcon';
import ClockIcon from './icons/ClockIcon';
import ChartPieIcon from './icons/ChartPieIcon';
import SparklesIcon from './icons/SparklesIcon';
import PencilSquareIcon from './icons/PencilSquareIcon';

interface Campaign {
    id: string;
    name: string;
    status: string;
    objective: string;
    budget?: string;
    budgetType?: 'daily' | 'lifetime';
    startDate?: string;
    endDate?: string;
    insights: any;
    performance?: {
        trend?: 'up' | 'down' | 'stable';
        change?: number;
    };
}

interface AdSet {
    id: string;
    name: string;
    status: string;
    insights: any;
}

interface Ad {
    id: string;
    name: string;
    status: string;
    insights: any;
    creative: {
        thumbnail_url?: string;
        body?: string;
    };
}

interface CampaignDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    campaign: Campaign | null;
    target: Target | null;
    fetchCampaignSubEntities: (campaignId: string) => Promise<{ adSets: AdSet[], ads: Ad[] }>;
}

const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 text-sm font-medium transition-colors rounded-t-lg ${
            active
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
        }`}
    >
        {children}
    </button>
);

const CampaignDetailsModal: React.FC<CampaignDetailsModalProps> = ({ isOpen, onClose, campaign, target, fetchCampaignSubEntities }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'adsets' | 'ads' | 'budget'>('overview');
    const [adSets, setAdSets] = useState<AdSet[]>([]);
    const [ads, setAds] = useState<Ad[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isEditingBudget, setIsEditingBudget] = useState(false);
    const [budgetData, setBudgetData] = useState({
        budget: campaign?.budget || '0',
        budgetType: campaign?.budgetType || 'daily',
        startDate: campaign?.startDate || '',
        endDate: campaign?.endDate || ''
    });

    useEffect(() => {
        if (isOpen && campaign) {
            console.log(`Loading campaign details for campaign: ${campaign.id} (${campaign.name})`);
            setIsLoading(true);
            
            fetchCampaignSubEntities(campaign.id)
                .then(data => {
                    console.log(`Successfully fetched campaign sub-entities for ${campaign.id}:`, {
                        adSetsCount: data.adSets.length,
                        adsCount: data.ads.length
                    });
                    
                    // Log any issues with the data
                    if (data.adSets.length === 0 && data.ads.length === 0) {
                        console.warn(`No ad sets or ads found for campaign ${campaign.id}`);
                    }
                    
                    // Check for insights data quality
                    const hasValidInsights = data.adSets.some(adSet => 
                        adSet.insights && Object.keys(adSet.insights).length > 0
                    ) || data.ads.some(ad => 
                        ad.insights && Object.keys(ad.insights).length > 0
                    );
                    
                    if (!hasValidInsights) {
                        console.warn(`No valid insights data found for campaign ${campaign.id} sub-entities`);
                    }
                    
                    setAdSets(data.adSets);
                    setAds(data.ads);
                })
                .catch(error => {
                    console.error(`Failed to fetch campaign sub-entities for ${campaign.id}:`, error);
                    // Add more detailed error logging
                    if (error instanceof Error) {
                        console.error('Error details:', {
                            message: error.message,
                            stack: error.stack,
                            name: error.name
                        });
                    }
                })
                .finally(() => setIsLoading(false));
        }
    }, [isOpen, campaign, fetchCampaignSubEntities]);

    useEffect(() => {
        if (campaign) {
            setBudgetData({
                budget: campaign.budget || '0',
                budgetType: campaign.budgetType || 'daily',
                startDate: campaign.startDate || '',
                endDate: campaign.endDate || ''
            });
        }
    }, [campaign]);

    const handleBudgetSave = () => {
        // In a real implementation, this would call an API to update the campaign budget
        console.log('Saving budget data:', budgetData);
        setIsEditingBudget(false);
        // Show success notification
    };

    const calculateBudgetUtilization = () => {
        if (!campaign?.insights?.spend || !campaign?.budget) return 0;
        const spend = parseFloat(campaign.insights.spend || '0');
        const budget = parseFloat(campaign.budget || '0');
        return budget > 0 ? (spend / budget) * 100 : 0;
    };

    const getDaysRemaining = () => {
        if (!campaign?.endDate) return 0;
        const endDate = new Date(campaign.endDate);
        const today = new Date();
        const diffTime = endDate.getTime() - today.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    const getBudgetStatus = () => {
        const utilization = calculateBudgetUtilization();
        if (utilization >= 90) return { color: 'text-red-600', label: 'وشيك على النفاد' };
        if (utilization >= 70) return { color: 'text-yellow-600', label: 'متوسط الاستخدام' };
        return { color: 'text-green-600', label: 'جيد' };
    };
    
    if (!isOpen || !campaign) return null;

    const renderInsights = (insights: any, prefix = '', entityName = '') => {
        // Log insights data for debugging
        if (process.env.NODE_ENV === 'development') {
            console.log(`Rendering insights for ${entityName}:`, insights);
        }
        
        // Check if insights data is valid
        if (!insights || typeof insights !== 'object') {
            console.warn(`Invalid insights data for ${entityName}:`, insights);
            return (
                <div className="text-center text-gray-500 dark:text-gray-400 p-4">
                    <p className="text-sm">بيانات الأداء غير متوفرة</p>
                </div>
            );
        }
        
        // Extract metrics with safe fallbacks
        const spend = parseFloat(insights?.[prefix + 'spend'] || '0');
        const reach = parseInt(insights?.[prefix + 'reach'] || '0');
        const clicks = parseInt(insights?.[prefix + 'clicks'] || '0');
        const ctr = parseFloat(insights?.[prefix + 'ctr'] || '0');
        
        // Log if all metrics are zero
        if (spend === 0 && reach === 0 && clicks === 0 && ctr === 0) {
            console.warn(`All metrics are zero for ${entityName}`);
        }
        
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mt-2 text-center">
                <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded">
                    <p className="font-bold text-gray-800 dark:text-white">${spend.toFixed(2)}</p>
                    <p className="text-gray-500 dark:text-gray-400">الإنفاق</p>
                </div>
                <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded">
                    <p className="font-bold text-gray-800 dark:text-white">{reach.toLocaleString()}</p>
                    <p className="text-gray-500 dark:text-gray-400">الوصول</p>
                </div>
                <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded">
                    <p className="font-bold text-gray-800 dark:text-white">{clicks.toLocaleString()}</p>
                    <p className="text-gray-500 dark:text-gray-400">النقرات</p>
                </div>
                <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded">
                    <p className="font-bold text-gray-800 dark:text-white">{ctr.toFixed(2)}%</p>
                    <p className="text-gray-500 dark:text-gray-400">CTR</p>
                </div>
            </div>
        );
    };

    const renderOverview = () => (
        <div className="space-y-6">
            {/* Campaign Overview */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-3">نظرة عامة على الحملة</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">الحالة</p>
                        <p className="font-medium">{campaign.status}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">الهدف</p>
                        <p className="font-medium">{campaign.objective.replace(/_/g, ' ')}</p>
                    </div>
                    {campaign.startDate && (
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">تاريخ البدء</p>
                            <p className="font-medium">{campaign.startDate}</p>
                        </div>
                    )}
                    {campaign.endDate && (
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">تاريخ الانتهاء</p>
                            <p className="font-medium">{campaign.endDate}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Budget Overview */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-lg">نظرة عامة على الميزانية</h3>
                    <Button 
                        onClick={() => setIsEditingBudget(true)} 
                        size="sm" 
                        variant="outline"
                        className="flex items-center gap-2"
                    >
                        <PencilSquareIcon className="w-4 h-4" />
                        تعديل
                    </Button>
                </div>
                
                {isEditingBudget ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    الميزانية
                                </label>
                                <input
                                    type="number"
                                    value={budgetData.budget}
                                    onChange={(e) => setBudgetData(prev => ({ ...prev, budget: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="0.00"
                                    min="0"
                                    step="0.01"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    نوع الميزانية
                                </label>
                                <select
                                    value={budgetData.budgetType}
                                    onChange={(e) => setBudgetData(prev => ({ ...prev, budgetType: e.target.value as any }))}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                    <option value="daily">يومية</option>
                                    <option value="lifetime">إجمالية</option>
                                </select>
                            </div>
                        </div>
                        
                        <div className="flex gap-3">
                            <Button onClick={handleBudgetSave} size="sm">
                                حفظ
                            </Button>
                            <Button onClick={() => setIsEditingBudget(false)} variant="secondary" size="sm">
                                إلغاء
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">الميزانية</p>
                            <p className="font-semibold text-lg">${campaign.budget || '0'}</p>
                            <p className="text-xs text-gray-500">{campaign.budgetType === 'daily' ? 'يومية' : 'إجمالية'}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">الإنفاق</p>
                            <p className="font-semibold text-lg">${parseFloat(campaign.insights?.spend || '0').toFixed(2)}</p>
                            <p className="text-xs text-gray-500">إجمالي</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">حالة الميزانية</p>
                            <p className={`font-semibold ${getBudgetStatus().color}`}>{getBudgetStatus().label}</p>
                            <p className="text-xs text-gray-500">{calculateBudgetUtilization().toFixed(1)}% مستخدم</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard 
                    icon={<ChartBarIcon className="w-6 h-6 text-green-500" />} 
                    label="الوصول" 
                    value={parseInt(campaign.insights?.reach || '0', 10).toLocaleString()} 
                />
                <KpiCard 
                    icon={<UserGroupIcon className="w-6 h-6 text-blue-500" />} 
                    label="النقرات" 
                    value={parseInt(campaign.insights?.clicks || '0', 10).toLocaleString()} 
                />
                <KpiCard 
                    icon={<CursorArrowRaysIcon className="w-6 h-6 text-purple-500" />} 
                    label="CTR" 
                    value={`${parseFloat(campaign.insights?.ctr || '0').toFixed(2)}%`} 
                />
                <KpiCard 
                    icon={<ClockIcon className="w-6 h-6 text-orange-500" />} 
                    label="الأيام المتبقية" 
                    value={getDaysRemaining().toString()} 
                />
            </div>

            {/* Additional Insights */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
                    <SparklesIcon className="w-4 h-4" />
                    رؤى الأداء
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                        <p className="text-blue-700 dark:text-blue-400">
                            متوسط تكلفة النقرة: ${parseFloat(campaign.insights?.cpc || '0').toFixed(2)}
                        </p>
                        <p className="text-blue-700 dark:text-blue-400">
                            تكلفة الألف ظهور: ${parseFloat(campaign.insights?.cpm || '0').toFixed(2)}
                        </p>
                    </div>
                    <div>
                        <p className="text-blue-700 dark:text-blue-400">
                            إجمالي الظهور: {parseInt(campaign.insights?.impressions || '0', 10).toLocaleString()}
                        </p>
                        <p className="text-blue-700 dark:text-blue-400">
                            معدل التفاعل: {parseFloat(campaign.insights?.ctr || '0').toFixed(2)}%
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
                    <div>
                        <h2 className="text-xl font-bold">{campaign.name}</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">الهدف: {campaign.objective.replace(/_/g, ' ')}</p>
                    </div>
                    <Button onClick={onClose} variant="secondary" size="sm">
                        <XMarkIcon className="w-5 h-5"/>
                    </Button>
                </div>

                <div className="p-4 overflow-y-auto flex-grow">
                    {isLoading ? <p>جاري تحميل التفاصيل...</p> : (
                        <>
                            <div className="border-b dark:border-gray-700 mb-4">
                                <nav className="-mb-px flex space-x-4" aria-label="Tabs">
                                    <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')}>نظرة عامة</TabButton>
                                    <TabButton active={activeTab === 'adsets'} onClick={() => setActiveTab('adsets')}>المجموعات الإعلانية ({adSets.length})</TabButton>
                                    <TabButton active={activeTab === 'ads'} onClick={() => setActiveTab('ads')}>الإعلانات ({ads.length})</TabButton>
                                    <TabButton active={activeTab === 'budget'} onClick={() => setActiveTab('budget')}>الميزانية</TabButton>
                                </nav>
                            </div>

                            {activeTab === 'overview' && renderOverview()}

                            {activeTab === 'adsets' && (
                                <ul className="space-y-3">
                                    {adSets.map(adSet => (
                                        <li key={adSet.id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                            <h4 className="font-semibold">{adSet.name} - <span className="text-sm font-normal">{adSet.status}</span></h4>
                                            {renderInsights(adSet.insights, '', `Ad Set: ${adSet.name}`)}
                                        </li>
                                    ))}
                                </ul>
                            )}

                            {activeTab === 'ads' && (
                                <ul className="space-y-3">
                                    {ads.map(ad => (
                                        <li key={ad.id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                            <div className="flex items-start space-x-4">
                                                {ad.creative.thumbnail_url && <img src={ad.creative.thumbnail_url} alt={ad.name} className="w-20 h-20 object-cover rounded" />}
                                                <div className="flex-grow">
                                                    <h4 className="font-semibold">{ad.name} - <span className="text-sm font-normal">{ad.status}</span></h4>
                                                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">{ad.creative.body}</p>
                                                    {renderInsights(ad.insights, '', `Ad: ${ad.name}`)}
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}

                            {activeTab === 'budget' && (
                                <div className="space-y-6">
                                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                                        <h3 className="font-semibold text-lg mb-4">إدارة الميزانية</h3>
                                        
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                        الميزانية الحالية
                                                    </label>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="number"
                                                            value={budgetData.budget}
                                                            onChange={(e) => setBudgetData(prev => ({ ...prev, budget: e.target.value }))}
                                                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                            placeholder="0.00"
                                                            min="0"
                                                            step="0.01"
                                                            disabled={!isEditingBudget}
                                                        />
                                                        <span className="text-sm text-gray-500">{campaign.budgetType === 'daily' ? '/يوم' : 'إجمالي'}</span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                        نوع الميزانية
                                                    </label>
                                                    <select
                                                        value={budgetData.budgetType}
                                                        onChange={(e) => setBudgetData(prev => ({ ...prev, budgetType: e.target.value as any }))}
                                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                        disabled={!isEditingBudget}
                                                    >
                                                        <option value="daily">يومية</option>
                                                        <option value="lifetime">إجمالية</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                        تاريخ البدء
                                                    </label>
                                                    <input
                                                        type="date"
                                                        value={budgetData.startDate}
                                                        onChange={(e) => setBudgetData(prev => ({ ...prev, startDate: e.target.value }))}
                                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                        disabled={!isEditingBudget}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                        تاريخ الانتهاء
                                                    </label>
                                                    <input
                                                        type="date"
                                                        value={budgetData.endDate}
                                                        onChange={(e) => setBudgetData(prev => ({ ...prev, endDate: e.target.value }))}
                                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                        min={budgetData.startDate}
                                                        disabled={!isEditingBudget}
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex gap-3">
                                                {isEditingBudget ? (
                                                    <>
                                                        <Button onClick={handleBudgetSave} size="sm">
                                                            حفظ التغييرات
                                                        </Button>
                                                        <Button onClick={() => setIsEditingBudget(false)} variant="secondary" size="sm">
                                                            إلغاء
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <Button onClick={() => setIsEditingBudget(true)} size="sm">
                                                        تعديل الميزانية
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Budget Analytics */}
                                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                                        <h3 className="font-semibold text-lg mb-4">تحليل الميزانية</h3>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                            <div className="text-center">
                                                <p className="text-2xl font-bold text-green-600">${parseFloat(campaign.insights?.spend || '0').toFixed(2)}</p>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">إجمالي الإنفاق</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-2xl font-bold text-blue-600">${campaign.budget || '0'}</p>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">الميزانية المخصصة</p>
                                            </div>
                                            <div className="text-center">
                                                <p className={`text-2xl font-bold ${getBudgetStatus().color}`}>{calculateBudgetUtilization().toFixed(1)}%</p>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">نسبة الاستخدام</p>
                                            </div>
                                        </div>

                                        {/* Budget Progress Bar */}
                                        <div className="mb-4">
                                            <div className="flex justify-between text-sm mb-1">
                                                <span>استخدام الميزانية</span>
                                                <span>{calculateBudgetUtilization().toFixed(1)}%</span>
                                            </div>
                                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                                <div 
                                                    className={`h-2 rounded-full ${
                                                        calculateBudgetUtilization() >= 90 ? 'bg-red-600' :
                                                        calculateBudgetUtilization() >= 70 ? 'bg-yellow-600' : 'bg-green-600'
                                                    }`}
                                                    style={{ width: `${Math.min(calculateBudgetUtilization(), 100)}%` }}
                                                ></div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                            <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                                                <p className="font-medium mb-1">متوسط الإنفاق اليومي</p>
                                                <p className="text-gray-600 dark:text-gray-400">
                                                    ${(parseFloat(campaign.insights?.spend || '0') / Math.max(getDaysRemaining(), 1)).toFixed(2)}
                                                </p>
                                            </div>
                                            <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                                                <p className="font-medium mb-1">الإنفاق المتبقي</p>
                                                <p className="text-gray-600 dark:text-gray-400">
                                                    ${Math.max(0, parseFloat(campaign.budget || '0') - parseFloat(campaign.insights?.spend || '0')).toFixed(2)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CampaignDetailsModal;

