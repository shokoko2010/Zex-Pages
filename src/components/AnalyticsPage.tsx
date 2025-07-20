

import React from 'react';
import { PerformanceSummaryData, PublishedPost, Role, Plan, AudienceGrowthData, HeatmapDataPoint, ContentTypePerformanceData } from '../types';
import AnalyticsSummaryDashboard from './AnalyticsSummaryDashboard';
import PublishedPostsList from './PublishedPostsList';
import AudienceGrowthChart from './AudienceGrowthChart';
import PostingTimesHeatmap from './PostingTimesHeatmap';
import ContentTypePerformanceChart from './ContentTypePerformanceChart';
import BrainCircuitIcon from './icons/BrainCircuitIcon';

interface AnalyticsPageProps {
  period: '7d' | '30d';
  onPeriodChange: (period: '7d' | '30d') => void;
  summaryData: PerformanceSummaryData | null;
  aiSummary: string;
  isGeneratingSummary: boolean;
  posts: PublishedPost[];
  isLoading: boolean;
  onFetchAnalytics: (postId: string) => void;
  onGenerateInsights: (postId: string) => void;
  role: Role;
  userPlan: Plan | null;
  audienceGrowthData: AudienceGrowthData[];
  heatmapData: HeatmapDataPoint[];
  contentTypeData: ContentTypePerformanceData[];
  isGeneratingDeepAnalytics: boolean;
  publishedPosts: PublishedPost[];
  publishedPostsLoading: boolean;
}

const AnalyticsPage: React.FC<AnalyticsPageProps> = ({
  period,
  onPeriodChange,
  summaryData,
  aiSummary,
  isGeneratingSummary,
  posts,
  isLoading,
  onFetchAnalytics,
  onGenerateInsights,
  role,
  userPlan,
  audienceGrowthData,
  heatmapData,
  contentTypeData,
  isGeneratingDeepAnalytics,
  publishedPosts,
  publishedPostsLoading,
}) => {
  const canViewDeepAnalytics = userPlan?.limits.deepAnalytics ?? false;

  return (
    <div className="space-y-8 fade-in">
      <AnalyticsSummaryDashboard
        period={period}
        onPeriodChange={onPeriodChange}
        summaryData={summaryData}
        aiSummary={aiSummary}
        isGeneratingSummary={isGeneratingSummary}
      />

      {canViewDeepAnalytics ? (
        <div className="space-y-8">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <BrainCircuitIcon className="w-7 h-7 text-blue-500"/>
              التحليلات العميقة بالذكاء الاصطناعي
            </h2>
            {isGeneratingDeepAnalytics ? (
                 <div className="text-center p-8 border-2 border-dashed rounded-lg">
                    <p>جاري توليد التحليلات العميقة...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <AudienceGrowthChart data={audienceGrowthData} />
                    <PostingTimesHeatmap data={heatmapData} />
                    <div className="lg:col-span-2">
                        <ContentTypePerformanceChart data={contentTypeData} />
                    </div>
                </div>
            )}
        </div>
      ) : (
         <div className="text-center text-gray-500 dark:text-gray-400 p-8 border-2 border-dashed rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <h3 className="font-semibold text-xl text-gray-700 dark:text-gray-300 mb-2">🚀 طور تحليلاتك!</h3>
            <p>ميزة التحليلات العميقة (نمو الجمهور، أفضل أوقات النشر، أداء أنواع المحتوى) متاحة في الخطط الأعلى.</p>
            <p>قم بترقية خطتك للحصول على رؤى أقوى تساعدك على النمو.</p>
        </div>
      )}

      <div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
          أداء المنشورات الفردية
        </h2>
        <PublishedPostsList
          posts={posts}
          isLoading={isLoading}
          onFetchAnalytics={onFetchAnalytics}
          onGenerateInsights={onGenerateInsights}
          role={role}
        />
      </div>
    </div>
  );
};

export default AnalyticsPage;
