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
  setPerformanceSummaryText: React.Dispatch<React.SetStateAction<string>>; // Added this line
  isGeneratingSummary: boolean;
  setIsGeneratingSummary: React.Dispatch<React.SetStateAction<boolean>>; // Added this line
  audienceGrowthData: AudienceGrowthData[];
  setAudienceGrowthData: React.Dispatch<React.SetStateAction<AudienceGrowthData[]>>; // Added this line
  heatmapData: HeatmapDataPoint[];
  setHeatmapData: React.Dispatch<React.SetStateAction<HeatmapDataPoint[]>>; // Added this line
  contentTypeData: ContentTypePerformanceData[];
  setContentTypePerformanceData: React.Dispatch<React.SetStateAction<ContentTypePerformanceData[]>>; // Added this line
  isGeneratingDeepAnalytics: boolean;
  setIsGeneratingDeepAnalytics: React.Dispatch<React.SetStateAction<boolean>>; // Added this line
  managedTarget: any; // You might want to define a proper type for this
  userPlan: Plan | null;
  isSimulationMode: boolean;
  aiClient: any; // You might want to define a proper type for this
  pageProfile: any; // You might want to define a proper type for this
  currentUserRole: Role;
  showNotification: (type: 'success' | 'error' | 'partial', message: string, onUndo?: () => void) => void;
  generatePerformanceSummary: (ai: any, summaryData: PerformanceSummaryData | null, pageProfile: any, period: "7d" | "30d") => Promise<string>; // Updated signature
  generatePostInsights: (ai: any, post: PublishedPost, comments: { message: string; }[]) => Promise<{ performanceSummary: string; sentiment: { positive: number; negative: number; neutral: number; }; }>; // Updated signature
  generateOptimalSchedule: (ai: any, pageProfile: any, publishedPosts: PublishedPost[]) => Promise<any>; // Define return type
  generateBestPostingTimesHeatmap: (ai: any, posts: PublishedPost[]) => Promise<HeatmapDataPoint[]>;
  generateContentTypePerformance: (ai: any, posts: PublishedPost[]) => Promise<ContentTypePerformanceData[]>;
  // Props that were in AnalyticsPageProps but not passed from DashboardPage are removed
  // period
  // onPeriodChange
  // summaryData
  // aiSummary
  // posts
  // isLoading
  // onFetchAnalytics
  // onGenerateInsights
  // role
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

  // You may need to adjust how these props are used within AnalyticsPage
  // For example, if summaryData and aiSummary were used directly, 
  // you might need to derive them from the data passed or fetch them here.

  return (
    <div className="space-y-8 fade-in">
      {/* AnalyticsSummaryDashboard might need adjustments based on missing props */}
      <AnalyticsSummaryDashboard
        // period={period} // Removed prop
        // onPeriodChange={onPeriodChange} // Removed prop
        // summaryData={summaryData} // Removed prop
        // aiSummary={aiSummary} // Removed prop
        isGeneratingSummary={isGeneratingSummary}
      />

      <AudienceGrowthChart data={audienceGrowthData} isLoading={publishedPostsLoading} /> {/* Using publishedPostsLoading as isLoading */}

      {/* EngagementHeatmap and DeepAnalyticsSection removed due to missing files */}
      {/* <EngagementHeatmap data={heatmapData} isLoading={publishedPostsLoading} /> */}

      <ContentTypePerformanceChart data={contentTypeData} isLoading={publishedPostsLoading} /> {/* Using publishedPostsLoading as isLoading */}

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
          role={currentUserRole} // Using currentUserRole
        />
        */}
        </>
      )}

      {/* Keeping the Individual Post Performance section as it was */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
          أداء المنشورات الفردية
        </h2>
        <PublishedPostsList
          posts={publishedPosts} // Using publishedPosts
          isLoading={publishedPostsLoading} // Using publishedPostsLoading
          // onFetchAnalytics={onFetchAnalytics} // Removed prop
          // onGenerateInsights={onGenerateInsights} // Removed prop
          role={currentUserRole} // Using currentUserRole
        />
      </div>
    </div>
  );
};

export default AnalyticsPage;
