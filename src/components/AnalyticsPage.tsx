import React, { useState } from 'react';
import AnalyticsSummaryDashboard from './AnalyticsSummaryDashboard';
import PublishedPostsList from './PublishedPostsList';
import AudienceGrowthChart from './AudienceGrowthChart';
import ContentTypePerformanceChart from './ContentTypePerformanceChart';
import { PerformanceSummaryData, PublishedPost, AudienceGrowthData, HeatmapDataPoint, ContentTypePerformanceData, Role, Plan, PostAnalytics } from '../types';

interface AnalyticsPageProps {
  publishedPosts: PublishedPost[];
  publishedPostsLoading: boolean;
  analyticsPeriod: "7d" | "30d";
  setAnalyticsPeriod: React.Dispatch<React.SetStateAction<"7d" | "30d">>;
  performanceSummaryText: string;
  setPerformanceSummaryText: React.Dispatch<React.SetStateAction<string>>; 
  isGeneratingSummary: boolean;
  setIsGeneratingSummary: React.Dispatch<React.SetStateAction<boolean>>; 
  audienceGrowthData: AudienceGrowthData[];
  setAudienceGrowthData: React.Dispatch<React.SetStateAction<AudienceGrowthData[]>>; 
  heatmapData: HeatmapDataPoint[];
  setHeatmapData: React.Dispatch<React.SetStateAction<HeatmapDataPoint[]>>; 
  contentTypeData: ContentTypePerformanceData[];
  setContentTypePerformanceData: React.Dispatch<React.SetStateAction<ContentTypePerformanceData[]>>; 
  isGeneratingDeepAnalytics: boolean;
  setIsGeneratingDeepAnalytics: React.Dispatch<React.SetStateAction<boolean>>; 
  managedTarget: any; // You might want to define a proper type for this
  userPlan: Plan | null;
  isSimulationMode: boolean;
  aiClient: any; // You might want to define a proper type for this
  pageProfile: any; // You might want to define a proper type for this
  currentUserRole: Role;
  showNotification: (type: 'success' | 'error' | 'partial', message: string, onUndo?: () => void) => void;
  generatePerformanceSummary: (ai: any, summaryData: PerformanceSummaryData, pageProfile: any, period: "7d" | "30d") => Promise<string>; 
  generatePostInsights: (ai: any, postText: string, analytics: PostAnalytics, comments: { message: string; }[]) => Promise<{ performanceSummary: string; sentiment: { positive: number; negative: number; neutral: number; }; }>; 
  generateOptimalSchedule: (ai: any, pageProfile: any, publishedPosts: PublishedPost[]) => Promise<any>; // Define return type
  generateBestPostingTimesHeatmap: (ai: any, posts: PublishedPost[]) => Promise<HeatmapDataPoint[]>;
  generateContentTypePerformance: (ai: any, posts: PublishedPost[]) => Promise<ContentTypePerformanceData[]>;
}

const AnalyticsPage: React.FC<AnalyticsPageProps> = ({
  publishedPosts,
  publishedPostsLoading,
  analyticsPeriod,
  setAnalyticsPeriod,
  performanceSummaryText,
  setPerformanceSummaryText,
  isGeneratingSummary,
  setIsGeneratingSummary,
  audienceGrowthData,
  setAudienceGrowthData,
  heatmapData,
  setHeatmapData,
  contentTypeData,
  setContentTypePerformanceData,
  isGeneratingDeepAnalytics,
  setIsGeneratingDeepAnalytics,
  managedTarget,
  userPlan,
  isSimulationMode,
  aiClient,
  pageProfile,
  currentUserRole,
  showNotification,
  generatePerformanceSummary,
  generatePostInsights,
  generateOptimalSchedule,
  generateBestPostingTimesHeatmap,
  generateContentTypePerformance,
}) => {
  const canViewDeepAnalytics = userPlan?.limits.deepAnalytics ?? false;

  return (
    <div className="space-y-8 fade-in">
      {/* AnalyticsSummaryDashboard expects period, onPeriodChange, summaryData, aiSummary */}
      <AnalyticsSummaryDashboard
        period={analyticsPeriod} // Using analyticsPeriod
        onPeriodChange={setAnalyticsPeriod} // Using setAnalyticsPeriod
        summaryData={null} // summaryData is not passed, using null or fetching here
        aiSummary={performanceSummaryText} // Using performanceSummaryText
        isGeneratingSummary={isGeneratingSummary}
      />

      <AudienceGrowthChart data={audienceGrowthData} isLoading={publishedPostsLoading} /> 

      {/* EngagementHeatmap and DeepAnalyticsSection removed due to missing files */}
      {/* <EngagementHeatmap data={heatmapData} isLoading={publishedPostsLoading} /> */}

      <ContentTypePerformanceChart data={contentTypeData} isLoading={publishedPostsLoading} /> 

      {canViewDeepAnalytics && (
        // DeepAnalyticsSection was removed, this block is commented out
        <>
        {/*
        <DeepAnalyticsSection
          publishedPosts={publishedPosts}
          publishedPostsLoading={publishedPostsLoading}
          onFetchAnalytics={onFetchAnalytics} 
          onGenerateInsights={onGenerateInsights} 
          isGeneratingDeepAnalytics={isGeneratingDeepAnalytics}
          role={currentUserRole} 
        />
        */}
        </>
      )}

      <div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
          أداء المنشورات الفردية
        </h2>
        <PublishedPostsList
          posts={publishedPosts} 
          isLoading={publishedPostsLoading} 
          role={currentUserRole} 
        />
      </div>
    </div>
  );
};

export default AnalyticsPage;
