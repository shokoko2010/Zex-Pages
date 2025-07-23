
import React, { useMemo } from 'react';
import { AppUser, Plan } from '../types';
import KpiCard from './ui/KpiCard';
import UsersIcon from './icons/UsersIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import ChartPieIcon from './icons/ChartPieIcon'; // Using this for MRR
import UserGroupIcon from './icons/UserGroupIcon'; // Using this for New Users

interface AdminAnalyticsPageProps {
  users: AppUser[];
  plans: Plan[];
}

const AdminAnalyticsPage: React.FC<AdminAnalyticsPageProps> = ({ users, plans }) => {

  const {
    totalUsers,
    activeSubscriptions,
    monthlyRecurringRevenue,
    newUsersLast30Days,
    subscriptionsPerPlan
  } = useMemo(() => {
    const plansMap = new Map<string, Plan>(plans.map(p => [p.id, p]));
    
    // Total Users
    const totalUsers = users.length;
    
    // Active Subscriptions
    const activeSubscriptions = users.filter(u => u.planId !== 'free').length;
    
    // MRR
    const monthlyRecurringRevenue = users.reduce((total, user) => {
      const plan = plansMap.get(user.planId || 'free');
      if (plan && typeof plan.price === 'number' && plan.price > 0) {
        if (plan.pricePeriod === 'annual') {
          return total + (plan.price / 12);
        }
        if (plan.pricePeriod === 'monthly') {
          return total + plan.price;
        }
      }
      return total;
    }, 0);

    // New Users in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newUsersLast30Days = users.filter(u => u.createdAt && new Date(u.createdAt) > thirtyDaysAgo).length;

    // Subscriptions per plan
    const subscriptionsPerPlan = users.reduce<Record<string, number>>((acc, user) => {
      const plan = plansMap.get(user.planId || 'free');
      const planName = plan?.name || 'غير معروف';
      acc[planName] = (acc[planName] || 0) + 1;
      return acc;
    }, {});

    return { totalUsers, activeSubscriptions, monthlyRecurringRevenue, newUsersLast30Days, subscriptionsPerPlan };
  }, [users, plans]);
  
  const maxSubsInPlan = useMemo(() => {
    const counts = Object.values(subscriptionsPerPlan);
    return Math.max(1, ...counts);
  }, [subscriptionsPerPlan]);


  return (
    <div className="space-y-8 fade-in">
      <h1 className="text-3xl font-bold">التحليلات العامة للمنصة</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard icon={<UsersIcon className="w-8 h-8 text-blue-500" />} label="إجمالي المستخدمين" value={totalUsers.toLocaleString('ar-EG')} />
        <KpiCard icon={<CheckCircleIcon className="w-8 h-8 text-green-500" />} label="الاشتراكات النشطة" value={activeSubscriptions.toLocaleString('ar-EG')} />
        <KpiCard icon={<ChartPieIcon className="w-8 h-8 text-purple-500" />} label="الإيرادات الشهرية (MRR)" value={`${monthlyRecurringRevenue.toFixed(2)} ر.س`} />
        <KpiCard icon={<UserGroupIcon className="w-8 h-8 text-yellow-500" />} label="مستخدمون جدد (آخر 30 يوم)" value={newUsersLast30Days.toLocaleString('ar-EG')} />
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">توزيع الاشتراكات على الخطط</h2>
        <div className="space-y-4">
          {Object.entries(subscriptionsPerPlan).sort(([, a], [, b]) => b - a).map(([planName, count]) => (
            <div key={planName}>
                <div className="flex justify-between mb-1">
                    <span className="text-base font-medium text-gray-700 dark:text-gray-300">{planName}</span>
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-400">{count.toLocaleString('ar-EG')} مشترك</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4 dark:bg-gray-700">
                    <div 
                        className="bg-blue-600 h-4 rounded-full" 
                        style={{ width: `${(count / maxSubsInPlan) * 100}%`, transition: 'width 0.5s ease-in-out' }}
                    ></div>
                </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminAnalyticsPage;
