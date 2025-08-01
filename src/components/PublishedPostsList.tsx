
import React, { useState } from 'react';
import { PublishedPost, Role } from '../types';
import Button from './ui/Button';
import HandThumbUpIcon from './icons/HandThumbUpIcon';
import ChatBubbleOvalLeftEllipsisIcon from './icons/ChatBubbleOvalLeftEllipsisIcon';
import ShareIcon from './icons/ShareIcon';
import ArrowPathIcon from './icons/ArrowPathIcon';
import LightBulbIcon from './icons/LightBulbIcon';
import PostInsights from './PostInsights';

interface PublishedPostsListProps {
  posts: PublishedPost[];
  isLoading: boolean;
  role: Role;
  onFetchInsights: (postId: string) => Promise<{ performanceSummary: string; sentiment: any; } | null>; // More specific type
  isInsightsAllowed: boolean;
}

const StatCard: React.FC<{ icon: React.ReactNode, value?: number, label: string }> = ({ icon, value, label }) => (
    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
        {icon}
        <span className="font-bold">{value?.toLocaleString('ar-EG') ?? '-'}</span>
        <span>{label}</span>
    </div>
);

const PostSkeleton: React.FC = () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden animate-pulse">
        <div className="p-5">
            <div className="flex items-center mb-4">
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                <div className="mr-3 flex-grow">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-1"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                </div>
            </div>
            <div className="space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
            </div>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-100 dark:border-gray-700">
            <div className="flex justify-between items-center">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
            </div>
        </div>
    </div>
);

const PublishedPostsList: React.FC<PublishedPostsListProps> = ({ posts, isLoading, role, onFetchInsights, isInsightsAllowed }) => {
  const [openInsightsPostId, setOpenInsightsPostId] = useState<string | null>(null);
  const [postInsights, setPostInsights] = useState<{ performanceSummary: string; sentiment: any; } | null>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);

  const isViewer = role === 'viewer';

  const toggleInsights = async (postId: string) => {
    if (openInsightsPostId === postId) {
      setOpenInsightsPostId(null);
      setPostInsights(null);
    } else {
      setIsLoadingInsights(true);
      setOpenInsightsPostId(postId);
      try {
        const insights = await onFetchInsights(postId);
        setPostInsights(insights);
      } catch (error) {
        console.error("Failed to fetch post insights", error);
        setPostInsights(null);
      } finally {
        setIsLoadingInsights(false);
      }
    }
  };

  if (isLoading) {
    return (
        <div className="space-y-6 fade-in">
            <PostSkeleton />
            <PostSkeleton />
        </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 p-8 border-2 border-dashed rounded-lg fade-in">
        <h3 className="font-semibold text-2xl text-gray-700 dark:text-gray-300 mb-2">لا توجد منشورات منشورة</h3>
        <p className="text-lg">لم نعثر على أي منشورات على هذه الصفحة، أو أنك نشرت للتو وتحتاج إلى تحديث.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      {posts.map(post => (
        <div key={post.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          <div className="p-5">
            <div className="flex items-center mb-4">
              <img src={post.pageAvatarUrl} alt={post.pageName} className="w-10 h-10 rounded-full object-cover" />
              <div className="mr-3">
                <p className="font-bold text-gray-900 dark:text-white">{post.pageName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(post.publishedAt).toLocaleString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>

            <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words mb-4">
              {post.text}
            </p>

            {post.imagePreview && (
              <div className="mb-4 rounded-lg overflow-hidden max-w-sm">
                <img src={post.imagePreview} alt="Post image" className="w-full h-auto object-cover" />
              </div>
            )}
          </div>
          
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-100 dark:border-gray-700">
            <div className="flex flex-wrap justify-between items-center gap-4">
                <div className="flex items-center gap-6">
                    <StatCard icon={<HandThumbUpIcon className="w-5 h-5 text-blue-500" />} value={post.analytics.likes} label="إعجاب" />
                    <StatCard icon={<ChatBubbleOvalLeftEllipsisIcon className="w-5 h-5 text-gray-500" />} value={post.analytics.comments} label="تعليق" />
                    <StatCard icon={<ShareIcon className="w-5 h-5 text-green-500" />} value={post.analytics.shares} label="مشاركة" />
                </div>
                <div className="flex items-center gap-2">
                    {isInsightsAllowed && (
                        <Button 
                            onClick={() => toggleInsights(post.id)} 
                            variant="secondary" 
                            size="sm"
                            isLoading={isLoadingInsights && openInsightsPostId === post.id}
                            disabled={isViewer}
                        >
                            <LightBulbIcon className="w-4 h-4 ml-2" />
                            {openInsightsPostId === post.id ? 'إخفاء الرؤى' : 'احصل على رؤى'}
                        </Button>
                    )}
                </div>
            </div>
             {post.analytics.lastUpdated && 
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                    آخر تحديث: {new Date(post.analytics.lastUpdated).toLocaleTimeString('ar-EG')}
                </p>
            }
          </div>
           {openInsightsPostId === post.id && (
                <PostInsights 
                    summary={postInsights?.performanceSummary}
                    sentiment={postInsights?.sentiment}
                />
           )}
        </div>
      ))}
    </div>
  );
};

export default PublishedPostsList;
