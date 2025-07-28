import React, { useState, useEffect } from 'react';
import { Target, Role } from '../types';
import Button from './ui/Button';
import ChartBarIcon from './icons/ChartBarIcon';
import KpiCard from './ui/KpiCard';
import ArrowUpTrayIcon from './icons/ArrowUpTrayIcon';
import HandThumbUpIcon from './icons/HandThumbUpIcon';
import UserGroupIcon from './icons/UserGroupIcon';
import CursorArrowRaysIcon from './icons/CursorArrowRaysIcon';

// Define a type for the campaign data
interface Campaign {
    id: string;
    name: string;
    status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'DELETED' | 'IN_PROCESS' | 'WITH_ISSUES';
    spend: string; // Spend is returned as a string
    reach: string; // Reach is also a string
    objective: string;
}

interface AdsManagerPageProps {
  selectedTarget: Target | null;
  role: Role;
  campaigns: Campaign[]; // Use the defined Campaign type
}

const AdsManagerPage: React.FC<AdsManagerPageProps> = ({ selectedTarget, role, campaigns }) => {
  const isViewer = role === 'viewer';

  // Calculate KPIs from the fetched campaign data
  const kpis = {
      totalSpend: campaigns.reduce((sum, campaign) => sum + parseFloat(campaign.spend || '0'), 0),
      totalReach: campaigns.reduce((sum, campaign) => sum + parseInt(campaign.reach || '0', 10), 0),
      activeCampaigns: campaigns.filter(c => c.status === 'ACTIVE').length,
      // CTR would require more detailed insights data (clicks, impressions)
      ctr: { value: 0, label: 'نسبة النقر إلى الظهور', unit: '%' } 
  };

  if (!selectedTarget) {
    return (
      <div className="p-8 text-center text-gray-500">
        <ChartBarIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        <h3 className="text-xl font-bold">مدير الإعلانات</h3>
        <p>الرجاء اختيار صفحة فيسبوك أو حساب انستغرام لعرض وإدارة الحملات الإعلانية.</p>
      </div>
    );
  }

  const getStatusChip = (status: string) => {
    switch (status) {
        case 'ACTIVE': return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
        case 'PAUSED': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';
        default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  }

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-full space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-800 dark:text-white">مدير الحملات الإعلانية</h2>
        <Button disabled={isViewer}>
          إنشاء حملة جديدة
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon={<ArrowUpTrayIcon className="w-6 h-6 text-green-500" />} label="إجمالي الإنفاق" value={`$${kpis.totalSpend.toFixed(2)}`} />
          <KpiCard icon={<UserGroupIcon className="w-6 h-6 text-blue-500" />} label="إجمالي الوصول" value={kpis.totalReach.toLocaleString()} />
          <KpiCard icon={<HandThumbUpIcon className="w-6 h-6 text-yellow-500" />} label="الحملات النشطة" value={kpis.activeCampaigns.toString()} />
          <KpiCard icon={<CursorArrowRaysIcon className="w-6 h-6 text-purple-500" />} label={kpis.ctr.label} value={`${kpis.ctr.value}${kpis.ctr.unit}`} />
      </div>

      {/* Campaigns Table */}
      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th scope="col" className="px-6 py-3">اسم الحملة</th>
              <th scope="col" className="px-6 py-3">الحالة</th>
              <th scope="col" className="px-6 py-3">الهدف</th>
              <th scope="col" className="px-6 py-3 text-center">الإنفاق</th>
              <th scope="col" className="px-6 py-3 text-center">الوصول</th>
              <th scope="col" className="px-6 py-3"><span className="sr-only">إجراءات</span></th>
            </tr>
          </thead>
          <tbody>
            {campaigns.length > 0 ? campaigns.map((campaign) => (
              <tr key={campaign.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600/50">
                <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                  {campaign.name}
                </th>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusChip(campaign.status)}`}>
                    {campaign.status}
                  </span>
                </td>
                <td className="px-6 py-4 capitalize">{campaign.objective}</td>
                <td className="px-6 py-4 text-center">${parseFloat(campaign.spend || '0').toFixed(2)}</td>
                <td className="px-6 py-4 text-center">{parseInt(campaign.reach || '0', 10).toLocaleString()}</td>
                <td className="px-6 py-4 text-right">
                  <a href="#" className="font-medium text-blue-600 dark:text-blue-500 hover:underline">عرض التفاصيل</a>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-500 dark:text-gray-400">
                  لا توجد حملات إعلانية لعرضها.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdsManagerPage;
