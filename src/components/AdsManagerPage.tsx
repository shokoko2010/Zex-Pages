import React, { useState, useEffect } from 'react';
import { Target, Role } from '../types';
import Button from './ui/Button';
import ChartBarIcon from './icons/ChartBarIcon';
import KpiCard from './ui/KpiCard';
import ArrowUpTrayIcon from './icons/ArrowUpTrayIcon';
import UserGroupIcon from './icons/UserGroupIcon';
import CursorArrowRaysIcon from './icons/CursorArrowRaysIcon';
import PlayPauseIcon from './icons/PlayPauseIcon';
import Tooltip from './ui/Tooltip';
import CampaignDetailsModal from './CampaignDetailsModal';
import CampaignCreationModal from './CampaignCreationModal';
import CampaignAnalytics from './CampaignAnalytics';
import AudienceInsights from './AudienceInsights';
import ABTestingModal from './ABTestingModal';
import SearchIcon from './icons/SearchIcon';
import FilterIcon from './icons/QueueListIcon';
import CalendarIcon from './icons/CalendarIcon';
import PlusIcon from './icons/PlusIcon';
import ArrowDownTrayIcon from './icons/ArrowDownTrayIcon';
import SparklesIcon from './icons/SparklesIcon';
import ChartPieIcon from './icons/ChartPieIcon';
import ClockIcon from './icons/ClockIcon';
import BriefcaseIcon from './icons/BriefcaseIcon'; 

// Define a type for the campaign data
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

// Add types for sub-entities
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


interface AdsManagerPageProps {
    selectedTarget: Target | null;
    role: Role;
    campaigns: Campaign[];
    onUpdateCampaignStatus: (campaignId: string, newStatus: 'ACTIVE' | 'PAUSED') => Promise<boolean>;
    isLoading: boolean;
    onSyncCampaigns?: () => Promise<void>; // Add sync campaigns handler
    // Add the new prop
    fetchCampaignSubEntities: (campaignId: string) => Promise<{ adSets: AdSet[], ads: Ad[] }>;
}

const AdsManagerPage: React.FC<AdsManagerPageProps> = ({ selectedTarget, role, campaigns, onUpdateCampaignStatus, isLoading, onSyncCampaigns, fetchCampaignSubEntities }) => {
    const isViewer = role === 'viewer';
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedCampaignForDetails, setSelectedCampaignForDetails] = useState<Campaign | null>(null);
    const [updatingStatusCampaignId, setUpdatingStatusCampaignId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED'>('all');
    const [sortBy, setSortBy] = useState<'name' | 'spend' | 'reach' | 'ctr'>('spend');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [isCreationModalOpen, setIsCreationModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'campaigns' | 'analytics'>('campaigns');
    const [isAudienceInsightsOpen, setIsAudienceInsightsOpen] = useState(false);
    const [isABTestingOpen, setIsABTestingOpen] = useState(false);

    const handleCreateCampaign = async (campaignData: any) => {
        // This would typically call an API to create the campaign
        console.log('Creating campaign:', campaignData);
        // For now, we'll just simulate the creation
        await new Promise(resolve => setTimeout(resolve, 1000));
        // In a real implementation, this would refresh the campaigns list
    };
    
    const handleViewDetails = (campaign: Campaign) => {
        setSelectedCampaignForDetails(campaign);
        setIsDetailsModalOpen(true);
    };
    
    const handleToggleStatus = async (campaign: Campaign) => {
        if (isViewer) return;
        const newStatus = campaign.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
        setUpdatingStatusCampaignId(campaign.id);
        await onUpdateCampaignStatus(campaign.id, newStatus);
        setUpdatingStatusCampaignId(null);
    };

    const kpis = {
        totalSpend: campaigns.reduce((sum, campaign) => sum + parseFloat(campaign.insights?.spend || '0'), 0),
        totalReach: campaigns.reduce((sum, campaign) => sum + parseInt(campaign.insights?.reach || '0', 10), 0),
        totalClicks: campaigns.reduce((sum, campaign) => sum + parseInt(campaign.insights?.clicks || '0', 10), 0),
        totalImpressions: campaigns.reduce((sum, campaign) => sum + parseInt(campaign.insights?.impressions || '0', 10), 0),
        activeCampaigns: campaigns.filter(c => c.status === 'ACTIVE').length,
        avgCpc: campaigns.length > 0 ? campaigns.reduce((sum, c) => sum + parseFloat(c.insights?.cpc || '0'), 0) / campaigns.length : 0,
    };
    
    const avgCtr = campaigns.length > 0 ? campaigns.reduce((sum, c) => sum + parseFloat(c.insights?.ctr || '0'), 0) / campaigns.length : 0;

    // Filter and sort campaigns
    const filteredCampaigns = campaigns
        .filter(campaign => {
            const matchesSearch = campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              campaign.objective.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter;
            return matchesSearch && matchesStatus;
        })
        .sort((a, b) => {
            let aValue: number | string;
            let bValue: number | string;
            
            switch (sortBy) {
                case 'name':
                    aValue = a.name;
                    bValue = b.name;
                    break;
                case 'spend':
                    aValue = parseFloat(a.insights?.spend || '0');
                    bValue = parseFloat(b.insights?.spend || '0');
                    break;
                case 'reach':
                    aValue = parseInt(a.insights?.reach || '0', 10);
                    bValue = parseInt(b.insights?.reach || '0', 10);
                    break;
                case 'ctr':
                    aValue = parseFloat(a.insights?.ctr || '0');
                    bValue = parseFloat(b.insights?.ctr || '0');
                    break;
                default:
                    aValue = parseFloat(a.insights?.spend || '0');
                    bValue = parseFloat(b.insights?.spend || '0');
            }
            
            if (typeof aValue === 'string' && typeof bValue === 'string') {
                return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
            }
            
            return sortOrder === 'asc' ? (aValue as number) - (bValue as number) : (bValue as number) - (aValue as number);
        });
    
    const handleExportData = () => {
        const csvContent = [
            ['Campaign Name', 'Status', 'Objective', 'Spend', 'Reach', 'Clicks', 'CTR', 'CPC', 'Impressions'],
            ...filteredCampaigns.map(campaign => [
                campaign.name,
                campaign.status,
                campaign.objective,
                `$${parseFloat(campaign.insights?.spend || '0').toFixed(2)}`,
                parseInt(campaign.insights?.reach || '0', 10).toLocaleString(),
                parseInt(campaign.insights?.clicks || '0', 10).toLocaleString(),
                `${parseFloat(campaign.insights?.ctr || '0').toFixed(2)}%`,
                `$${parseFloat(campaign.insights?.cpc || '0').toFixed(2)}`,
                parseInt(campaign.insights?.impressions || '0', 10).toLocaleString()
            ])
        ].map(row => row.join(',')).join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `campaigns_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    const getStatusChip = (status: string) => {
        switch (status) {
            case 'ACTIVE': return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
            case 'PAUSED': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';
            case 'ARCHIVED': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
            case 'WITH_ISSUES': return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
        }
    }
    
    if (!selectedTarget) {
        return (
          <div className="p-8 text-center text-gray-500">
            <ChartBarIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-bold">مدير الإعلانات</h3>
            <p>الرجاء اختيار صفحة فيسبوك أو حساب انستغرام لعرض وإدارة الحملات الإعلانية.</p>
          </div>
        );
    }

    return (
    <>
        <CampaignDetailsModal 
            isOpen={isDetailsModalOpen}
            onClose={() => setIsDetailsModalOpen(false)}
            campaign={selectedCampaignForDetails}
            target={selectedTarget}
            fetchCampaignSubEntities={fetchCampaignSubEntities}
        />
        <CampaignCreationModal
            isOpen={isCreationModalOpen}
            onClose={() => setIsCreationModalOpen(false)}
            target={selectedTarget}
            onCreateCampaign={handleCreateCampaign}
        />
        <AudienceInsights
            isOpen={isAudienceInsightsOpen}
            onClose={() => setIsAudienceInsightsOpen(false)}
            target={selectedTarget}
            campaigns={campaigns}
        />
        <ABTestingModal
            isOpen={isABTestingOpen}
            onClose={() => setIsABTestingOpen(false)}
            target={selectedTarget}
            campaigns={campaigns}
        />
        <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-full space-y-6">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-gray-800 dark:text-white">مدير الحملات الإعلانية</h2>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">إدارة حملاتك الإعلانية ومراقبة أدائها</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <Button onClick={handleExportData} variant="outline" size="sm" className="flex items-center gap-2">
                        <ArrowDownTrayIcon className="w-4 h-4" />
                        تصدير البيانات
                    </Button>
                    {onSyncCampaigns && (
                        <Button 
                            onClick={onSyncCampaigns} 
                            disabled={isLoading}
                            variant="outline"
                            size="sm" 
                            className="flex items-center gap-2"
                        >
                            <svg className="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            مزامنة الحملات
                        </Button>
                    )}
                    <Button 
                        onClick={() => setIsCreationModalOpen(true)} 
                        disabled={isViewer} 
                        className="flex items-center gap-2"
                    >
                        <PlusIcon className="w-4 h-4" />
                        إنشاء حملة جديدة
                    </Button>
                    <Button 
                        onClick={() => setIsAudienceInsightsOpen(true)}
                        variant="outline"
                        className="flex items-center gap-2"
                    >
                        <UserGroupIcon className="w-4 h-4" />
                        رؤى الجمهور
                    </Button>
                    <Button 
                        onClick={() => setIsABTestingOpen(true)}
                        variant="outline"
                        className="flex items-center gap-2"
                    >
                        <ChartBarIcon className="w-4 h-4" />
                        اختبار A/B
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard icon={<ArrowUpTrayIcon className="w-6 h-6 text-green-500" />} label="إجمالي الإنفاق" value={`$${kpis.totalSpend.toFixed(2)}`} />
                <KpiCard icon={<UserGroupIcon className="w-6 h-6 text-blue-500" />} label="إجمالي الوصول" value={kpis.totalReach.toLocaleString()} />
                <KpiCard icon={<PlayPauseIcon isPlaying={true} className="w-6 h-6 text-yellow-500" />} label="الحملات النشطة" value={kpis.activeCampaigns.toString()} />
                <KpiCard icon={<CursorArrowRaysIcon className="w-6 h-6 text-purple-500" />} label="متوسط CTR" value={`${avgCtr.toFixed(2)}%`} />
            </div>

            {/* Additional KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard icon={<ChartPieIcon className="w-6 h-6 text-indigo-500" />} label="إجمالي النقرات" value={kpis.totalClicks.toLocaleString()} />
                <KpiCard icon={<SparklesIcon className="w-6 h-6 text-pink-500" />} label="إجمالي الظهور" value={kpis.totalImpressions.toLocaleString()} />
                <KpiCard icon={<ClockIcon className="w-6 h-6 text-orange-500" />} label="متوسط CPC" value={`$${kpis.avgCpc.toFixed(2)}`} />
                <KpiCard icon={<ChartBarIcon className="w-6 h-6 text-teal-500" />} label="عدد الحملات" value={campaigns.length.toString()} />
            </div>

            {/* Tabs */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                <div className="border-b border-gray-200 dark:border-gray-700">
                    <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
                        <button
                            onClick={() => setActiveTab('campaigns')}
                            className={`py-4 px-1 border-b-2 font-medium text-sm ${
                                activeTab === 'campaigns'
                                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <BriefcaseIcon className="w-4 h-4" />
                                الحملات
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveTab('analytics')}
                            className={`py-4 px-1 border-b-2 font-medium text-sm ${
                                activeTab === 'analytics'
                                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <ChartPieIcon className="w-4 h-4" />
                                التحليلات
                            </div>
                        </button>
                    </nav>
                </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'campaigns' ? (
                <>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                        <div className="flex flex-col lg:flex-row gap-4">
                            {/* Search */}
                            <div className="flex-1">
                                <div className="relative">
                                    <SearchIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="ابحث عن حملة..."
                                        className="w-full pr-10 pl-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                            
                            {/* Status Filter */}
                            <div className="lg:w-48">
                                <div className="relative">
                                    <FilterIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <select
                                        className="w-full pr-10 pl-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none"
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value as any)}
                                    >
                                        <option value="all">جميع الحالات</option>
                                        <option value="ACTIVE">نشطة</option>
                                        <option value="PAUSED">متوقفة</option>
                                        <option value="ARCHIVED">مؤرشفة</option>
                                    </select>
                                </div>
                            </div>
                            
                            {/* Sort */}
                            <div className="lg:w-48">
                                <select
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value as any)}
                                >
                                    <option value="spend">الإنفاق</option>
                                    <option value="reach">الوصول</option>
                                    <option value="ctr">CTR</option>
                                    <option value="name">الاسم</option>
                                </select>
                            </div>
                            
                            {/* Sort Order */}
                            <div className="lg:w-32">
                                <select
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    value={sortOrder}
                                    onChange={(e) => setSortOrder(e.target.value as any)}
                                >
                                    <option value="desc">تنازلي</option>
                                    <option value="asc">تصاعدي</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Campaigns Table */}
                    <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                    <tr>
                                        <th scope="col" className="px-6 py-3">الحملة</th>
                                        <th scope="col" className="px-6 py-3">الحالة</th>
                                        <th scope="col" className="px-6 py-3 text-center">الوصول</th>
                                        <th scope="col" className="px-6 py-3 text-center">الإنفاق</th>
                                        <th scope="col" className="px-6 py-3 text-center">CTR</th>
                                        <th scope="col" className="px-6 py-3 text-center">النقرات</th>
                                        <th scope="col" className="px-6 py-3 text-center">إجراءات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {isLoading ? (
                                        <tr><td colSpan={7} className="text-center py-8">جاري التحميل...</td></tr>
                                    ) : filteredCampaigns.length > 0 ? filteredCampaigns.map((campaign) => (
                                        <tr key={campaign.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600/50 transition-colors">
                                            <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                                                <div className="flex flex-col">
                                                    <span className="font-semibold">{campaign.name}</span>
                                                    <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">{campaign.objective.replace(/_/g, ' ')}</span>
                                                    {campaign.budget && (
                                                        <span className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                                            الميزانية: {campaign.budget}
                                                        </span>
                                                    )}
                                                </div>
                                            </th>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusChip(campaign.status)}`}>
                                                    {campaign.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex flex-col items-center">
                                                    <span className="font-medium">{parseInt(campaign.insights?.reach || '0', 10).toLocaleString()}</span>
                                                    {campaign.performance?.trend && (
                                                        <span className={`text-xs ${campaign.performance.trend === 'up' ? 'text-green-600' : campaign.performance.trend === 'down' ? 'text-red-600' : 'text-gray-600'}`}>
                                                            {campaign.performance.trend === 'up' ? '↗' : campaign.performance.trend === 'down' ? '↘' : '→'} {campaign.performance.change}%
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="font-medium text-green-600 dark:text-green-400">
                                                    ${parseFloat(campaign.insights?.spend || '0').toFixed(2)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="font-medium text-purple-600 dark:text-purple-400">
                                                    {parseFloat(campaign.insights?.ctr || '0').toFixed(2)}%
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="font-medium">
                                                    {parseInt(campaign.insights?.clicks || '0', 10).toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center space-x-2">
                                                    <Tooltip content={campaign.status === 'ACTIVE' ? 'إيقاف مؤقت' : 'تفعيل'}>
                                                        <button 
                                                            onClick={() => handleToggleStatus(campaign)} 
                                                            disabled={isViewer || updatingStatusCampaignId === campaign.id} 
                                                            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-wait transition-colors"
                                                        >
                                                            <PlayPauseIcon isPlaying={campaign.status === 'ACTIVE'} className="w-5 h-5" />
                                                        </button>
                                                    </Tooltip>
                                                    <Button 
                                                        onClick={() => handleViewDetails(campaign)} 
                                                        size="sm" 
                                                        variant="outline"
                                                        className="text-xs"
                                                    >
                                                        التفاصيل
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={7} className="text-center py-8 text-gray-500 dark:text-gray-400">
                                                {searchTerm || statusFilter !== 'all' ? 'لا توجد حملات تطابق معايير البحث.' : 'لا توجد حملات إعلانية لعرضها.'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        
                        {/* Results Summary */}
                        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700 border-t dark:border-gray-600">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                عرض {filteredCampaigns.length} من أصل {campaigns.length} حملة
                                {searchTerm && ` (بحث: "${searchTerm}")`}
                                {statusFilter !== 'all' && ` (الحالة: ${statusFilter})`}
                            </p>
                        </div>
                    </div>
                </>
            ) : (
                <CampaignAnalytics campaigns={campaigns} />
            )}
        </div>
    </>
    );
};

export default AdsManagerPage;
