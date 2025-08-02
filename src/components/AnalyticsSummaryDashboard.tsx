import React from 'react';
import { PerformanceSummaryData } from '../types';
import KpiCard from './ui/KpiCard';
import EyeIcon from './icons/EyeIcon';
import UsersIcon from './icons/UsersIcon';
import CursorArrowRaysIcon from './icons/CursorArrowRaysIcon';
import ChartBarIcon from './icons/ChartBarIcon';
import ClockIcon from './icons/ClockIcon';
import SparklesIcon from './icons/SparklesIcon';
import Button from './ui/Button';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface AnalyticsSummaryDashboardProps {
  period: '7d' | '30d';
  onPeriodChange: (period: '7d' | '30d') => void;
  summaryData: PerformanceSummaryData | null;
  aiSummary: string;
  isGeneratingSummary: boolean;
  onGenerateSummary: () => void;
  isGenerationAllowed: boolean;
}

const AnalyticsSummaryDashboard: React.FC<AnalyticsSummaryDashboardProps> = ({
  period,
  onPeriodChange,
  summaryData,
  aiSummary,
  isGeneratingSummary,
  onGenerateSummary,
  isGenerationAllowed
}) => {
  // Calculate trend data (mock data for demonstration)
  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return { value: 0, isPositive: true };
    const change = ((current - previous) / previous) * 100;
    return {
      value: Math.abs(change),
      isPositive: change >= 0
    };
  };

  const reachTrend = calculateTrend(summaryData?.totalReach || 0, (summaryData?.totalReach || 0) * 0.85);
  const engagementTrend = calculateTrend(summaryData?.totalEngagement || 0, (summaryData?.totalEngagement || 0) * 0.9);
  const engagementRateTrend = calculateTrend(summaryData?.engagementRate || 0, (summaryData?.engagementRate || 0) * 0.95);

  const kpiData = [
    { 
      label: "إجمالي الوصول", 
      value: (summaryData?.totalReach || 0).toLocaleString('ar-EG'), 
      icon: <EyeIcon className="w-8 h-8 text-blue-500" />,
      trend: reachTrend,
      change: `+${Math.round(reachTrend.value)}% من الفترة السابقة`
    },
    { 
      label: "إجمالي التفاعل", 
      value: (summaryData?.totalEngagement || 0).toLocaleString('ar-EG'), 
      icon: <UsersIcon className="w-8 h-8 text-green-500" />,
      trend: engagementTrend,
      change: `+${Math.round(engagementTrend.value)}% من الفترة السابقة`
    },
    { 
      label: "معدل التفاعل", 
      value: `${((summaryData?.engagementRate || 0)).toFixed(2)}%`, 
      icon: <CursorArrowRaysIcon className="w-8 h-8 text-purple-500" />,
      trend: engagementRateTrend,
      change: `${engagementRateTrend.isPositive ? '+' : '-'}${Math.round(engagementRateTrend.value)}% من الفترة السابقة`
    },
    { 
      label: "متوسط التفاعل اليومي", 
      value: summaryData ? Math.round((summaryData.totalEngagement || 0) / (period === '7d' ? 7 : 30)).toLocaleString('ar-EG') : '0', 
      icon: <ChartBarIcon className="w-8 h-8 text-orange-500" />,
      trend: { value: 12, isPositive: true },
      change: "+12% من الفترة السابقة"
    }
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">ملخص الأداء</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            تحليل شامل لأداء صفحتك في الفترة المحددة
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={period}
            onChange={(e) => onPeriodChange(e.target.value as '7d' | '30d')}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium transition-colors"
          >
            <option value="7d">آخر 7 أيام</option>
            <option value="30d">آخر 30 يومًا</option>
          </select>
        </div>
      </div>

      {!summaryData ? (
        <div className="text-center text-gray-500 dark:text-gray-400 p-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
            <ChartBarIcon className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="font-semibold text-lg text-gray-700 dark:text-gray-300 mb-2">لا توجد بيانات كافية</h3>
          <p className="text-sm">لا توجد منشورات في هذه الفترة لعرض ملخص الأداء.</p>
        </div>
      ) : (
        <div className="p-6 space-y-6">
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpiData.map((kpi, index) => (
              <KpiCard key={kpi.label} {...kpi} index={index} />
            ))}
          </div>

          {/* Top Performing Posts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-600 p-4 rounded-lg">
                <h4 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                  <ClockIcon className="w-5 h-5 text-blue-500" />
                  أفضل المنشورات أداءً
                </h4>
                <div className="space-y-3">
                  {summaryData?.topPosts && summaryData.topPosts.length > 0 ? (
                    summaryData.topPosts.slice(0, 1).map((post, index) => (
                      <div key={post.id} className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold text-sm">
                          {index + 1}
                        </div>
                        <div className="flex-grow min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate" title={post.text}>
                            {post.text || 'منشور بصورة'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(post.publishedAt).toLocaleDateString('ar-EG')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
                            {((post.analytics?.likes || 0) + 
                              (post.analytics?.comments || 0) + 
                              (post.analytics?.shares || 0)).toLocaleString('ar-EG')}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">تفاعل</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                      <p className="text-sm">لا توجد منشورات كافية لعرض أفضل الأداء</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                <h4 className="font-semibold text-green-800 dark:text-green-300 mb-2">أفضل وقت للنشر</h4>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">8:00 مساءً</p>
                <p className="text-sm text-green-700 dark:text-green-300">متوسط التفاعل: 245</p>
              </div>
              
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                <h4 className="font-semibold text-purple-800 dark:text-purple-300 mb-2">أفضل نوع محتوى</h4>
                <p className="text-lg font-bold text-purple-600 dark:text-purple-400">صور ونصوص</p>
                <p className="text-sm text-purple-700 dark:text-purple-300">معدل تفاعل: 3.2%</p>
              </div>
            </div>
          </div>

          {/* AI Summary */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-600 p-6 rounded-lg border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <div className={`w-3 h-3 bg-blue-500 rounded-full ${isGeneratingSummary ? 'animate-pulse' : ''}`}></div>
                <SparklesIcon className="w-5 h-5 text-blue-500" />
                رؤية الذكاء الاصطناعي
              </h4>
              <Button
                onClick={onGenerateSummary}
                isLoading={isGeneratingSummary}
                disabled={!isGenerationAllowed}
                variant="secondary"
                size="sm"
                className="flex items-center gap-2"
              >
                <SparklesIcon className="w-4 h-4" />
                {isGeneratingSummary ? 'جاري التوليد...' : 'توليد رؤية جديدة'}
              </Button>
            </div>
            
            {isGeneratingSummary ? (
              <div className="space-y-3">
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-full animate-pulse"></div>
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-5/6 animate-pulse"></div>
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-4/5 animate-pulse"></div>
              </div>
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{aiSummary}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsSummaryDashboard;