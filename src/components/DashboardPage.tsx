import React, { useState, ChangeEvent } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Target, Role, PublishedPost, ScheduledPost, Draft, PerformanceSummaryData, PageProfile, Plan, PostType } from '../types';
import AnalyticsSummaryDashboard from './AnalyticsSummaryDashboard';
import PostComposer from './PostComposer';
import ContentCalendar from './ContentCalendar';
import DraftsList from './DraftsList';
import PublishedPostsList from './PublishedPostsList';
import Button from './ui/Button';
import ArrowPathIcon from './icons/ArrowPathIcon';

interface DashboardPageProps {
    managedTarget: Target;
    currentUserRole: Role;
    publishedPosts: PublishedPost[];
    publishedPostsLoading: boolean;
    scheduledPosts: ScheduledPost[];
    drafts: Draft[];
    performanceSummaryData: PerformanceSummaryData | null;
    onSyncHistory: (target: Target) => void;
    performanceSummaryText: string;
    isGeneratingSummary: boolean;
    onGeneratePerformanceSummary: () => void;
    onFetchPostInsights: (postId: string) => Promise<any>;
    isInsightsAllowed: boolean;
    onLoadDrafts: () => void;
    onDeleteDraft: (draftId: string) => Promise<void>;
    
    // Functions to be called for API interactions, passed from a parent component
    onPublish: (targetId: string, postType: PostType, options: any) => Promise<void>;
    onSaveDraft: (targetId: string, draftData: any) => Promise<void>;
    onDeletePost: (postId: string) => void;
    onUpdatePost: (targetId: string, postType: PostType, options: any) => Promise<void>; // Handles updating a scheduled post
    onSyncCalendar: () => void;
    isSyncingCalendar: boolean;
    onApprovePost: (postId: string) => void;
    onRejectPost: (postId: string) => void;

    // Global state passed from parent
    pageProfile: PageProfile;
    userPlan: Plan | null;
    aiClient: GoogleGenAI | null;
    stabilityApiKey: string | null;
    linkedInstagramTarget: Target | null;
}

const DashboardPage: React.FC<DashboardPageProps> = ({
    managedTarget,
    currentUserRole,
    publishedPosts,
    publishedPostsLoading,
    scheduledPosts,
    drafts,
    performanceSummaryData,
    onSyncHistory,
    performanceSummaryText,
    isGeneratingSummary,
    onGeneratePerformanceSummary,
    onFetchPostInsights,
    isInsightsAllowed,
    onLoadDrafts,
    onDeleteDraft,
    onPublish: onPublishProp,
    onSaveDraft: onSaveDraftProp,
    onDeletePost,
    onUpdatePost,
    onSyncCalendar,
    isSyncingCalendar,
    onApprovePost,
    onRejectPost,
    pageProfile,
    userPlan,
    aiClient,
    stabilityApiKey,
    linkedInstagramTarget,
}) => {
    // State for PostComposer
    const [isPublishing, setIsPublishing] = useState(false);
    const [postText, setPostText] = useState('');
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isScheduled, setIsScheduled] = useState(false);
    const [scheduleDate, setScheduleDate] = useState(new Date().toISOString().slice(0, 16));
    const [error, setError] = useState('');
    const [includeInstagram, setIncludeInstagram] = useState(false);
    const [editingScheduledPostId, setEditingScheduledPostId] = useState<string | null>(null);

    const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setSelectedImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleImageRemove = () => {
        setSelectedImage(null);
        setImagePreview(null);
    };

    const handleImageGenerated = (file: File) => {
        setSelectedImage(file);
        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    };
    
    const resetComposer = () => {
        setPostText('');
        setSelectedImage(null);
        setImagePreview(null);
        setIsScheduled(false);
        setScheduleDate(new Date().toISOString().slice(0, 16));
        setError('');
        setIncludeInstagram(false);
        setEditingScheduledPostId(null);
    };

    const handlePublish = async (postType: PostType, postOptions: { [key: string]: any }) => {
        setIsPublishing(true);
        setError('');
        try {
            const options = {
                text: postText,
                imageFile: selectedImage,
                isScheduled,
                scheduleDate,
                includeInstagram,
                ...postOptions,
            };

            if (editingScheduledPostId) {
                await onUpdatePost(managedTarget.id, postType, { ...options, postId: editingScheduledPostId });
            } else {
                await onPublishProp(managedTarget.id, postType, options);
            }
            
            resetComposer();
        } catch (e: any) {
            setError(e.message || 'Failed to publish post.');
        } finally {
            setIsPublishing(false);
        }
    };

    const handleSaveDraft = async () => {
        setIsPublishing(true);
        setError('');
        try {
            await onSaveDraftProp(managedTarget.id, { text: postText, imageFile: selectedImage });
            resetComposer();
        } catch(e: any) {
             setError(e.message || 'Failed to save draft.');
        } finally {
            setIsPublishing(false);
        }
    };
    
    const handleEditPost = (postId: string) => {
        const postToEdit = scheduledPosts.find(p => p.id === postId);
        if (postToEdit) {
            setPostText(postToEdit.text || '');
            setIsScheduled(true);
            setScheduleDate(new Date(postToEdit.scheduledTime).toISOString().slice(0, 16));
            setEditingScheduledPostId(postToEdit.id);
            setImagePreview(postToEdit.imageUrl || null);
            setSelectedImage(null);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleCreatePost = () => {
        resetComposer();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
                    Dashboard for {managedTarget.name}
                </h1>
                <Button onClick={() => onSyncHistory(managedTarget)} disabled={publishedPostsLoading} variant="outline" size="sm">
                    <ArrowPathIcon className={`w-4 h-4 ${publishedPostsLoading ? 'animate-spin' : ''}`} />
                    <span className="ml-2">{publishedPostsLoading ? 'Syncing...' : 'Sync History'}</span>
                </Button>
            </div>

            <AnalyticsSummaryDashboard
                summaryData={performanceSummaryData}
                period="30d"
                onPeriodChange={() => {}}
                isGenerationAllowed={isInsightsAllowed}
                aiSummary={performanceSummaryText}
                isGeneratingSummary={isGeneratingSummary}
                onGenerateSummary={onGeneratePerformanceSummary}
            />

            <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <PostComposer
                        managedTarget={managedTarget}
                        role={currentUserRole}
                        onPublish={handlePublish}
                        onSaveDraft={handleSaveDraft}
                        isPublishing={isPublishing}
                        postText={postText}
                        onPostTextChange={setPostText}
                        onImageChange={handleImageChange}
                        onImageGenerated={handleImageGenerated}
                        onImageRemove={handleImageRemove}
                        imagePreview={imagePreview}
                        selectedImage={selectedImage}
                        isScheduled={isScheduled}
                        onIsScheduledChange={setIsScheduled}
                        scheduleDate={scheduleDate}
                        onScheduleDateChange={setScheduleDate}
                        error={error}
                        aiClient={aiClient}
                        stabilityApiKey={stabilityApiKey}
                        linkedInstagramTarget={linkedInstagramTarget}
                        includeInstagram={includeInstagram}
                        onIncludeInstagramChange={setIncludeInstagram}
                        pageProfile={pageProfile}
                        editingScheduledPostId={editingScheduledPostId}
                        userPlan={userPlan}
                    />
                    <PublishedPostsList
                        posts={publishedPosts}
                        isLoading={publishedPostsLoading}
                        role={currentUserRole}
                        onFetchInsights={onFetchPostInsights}
                        isInsightsAllowed={isInsightsAllowed}
                    />
                </div>

                <div className="space-y-8">
                    <ContentCalendar
                        posts={scheduledPosts}
                        onDelete={onDeletePost}
                        onEdit={handleEditPost}
                        onSync={onSyncCalendar}
                        isSyncing={isSyncingCalendar}
                        role={currentUserRole}
                        onApprove={onApprovePost}
                        onReject={onRejectPost}
                        managedTarget={managedTarget}
                        userPlan={userPlan}
                        onCreatePost={handleCreatePost}
                    />
                    <DraftsList
                        drafts={drafts}
                        onLoad={onLoadDrafts}
                        onDelete={onDeleteDraft}
                        role={currentUserRole}
                    />
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
