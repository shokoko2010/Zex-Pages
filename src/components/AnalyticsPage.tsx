
import React from 'react';
import AnalyticsSummaryDashboard from './AnalyticsSummaryDashboard';
import PublishedPostsList from './PublishedPostsList';
import AudienceGrowthChart from './AudienceGrowthChart';
import ContentTypePerformanceChart from './ContentTypePerformanceChart';
import PostingTimesHeatmap from './PostingTimesHeatmap';
import AudienceDemographics from './AudienceDemographics';
import { PerformanceSummaryData, PublishedPost, AudienceGrowthData, HeatmapDataPoint, ContentTypePerformanceData, Role, Plan, Target } from '../types';
import Button from './ui/Button';

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
  audienceCityData: { [key: string]: number }; // Add this line
  audienceCountryData: { [key: string]: number }; // Add this line
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
  audienceCityData, // Receive this prop
  audienceCountryData, // Receive this prop
  isGeneratingDeepAnalytics,
  userPlan,
  currentUserRole,
  onGeneratePerformanceSummary,
  onGenerateDeepAnalytics,
  onFetchPostInsights
}) => {
  const canViewDeepAnalytics = userPlan?.limits.deepAnalytics ?? false;

  return (
    <div className="space-y-8 fade-in">
      <AnalyticsSummaryDashboard
        period={analyticsPeriod}
        onPeriodChange={setAnalyticsPeriod}
        summaryData={performanceSummaryData}
        aiSummary={performanceSummaryText}
        isGeneratingSummary={isGeneratingSummary}
        onGenerateSummary={onGeneratePerformanceSummary}
        isGenerationAllowed={canViewDeepAnalytics && !!performanceSummaryData}
      />
      
      <AudienceDemographics cityData={audienceCityData} countryData={audienceCountryData} />


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
            <Button onClick={onGenerateDeepAnalytics} isLoading={isGeneratingDeepAnalytics} size="lg" variant="primary">
                تحليل معمق بالذكاء الاصطناعي
            </Button>
        </div>
      )}

      <div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
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
  );
};

export default AnalyticsPage;
