import React, { useState, useEffect } from 'react';
import { Target } from '../types';
import Button from './ui/Button';
import KpiCard from './ui/KpiCard';
import XMarkIcon from './icons/XMarkIcon';

interface Campaign {
    id: string;
    name: string;
    status: string;
    objective: string;
    insights: any;
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
    const [activeTab, setActiveTab] = useState<'adsets' | 'ads'>('adsets');
    const [adSets, setAdSets] = useState<AdSet[]>([]);
    const [ads, setAds] = useState<Ad[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen && campaign) {
            setIsLoading(true);
            fetchCampaignSubEntities(campaign.id)
                .then(data => {
                    setAdSets(data.adSets);
                    setAds(data.ads);
                })
                .catch(console.error)
                .finally(() => setIsLoading(false));
        }
    }, [isOpen, campaign, fetchCampaignSubEntities]);
    
    if (!isOpen || !campaign) return null;

    const renderInsights = (insights: any, prefix = '') => (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mt-2 text-center">
            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded">
                <p className="font-bold text-gray-800 dark:text-white">${parseFloat(insights?.[prefix + 'spend'] || '0').toFixed(2)}</p>
                <p className="text-gray-500 dark:text-gray-400">الإنفاق</p>
            </div>
            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded">
                <p className="font-bold text-gray-800 dark:text-white">{parseInt(insights?.[prefix + 'reach'] || '0').toLocaleString()}</p>
                <p className="text-gray-500 dark:text-gray-400">الوصول</p>
            </div>
            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded">
                <p className="font-bold text-gray-800 dark:text-white">{parseInt(insights?.[prefix + 'clicks'] || '0').toLocaleString()}</p>
                <p className="text-gray-500 dark:text-gray-400">النقرات</p>
            </div>
            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded">
                <p className="font-bold text-gray-800 dark:text-white">{parseFloat(insights?.[prefix + 'ctr'] || '0').toFixed(2)}%</p>
                <p className="text-gray-500 dark:text-gray-400">CTR</p>
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
                                    <TabButton active={activeTab === 'adsets'} onClick={() => setActiveTab('adsets')}>المجموعات الإعلانية ({adSets.length})</TabButton>
                                    <TabButton active={activeTab === 'ads'} onClick={() => setActiveTab('ads')}>الإعلانات ({ads.length})</TabButton>
                                </nav>
                            </div>

                            {activeTab === 'adsets' && (
                                <ul className="space-y-3">
                                    {adSets.map(adSet => (
                                        <li key={adSet.id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                            <h4 className="font-semibold">{adSet.name} - <span className="text-sm font-normal">{adSet.status}</span></h4>
                                            {renderInsights(adSet.insights)}
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
                                                    {renderInsights(ad.insights)}
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CampaignDetailsModal;

