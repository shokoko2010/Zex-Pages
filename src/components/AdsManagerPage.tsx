import React, { useState } from 'react';
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

// Define a type for the campaign data
interface Campaign {
    id: string;
    name: string;
    status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'DELETED' | 'IN_PROCESS' | 'WITH_ISSUES';
    objective: string;
    insights: {
        spend?: string;
        reach?: string;
        clicks?: string;
        ctr?: string;
        cpc?: string;
        cpp?: string;
        cpm?: string;
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
    // Add the new prop
    fetchCampaignSubEntities: (campaignId: string) => Promise<{ adSets: AdSet[], ads: Ad[] }>;
}

const AdsManagerPage: React.FC<AdsManagerPageProps> = ({ selectedTarget, role, campaigns, onUpdateCampaignStatus, isLoading, fetchCampaignSubEntities }) => {
    const isViewer = role === 'viewer';
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedCampaignForDetails, setSelectedCampaignForDetails] = useState<Campaign | null>(null);
    const [updatingStatusCampaignId, setUpdatingStatusCampaignId] = useState<string | null>(null);

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
        totalSpend: campaigns.reduce((sum, campaign) => sum + parseFloat(campaign.insights.spend || '0'), 0),
        totalReach: campaigns.reduce((sum, campaign) => sum + parseInt(campaign.insights.reach || '0', 10), 0),
        totalClicks: campaigns.reduce((sum, campaign) => sum + parseInt(campaign.insights.clicks || '0', 10), 0),
        activeCampaigns: campaigns.filter(c => c.status === 'ACTIVE').length,
    };
    
    const avgCtr = campaigns.length > 0 ? campaigns.reduce((sum, c) => sum + parseFloat(c.insights.ctr || '0'), 0) / campaigns.length : 0;

    const getStatusChip = (status: string) => {
        switch (status) {
            case 'ACTIVE': return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
            case 'PAUSED': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';
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
        <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-full space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-gray-800 dark:text-white">مدير الحملات الإعلانية</h2>
                <Button disabled={isViewer}>
                    إنشاء حملة جديدة
                </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard icon={<ArrowUpTrayIcon className="w-6 h-6 text-green-500" />} label="إجمالي الإنفاق" value={`$${kpis.totalSpend.toFixed(2)}`} />
                <KpiCard icon={<UserGroupIcon className="w-6 h-6 text-blue-500" />} label="إجمالي الوصول" value={kpis.totalReach.toLocaleString()} />
                <KpiCard icon={<PlayPauseIcon isPlaying={true} className="w-6 h-6 text-yellow-500" />} label="الحملات النشطة" value={kpis.activeCampaigns.toString()} />
                <KpiCard icon={<CursorArrowRaysIcon className="w-6 h-6 text-purple-500" />} label="متوسط CTR" value={`${avgCtr.toFixed(2)}%`} />
            </div>

            <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                        <tr>
                            <th scope="col" className="px-6 py-3">الحملة</th>
                            <th scope="col" className="px-6 py-3">الحالة</th>
                            <th scope="col" className="px-6 py-3 text-center">الوصول</th>
                            <th scope="col" className="px-6 py-3 text-center">الإنفاق</th>
                            <th scope="col" className="px-6 py-3 text-center">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan={5} className="text-center py-8">جاري التحميل...</td></tr>
                        ) : campaigns.length > 0 ? campaigns.map((campaign) => (
                            <tr key={campaign.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600/50">
                                <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                                    <div className="flex flex-col">
                                        <span>{campaign.name}</span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">{campaign.objective.replace(/_/g, ' ')}</span>
                                    </div>
                                </th>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusChip(campaign.status)}`}>
                                        {campaign.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center">{parseInt(campaign.insights.reach || '0', 10).toLocaleString()}</td>
                                <td className="px-6 py-4 text-center">${parseFloat(campaign.insights.spend || '0').toFixed(2)}</td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex items-center justify-center space-x-2">
                                        <Tooltip content={campaign.status === 'ACTIVE' ? 'إيقاف مؤقت' : 'تفعيل'}>
                                            <button onClick={() => handleToggleStatus(campaign)} disabled={isViewer || updatingStatusCampaignId === campaign.id} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-wait">
                                                <PlayPauseIcon isPlaying={campaign.status === 'ACTIVE'} className="w-5 h-5" />
                                            </button>
                                        </Tooltip>
                                        <Button onClick={() => handleViewDetails(campaign)} size="sm" variant="outline">
                                            عرض التفاصيل
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={5} className="text-center py-8 text-gray-500 dark:text-gray-400">
                                    لا توجد حملات إعلانية لعرضها.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    </>
    );
};

export default AdsManagerPage;
