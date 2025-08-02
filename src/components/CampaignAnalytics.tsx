import React, { useState } from 'react';
import KpiCard from './ui/KpiCard';
import ChartBarIcon from './icons/ChartBarIcon';
import TrendingUpIcon from './icons/ArrowUpTrayIcon';
import TrendingDownIcon from './icons/ArrowDownTrayIcon';
import ChartPieIcon from './icons/ChartPieIcon';
import UserGroupIcon from './icons/UserGroupIcon';
import CursorArrowRaysIcon from './icons/CursorArrowRaysIcon';

interface Campaign {
    id: string;
    name: string;
    status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'DELETED' | 'IN_PROCESS' | 'WITH_ISSUES';
    objective: string;
    budget?: string;
    startDate?: string;
    endDate?: string;
    insights: {
        spend?: string;
        reach?: string;
        clicks?: string;
        ctr?: string;
        cpc?: string;
        cpp?: string;
        cpm?: string;
        impressions?: string;
        actions?: string;
        cost_per_action?: string;
        frequency?: string;
    };
    performance?: {
        trend?: 'up' | 'down' | 'stable';
        change?: number;
    };
}

interface CampaignAnalyticsProps {
    campaigns: Campaign[];
}

interface PerformanceData {
    date: string;
    spend: number;
    reach: number;
    clicks: number;
    ctr: number;
}

const CampaignAnalytics: React.FC<CampaignAnalyticsProps> = ({ campaigns }) => {
    const [selectedMetric, setSelectedMetric] = useState<'spend' | 'reach' | 'clicks' | 'ctr'>('spend');
    const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');

    // Calculate performance metrics
    const totalMetrics = {
        spend: campaigns.reduce((sum, campaign) => sum + parseFloat(campaign.insights.spend || '0'), 0),
        reach: campaigns.reduce((sum, campaign) => sum + parseInt(campaign.insights.reach || '0', 10), 0),
        clicks: campaigns.reduce((sum, campaign) => sum + parseInt(campaign.insights.clicks || '0', 10), 0),
        impressions: campaigns.reduce((sum, campaign) => sum + parseInt(campaign.insights.impressions || '0', 10), 0),
        ctr: campaigns.length > 0 ? campaigns.reduce((sum, c) => sum + parseFloat(c.insights.ctr || '0'), 0) / campaigns.length : 0,
        cpc: campaigns.length > 0 ? campaigns.reduce((sum, c) => sum + parseFloat(c.insights.cpc || '0'), 0) / campaigns.length : 0,
    };

    // Calculate performance by objective
    const performanceByObjective = campaigns.reduce((acc, campaign) => {
        if (!acc[campaign.objective]) {
            acc[campaign.objective] = {
                count: 0,
                totalSpend: 0,
                totalReach: 0,
                totalClicks: 0,
                avgCtr: 0
            };
        }
        acc[campaign.objective].count++;
        acc[campaign.objective].totalSpend += parseFloat(campaign.insights.spend || '0');
        acc[campaign.objective].totalReach += parseInt(campaign.insights.reach || '0', 10);
        acc[campaign.objective].totalClicks += parseInt(campaign.insights.clicks || '0', 10);
        return acc;
    }, {} as any);

    // Calculate average CTR by objective
    Object.keys(performanceByObjective).forEach(objective => {
        const objectiveCampaigns = campaigns.filter(c => c.objective === objective);
        const avgCtr = objectiveCampaigns.reduce((sum, c) => sum + parseFloat(c.insights.ctr || '0'), 0) / objectiveCampaigns.length;
        performanceByObjective[objective].avgCtr = avgCtr;
    });

    // Generate mock trend data for demonstration
    const generateTrendData = (): PerformanceData[] => {
        const data: PerformanceData[] = [];
        const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
        
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            
            data.push({
                date: date.toISOString().split('T')[0],
                spend: Math.random() * 100 + 50,
                reach: Math.random() * 10000 + 5000,
                clicks: Math.random() * 500 + 100,
                ctr: Math.random() * 5 + 1
            });
        }
        
        return data;
    };

    const trendData = generateTrendData();

    const getMetricValue = (data: PerformanceData) => {
        switch (selectedMetric) {
            case 'spend': return data.spend;
            case 'reach': return data.reach;
            case 'clicks': return data.clicks;
            case 'ctr': return data.ctr;
            default: return data.spend;
        }
    };

    const getMetricLabel = () => {
        switch (selectedMetric) {
            case 'spend': return 'الإنفاق ($)';
            case 'reach': return 'الوصول';
            case 'clicks': return 'النقرات';
            case 'ctr': return 'CTR (%)';
            default: return 'الإنفاق ($)';
        }
    };

    const getMetricColor = () => {
        switch (selectedMetric) {
            case 'spend': return 'text-green-600';
            case 'reach': return 'text-blue-600';
            case 'clicks': return 'text-purple-600';
            case 'ctr': return 'text-orange-600';
            default: return 'text-green-600';
        }
    };

    const getObjectiveLabel = (objective: string) => {
        const labels: { [key: string]: string } = {
            'CONVERSIONS': 'التحويلات',
            'TRAFFIC': 'زيارة الموقع',
            'ENGAGEMENT': 'التفاعل',
            'LEAD_GENERATION': 'توليد العملاء',
            'SALES': 'المبيعات',
            'BRAND_AWARENESS': 'الوعي بالعلامة',
            'REACH': 'الوصول'
        };
        return labels[objective] || objective;
    };

    const maxValue = Math.max(...trendData.map(getMetricValue));
    const minValue = Math.min(...trendData.map(getMetricValue));

    return (
        <div className="space-y-6">
            {/* Performance Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard 
                    icon={<ChartBarIcon className="w-6 h-6 text-green-500" />} 
                    label="إجمالي الإنفاق" 
                    value={`$${totalMetrics.spend.toFixed(2)}`} 
                />
                <KpiCard 
                    icon={<UserGroupIcon className="w-6 h-6 text-blue-500" />} 
                    label="إجمالي الوصول" 
                    value={totalMetrics.reach.toLocaleString()} 
                />
                <KpiCard 
                    icon={<CursorArrowRaysIcon className="w-6 h-6 text-purple-500" />} 
                    label="إجمالي النقرات" 
                    value={totalMetrics.clicks.toLocaleString()} 
                />
                <KpiCard 
                    icon={<ChartPieIcon className="w-6 h-6 text-orange-500" />} 
                    label="متوسط CTR" 
                    value={`${totalMetrics.ctr.toFixed(2)}%`} 
                />
            </div>

            {/* Performance Trend Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2 sm:mb-0">
                        أداء الحملات بمرور الوقت
                    </h3>
                    <div className="flex flex-wrap gap-3">
                        <select
                            value={selectedMetric}
                            onChange={(e) => setSelectedMetric(e.target.value as any)}
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                        >
                            <option value="spend">الإنفاق</option>
                            <option value="reach">الوصول</option>
                            <option value="clicks">النقرات</option>
                            <option value="ctr">CTR</option>
                        </select>
                        <select
                            value={timeRange}
                            onChange={(e) => setTimeRange(e.target.value as any)}
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                        >
                            <option value="7d">آخر 7 أيام</option>
                            <option value="30d">آخر 30 يوم</option>
                            <option value="90d">آخر 90 يوم</option>
                        </select>
                    </div>
                </div>

                {/* Simple Bar Chart */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {getMetricLabel()}
                        </span>
                        <span className={`text-sm font-bold ${getMetricColor()}`}>
                            {selectedMetric === 'ctr' ? trendData[trendData.length - 1]?.ctr.toFixed(2) + '%' : 
                             selectedMetric === 'spend' ? '$' + trendData[trendData.length - 1]?.spend.toFixed(2) :
                             trendData[trendData.length - 1]?.[selectedMetric]?.toLocaleString()}
                        </span>
                    </div>
                    
                    <div className="grid grid-cols-7 gap-2 h-32 items-end">
                        {trendData.slice(-7).map((data, index) => {
                            const value = getMetricValue(data);
                            const height = maxValue > 0 ? ((value - minValue) / (maxValue - minValue)) * 100 : 0;
                            
                            return (
                                <div key={index} className="flex flex-col items-center flex-1">
                                    <div
                                        className={`w-full ${getMetricColor()} bg-opacity-20 rounded-t hover:bg-opacity-30 transition-colors`}
                                        style={{ height: `${Math.max(height, 5)}%` }}
                                    />
                                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
                                        {new Date(data.date).toLocaleDateString('ar', { day: 'numeric' })}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                    
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span>{minValue.toFixed(1)}</span>
                        <span>متوسط: {((maxValue + minValue) / 2).toFixed(1)}</span>
                        <span>{maxValue.toFixed(1)}</span>
                    </div>
                </div>
            </div>

            {/* Performance by Objective */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-6">
                    الأداء حسب الهدف الإعلاني
                </h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {Object.entries(performanceByObjective).map(([objective, data]: [string, any]) => (
                        <div key={objective} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                            <div className="flex justify-between items-start mb-3">
                                <h4 className="font-medium text-gray-800 dark:text-white">
                                    {getObjectiveLabel(objective)}
                                </h4>
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                    {data.count} حملة
                                </span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-gray-500 dark:text-gray-400">الإنفاق</p>
                                    <p className="font-semibold text-green-600 dark:text-green-400">
                                        ${data.totalSpend.toFixed(2)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-500 dark:text-gray-400">الوصول</p>
                                    <p className="font-semibold text-blue-600 dark:text-blue-400">
                                        {data.totalReach.toLocaleString()}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-500 dark:text-gray-400">النقرات</p>
                                    <p className="font-semibold text-purple-600 dark:text-purple-400">
                                        {data.totalClicks.toLocaleString()}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-500 dark:text-gray-400">متوسط CTR</p>
                                    <p className="font-semibold text-orange-600 dark:text-orange-400">
                                        {data.avgCtr.toFixed(2)}%
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                
                {Object.keys(performanceByObjective).length === 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        لا توجد بيانات كافية لعرض التحليل
                    </div>
                )}
            </div>

            {/* Key Insights */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-6">
                    رؤى الأداء
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUpIcon className="w-5 h-5 text-blue-600" />
                            <span className="font-medium text-blue-800 dark:text-blue-300">أعلى أداء</span>
                        </div>
                        <p className="text-sm text-blue-700 dark:text-blue-400">
                            الحملات التي تستهدف التحويلات لديها أعلى متوسط CTR بنسبة {totalMetrics.ctr.toFixed(2)}%
                        </p>
                    </div>
                    
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <ChartBarIcon className="w-5 h-5 text-green-600" />
                            <span className="font-medium text-green-800 dark:text-green-300">كفاءة التكلفة</span>
                        </div>
                        <p className="text-sm text-green-700 dark:text-green-400">
                            متوسط تكلفة النقرة: ${totalMetrics.cpc.toFixed(2)}
                        </p>
                    </div>
                    
                    <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <UserGroupIcon className="w-5 h-5 text-purple-600" />
                            <span className="font-medium text-purple-800 dark:text-purple-300">نطاق الوصول</span>
                        </div>
                        <p className="text-sm text-purple-700 dark:text-purple-400">
                            إجمالي الوصول: {totalMetrics.reach.toLocaleString()} مستخدم
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CampaignAnalytics;