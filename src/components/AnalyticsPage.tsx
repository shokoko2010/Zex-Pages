import React, { useState, useCallback } from 'react';
import AnalyticsSummaryDashboard from './AnalyticsSummaryDashboard';
import PublishedPostsList from './PublishedPostsList';
import AudienceGrowthChart from './AudienceGrowthChart';
import ContentTypePerformanceChart from './ContentTypePerformanceChart';
import PostingTimesHeatmap from './PostingTimesHeatmap';
import AudienceDemographics from './AudienceDemographics';
import { PerformanceSummaryData, PublishedPost, AudienceGrowthData, HeatmapDataPoint, ContentTypePerformanceData, Role, Plan, Target } from '../types';
import Button from './ui/Button';
import { Download, Filter, Calendar, TrendingUp, BarChart3, Users, MapPin } from 'lucide-react';

interface AnalyticsPageProps {
  publishedPosts: PublishedPost[];
  publishedPostsLoading: boolean;
  analyticsPeriod: "7d" | "30d";
  setAnalyticsPeriod: React.Dispatch<React.SetStateAction<"7d" | "30d">>;
  performanceSummaryData: PerformanceSummaryData | null;
  performanceSummaryText: string;
  isGeneratingSummary: boolean;
  audienceGrowthData: AudienceGrowthData[];
  heatmapData: HeatmapDataPoint[];
  contentTypeData: ContentTypePerformanceData[];
  audienceCityData: { [key: string]: number };
  audienceCountryData: { [key: string]: number };
  isGeneratingDeepAnalytics: boolean;
  managedTarget: Target; 
  userPlan: Plan | null;
  currentUserRole: Role;
  onGeneratePerformanceSummary: () => void;
  onGenerateDeepAnalytics: () => void;
  onFetchPostInsights: (postId: string) => Promise<any>;
}

const AnalyticsPage: React.FC<AnalyticsPageProps> = ({
  publishedPosts,
  publishedPostsLoading,
  analyticsPeriod,
  setAnalyticsPeriod,
  performanceSummaryData,
  performanceSummaryText,
  isGeneratingSummary,
  audienceGrowthData,
  heatmapData,
  contentTypeData,
  audienceCityData,
  audienceCountryData,
  isGeneratingDeepAnalytics,
  managedTarget,
  userPlan,
  currentUserRole,
  onGeneratePerformanceSummary,
  onGenerateDeepAnalytics,
  onFetchPostInsights
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'audience' | 'content' | 'posts'>('overview');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [showExportMenu, setShowExportMenu] = useState(false);
  
  const canViewDeepAnalytics = userPlan?.limits.deepAnalytics ?? false;
  const canViewDemographics = userPlan?.limits.deepAnalytics ?? false;

  // Export functionality (mock implementation)
  const handleExport = useCallback((format: 'pdf' | 'excel' | 'csv') => {
    // Mock export functionality
    const filename = `analytics_${managedTarget.name}_${new Date().toISOString().split('T')[0]}`;
    alert(`سيتم تصدير التقرير بصيغة ${format.toUpperCase()} باسم: ${filename}.${format}`);
    setShowExportMenu(false);
  }, [managedTarget.name]);

  // Analytics tabs
  const tabs: Array<{ id: 'overview' | 'audience' | 'content' | 'posts'; label: string; icon: any }> = [
    { id: 'overview', label: 'نظرة عامة', icon: BarChart3 },
    { id: 'audience', label: 'الجمهور', icon: Users },
    { id: 'content', label: 'المحتوى', icon: TrendingUp },
    { id: 'posts', label: 'المنشورات', icon: Calendar }
  ];

  return (
    <div className="space-y-6 fade-in">
      {/* Page Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-blue-500" />
              تحليلات الصفحة
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {managedTarget.name} - تحليل شامل للأداء والجمهور
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Date Range Selector */}
            <select
              value={dateRange}
              onChange={(e) => {
                const newRange = e.target.value as '7d' | '30d' | '90d';
                setDateRange(newRange);
                // Update the parent's period if it's a compatible value
                if (newRange === '7d' || newRange === '30d') {
                  setAnalyticsPeriod(newRange);
                }
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium"
            >
              <option value="7d">آخر 7 أيام</option>
              <option value="30d">آخر 30 يومًا</option>
              <option value="90d">آخر 90 يومًا</option>
            </select>

            {/* Export Button */}
            <div className="relative">
              <Button
                onClick={() => setShowExportMenu(!showExportMenu)}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                تصدير
              </Button>
              
              {showExportMenu && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                  <button
                    onClick={() => handleExport('pdf')}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-t-lg"
                  >
                    تصدير PDF
                  </button>
                  <button
                    onClick={() => handleExport('excel')}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    تصدير Excel
                  </button>
                  <button
                    onClick={() => handleExport('csv')}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-b-lg"
                  >
                    تصدير CSV
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-6">
          <nav className="flex space-x-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors
                    ${activeTab === tab.id
                      ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <AnalyticsSummaryDashboard
            period={analyticsPeriod}
            onPeriodChange={setAnalyticsPeriod}
            summaryData={performanceSummaryData}
            aiSummary={performanceSummaryText}
            isGeneratingSummary={isGeneratingSummary}
            onGenerateSummary={onGeneratePerformanceSummary}
            isGenerationAllowed={canViewDeepAnalytics && !!performanceSummaryData}
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <AudienceGrowthChart data={audienceGrowthData} isLoading={publishedPostsLoading} />
            </div>
            <div className="lg:col-span-1">
              <PostingTimesHeatmap data={heatmapData} />
            </div>
          </div>

          <ContentTypePerformanceChart data={contentTypeData} isLoading={publishedPostsLoading} />

          {canViewDeepAnalytics && (
            <div className="text-center py-6">
              <Button 
                onClick={onGenerateDeepAnalytics} 
                isLoading={isGeneratingDeepAnalytics} 
                size="lg" 
                variant="primary"
                className="flex items-center gap-2"
              >
                <TrendingUp className="w-5 h-5" />
                تحليل معمق بالذكاء الاصطناعي
              </Button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'audience' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AudienceGrowthChart data={audienceGrowthData} isLoading={publishedPostsLoading} />
            <PostingTimesHeatmap data={heatmapData} />
          </div>

          {canViewDemographics && (
            <AudienceDemographics cityData={audienceCityData} countryData={audienceCountryData} />
          )}

          {!canViewDemographics && (
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-gray-700 dark:to-gray-600 p-8 rounded-xl text-center border border-purple-200 dark:border-purple-800">
              <MapPin className="w-16 h-16 mx-auto mb-4 text-purple-500" />
              <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                التحليل الديموغرافي متاح في الباقة المدفوعة
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                ترقِ حسابك للحصول على تحليلات ديموغرافية مفصلة عن جمهورك
              </p>
              <Button variant="primary" size="lg">
                ترقية الباقة
              </Button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'content' && (
        <div className="space-y-6">
          <ContentTypePerformanceChart data={contentTypeData} isLoading={publishedPostsLoading} />
          <PostingTimesHeatmap data={heatmapData} />
          
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              نصائح لتحسين المحتوى
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">أفضل أوقات النشر</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  انشر في الأوقات التي يتفاعل فيها جمهورك بكثافة، عادةً في المساء بين الساعة 8-10 مساءً
                </p>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <h4 className="font-semibold text-green-800 dark:text-green-300 mb-2">أنواع المحتوى</h4>
                <p className="text-sm text-green-700 dark:text-green-300">
                  الصور والنصوص تحقق أفضل تفاعل، جرب استخدام الصور عالية الجودة مع نصوص جذابة
                </p>
              </div>
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <h4 className="font-semibold text-purple-800 dark:text-purple-300 mb-2">التواصل مع الجمهور</h4>
                <p className="text-sm text-purple-700 dark:text-purple-300">
                  رد على التعليقات بسرعة واطرح أسئلة لزيادة التفاعل مع متابعيك
                </p>
              </div>
              <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                <h4 className="font-semibold text-orange-800 dark:text-orange-300 mb-2">الانتظام</h4>
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  حافظ على جدول نشر منتظم للحفاظ على تفاعل الجمهور وزيادة الوصول
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'posts' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-blue-500" />
              أداء المنشورات الفردية
            </h2>
            <PublishedPostsList
              posts={publishedPosts} 
              isLoading={publishedPostsLoading} 
              role={currentUserRole}
              onFetchInsights={onFetchPostInsights}
              isInsightsAllowed={canViewDeepAnalytics}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsPage;