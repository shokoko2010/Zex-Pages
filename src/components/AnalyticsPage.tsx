import React, { useState } from 'react';
import AnalyticsSummaryDashboard from './AnalyticsSummaryDashboard';
import PublishedPostsList from './PublishedPostsList';
import AudienceGrowthChart from './AudienceGrowthChart';
import ContentTypePerformanceChart from './ContentTypePerformanceChart';
import { PerformanceSummaryData, PublishedPost, AudienceGrowthData, HeatmapDataPoint, ContentTypePerformanceData, Role, Plan } from '../types';

interface AnalyticsPageProps {
  period: '7d' | '30d';
  onPeriodChange: (period: '7d' | '30d') => void;
  summaryData: PerformanceSummaryData | null;
  aiSummary: string;
  isGeneratingSummary: boolean;
  setIsGeneratingSummary: React.Dispatch<React.SetStateAction<boolean>>; // Added this line
  posts: PublishedPost[];
  isLoading: boolean;
  onFetchAnalytics: (postId: string) => void;
  onGenerateInsights: (postId: string) => void;
  role: Role;
  userPlan: Plan | null;
  audienceGrowthData: AudienceGrowthData[];
  setAudienceGrowthData: React.Dispatch<React.SetStateAction<AudienceGrowthData[]>>; // Added this line
  heatmapData: HeatmapDataPoint[];
  contentTypeData: ContentTypePerformanceData[];
  isGeneratingDeepAnalytics: boolean;
  setIsGeneratingDeepAnalytics: React.Dispatch<React.SetStateAction<boolean>>; // Added this line
  publishedPosts: PublishedPost[];
  publishedPostsLoading: boolean;
  analyticsPeriod: "7d" | "30d"; // Added this line
  setAnalyticsPeriod: React.Dispatch<React.SetStateAction<"7d" | "30d">>; // Added this line (based on how it's used in DashboardPage.tsx)
  performanceSummaryText: string; // Added this line
  setPerformanceSummaryText: React.Dispatch<React.SetStateAction<string>>; // Added this line
}

const AnalyticsPage: React.FC<AnalyticsPageProps> = ({
  period,
  onPeriodChange,
  summaryData,
  aiSummary,
  isGeneratingSummary,
  setIsGeneratingSummary, // Destructure the new prop
  posts,
  isLoading,
  onFetchAnalytics,
  onGenerateInsights,
  role,
  userPlan,
  audienceGrowthData,
  setAudienceGrowthData, // Destructure the new prop
  heatmapData,
  contentTypeData,
  isGeneratingDeepAnalytics,
  setIsGeneratingDeepAnalytics, // Destructure the new prop
  publishedPosts,
  publishedPostsLoading,
  analyticsPeriod, // Destructure the new prop
  setAnalyticsPeriod, // Destructure the new prop
  performanceSummaryText, // Destructure the new prop
  setPerformanceSummaryText // Destructure the new prop
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

      <AudienceGrowthChart data={audienceGrowthData} isLoading={isLoading} />

      {/* EngagementHeatmap and DeepAnalyticsSection removed due to missing files */}
      {/* <EngagementHeatmap data={heatmapData} isLoading={isLoading} /> */}

      <ContentTypePerformanceChart data={contentTypeData} isLoading={isLoading} />

      {/* {canViewDeepAnalytics && (
        <DeepAnalyticsSection
          publishedPosts={publishedPosts}
          publishedPostsLoading={publishedPostsLoading}
          onFetchAnalytics={onFetchAnalytics}
          onGenerateInsights={onGenerateInsights}
          isGeneratingDeepAnalytics={isGeneratingDeepAnalytics}
          role={role}
        />
      )} */}

      {/* Keeping the Individual Post Performance section as it was */}
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
