
import React, { useState } from 'react';
import { Target, Role } from '../types';
import Button from './ui/Button';
import ChartBarIcon from './icons/ChartBarIcon';
import KpiCard from './ui/KpiCard';
import ArrowUpTrayIcon from './icons/ArrowUpTrayIcon';
import HandThumbUpIcon from './icons/HandThumbUpIcon';
import UserGroupIcon from './icons/UserGroupIcon';
import CursorArrowRaysIcon from './icons/CursorArrowRaysIcon';

// بيانات وهمية مؤقتة
const mockCampaigns = [
  { id: 'C1', name: 'حملة رمضان 2024', status: 'Active', spend: 500, results: '1,200 تفاعل', reach: 25000, platform: 'facebook' },
  { id: 'C2', name: 'تخفيضات نهاية الأسبوع', status: 'Completed', spend: 300, results: '800 نقرة', reach: 15000, platform: 'instagram' },
  { id: 'C3', name: 'إطلاق المنتج الجديد', status: 'Paused', spend: 150, results: '300 تسجيل', reach: 8000, platform: 'facebook' },
  { id: 'C4', name: 'زيادة الوعي بالعلامة التجارية', status: 'Active', spend: 800, results: '50,000 ظهور', reach: 120000, platform: 'instagram' },
];

const mockKpis = {
    totalSpend: { value: 1750, label: 'إجمالي الإنفاق', unit: '$' },
    totalReach: { value: 168000, label: 'إجمالي الوصول' },
    activeCampaigns: { value: 2, label: 'الحملات النشطة' },
    ctr: { value: 2.5, label: 'نسبة النقر إلى الظهور', unit: '%' }
}

interface AdsManagerPageProps {
  selectedTarget: Target | null;
  role: Role;
}

const AdsManagerPage: React.FC<AdsManagerPageProps> = ({ selectedTarget, role }) => {
  const [campaigns, setCampaigns] = useState(mockCampaigns);
  const isViewer = role === 'viewer';

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
        case 'Active': return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
        case 'Completed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300';
        case 'Paused': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';
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
          <KpiCard icon={<ArrowUpTrayIcon className="w-6 h-6 text-green-500" />} label={mockKpis.totalSpend.label} value={`${mockKpis.totalSpend.value}${mockKpis.totalSpend.unit}`} />
          <KpiCard icon={<UserGroupIcon className="w-6 h-6 text-blue-500" />} label={mockKpis.totalReach.label} value={mockKpis.totalReach.value.toLocaleString()} />
          <KpiCard icon={<HandThumbUpIcon className="w-6 h-6 text-yellow-500" />} label={mockKpis.activeCampaigns.label} value={mockKpis.activeCampaigns.value.toString()} />
          <KpiCard icon={<CursorArrowRaysIcon className="w-6 h-6 text-purple-500" />} label={mockKpis.ctr.label} value={`${mockKpis.ctr.value}${mockKpis.ctr.unit}`} />
      </div>

      {/* Campaigns Table */}
      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th scope="col" className="px-6 py-3">اسم الحملة</th>
              <th scope="col" className="px-6 py-3">الحالة</th>
              <th scope="col" className="px-6 py-3">المنصة</th>
              <th scope="col" className="px-6 py-3 text-center">الإنفاق</th>
              <th scope="col" className="px-6 py-3 text-center">الوصول</th>
              <th scope="col" className="px-6 py-3 text-center">النتيجة</th>
              <th scope="col" className="px-6 py-3"><span className="sr-only">إجراءات</span></th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((campaign) => (
              <tr key={campaign.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600/50">
                <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                  {campaign.name}
                </th>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusChip(campaign.status)}`}>
                    {campaign.status}
                  </span>
                </td>
                <td className="px-6 py-4 capitalize">{campaign.platform}</td>
                <td className="px-6 py-4 text-center">${campaign.spend.toFixed(2)}</td>
                <td className="px-6 py-4 text-center">{campaign.reach.toLocaleString()}</td>
                <td className="px-6 py-4 text-center">{campaign.results}</td>
                <td className="px-6 py-4 text-right">
                  <a href="#" className="font-medium text-blue-600 dark:text-blue-500 hover:underline">عرض التفاصيل</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
       <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-4">
            ملاحظة: هذه واجهة أولية. سيتم ربطها ببيانات الإعلانات الحقيقية قريباً.
        </p>
    </div>
  );
};

export default AdsManagerPage;
