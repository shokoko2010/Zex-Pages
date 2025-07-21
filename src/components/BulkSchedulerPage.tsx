
import React, { useState, useCallback } from 'react';
import { BulkPostItem, Target, WeeklyScheduleSettings, Role, PageProfile } from '../types';
import Button from './ui/Button';
import BulkPostItemCard from './BulkPostItemCard';
import BulkSchedulingOptions from './BulkSchedulingOptions';
import { GoogleGenAI } from '@google/genai';
import { generateImageFromPrompt, generateImageWithStabilityAI } from '../services/geminiService'; // Import both functions
import { base64ToFile } from '../utils';

interface BulkSchedulerPageProps {
  bulkPosts: BulkPostItem[];
  onAddPosts: (files: FileList | null) => void;
  onUpdatePost: (id: string, updates: Partial<BulkPostItem>) => void;
  onRemovePost: (id: string) => void;
  onScheduleAll: () => Promise<void>;
  isSchedulingAll: boolean;
  targets: Target[];
  aiClient: GoogleGenAI | null;
  stabilityApiKey: string | null;
  pageProfile: PageProfile;
  showNotification: (message: string, type: 'success' | 'error' | 'info') => void;

  onGeneratePostFromText: (id: string, text: string) => Promise<void>;
  onGenerateImageFromText: (id: string, text: string, service: 'gemini' | 'stability') => Promise<void>;
  onGeneratePostFromImage: (id: string, imageFile: File) => Promise<void>;
  onAddImageManually: (id: string, file: File) => void;

  schedulingStrategy: 'even' | 'weekly';
  onSchedulingStrategyChange: (strategy: 'even' | 'weekly') => void;
  weeklyScheduleSettings: WeeklyScheduleSettings;
  onWeeklyScheduleSettingsChange: (settings: WeeklyScheduleSettings) => void;
  onReschedule: () => void;
  role: Role;
}

const BulkSchedulerPage: React.FC<BulkSchedulerPageProps> = ({
  bulkPosts,
  onAddPosts,
  onUpdatePost,
  onRemovePost,
  onScheduleAll,
  isSchedulingAll,
  targets,
  aiClient,
  stabilityApiKey,
  pageProfile,
  showNotification,
  onGeneratePostFromText,
  onGenerateImageFromText: onGenerateImageFromTextProp, // Renamed to avoid conflict
  onGeneratePostFromImage,
  onAddImageManually,
  schedulingStrategy,
  onSchedulingStrategyChange,
  weeklyScheduleSettings,
  onWeeklyScheduleSettingsChange,
  onReschedule,
  role
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const isViewer = role === 'viewer';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddPosts(e.target.files);
      e.target.value = '';
    }
  };

  const handleDragEvents = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragEnter = (e: React.DragEvent) => {
    if (isViewer) return;
    handleDragEvents(e);
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (isViewer) return;
    handleDragEvents(e);
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (isViewer) return;
    handleDragEvents(e);
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onAddPosts(e.dataTransfer.files);
    }
  };

  // Modified handler to handle both Gemini and Stability AI
  const handleGenerateImageFromText = useCallback(async (id: string, text: string, service: 'gemini' | 'stability') => {
    try {
      let base64;
      if (service === 'gemini') {
        if (!aiClient) {
          showNotification("Gemini API client is not configured.", 'error');
          return;
        }
        base64 = await generateImageFromPrompt(aiClient, text, 'standard', '1:1');
      } else if (service === 'stability') {
        if (!stabilityApiKey) {
          showNotification("Stability AI API key is not configured.", 'error');
          return;
        }
        base64 = await generateImageWithStabilityAI(stabilityApiKey, text, 'standard', '1:1', aiClient); // Pass aiClient for translation
      }

      if (base64) {
        const imageFile = base64ToFile(base64, `generated_image_${id}.png`);
        onUpdatePost(id, { imageFile, imagePreview: URL.createObjectURL(imageFile), hasImage: true });
        showNotification("Image generated successfully!", 'success');
      }
    } catch (error: any) {
      console.error(`Error generating image with ${service}:`, error);
      showNotification(`Failed to generate image: ${error.message}`, 'error');
    }
  }, [aiClient, stabilityApiKey, onUpdatePost, showNotification]);


  return (
    <div className="space-y-8 fade-in">
      {!isViewer && (
        <div
          className={`p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg border-2 border-dashed ${isDragging ? 'border-blue-500 bg-blue-50 dark:bg-gray-700/50' : 'border-gray-300 dark:border-gray-600'} transition-all duration-300`}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragEvents}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">الجدولة المجمعة للمنشورات</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            اسحب وأفلت صورًا متعددة هنا، أو اخترها يدويًا.
          </p>
          <input
            type="file"
            id="bulkImageUpload"
            className="hidden"
            accept="image/*"
            multiple
            onChange={handleFileChange}
          />
          <div className="flex flex-wrap gap-4 justify-center">
              <Button
                size="lg"
                onClick={() => document.getElementById('bulkImageUpload')?.click()}
              >
                اختر صورًا للجدولة
              </Button>
               {/* Button for adding a new text-only post for AI generation */}
              <Button
                size="lg"
                onClick={() => onAddPosts(null)}
                variant="secondary"
              >
                إنشاء منشور نصي فارغ
              </Button>
          </div>
        </div>
      )}

      {bulkPosts.length === 0 && (
          <div className="text-center text-gray-500 dark:text-gray-400 p-8 border-2 border-dashed rounded-lg">
                <h3 className="font-semibold text-2xl text-gray-700 dark:text-gray-300 mb-2">لا توجد منشورات للجدولة</h3>
                <p className="text-lg">{isViewer ? "لا توجد حاليًا أي منشورات في قائمة الجدولة المجمعة." : "أضف صورًا للبدء."}</p>
          </div>
      )}

      {bulkPosts.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          <div className="xl:col-span-3 space-y-6">
            {bulkPosts.map(post => (
              <BulkPostItemCard
                key={post.id}
                item={post}
                onUpdate={onUpdatePost}
                onRemove={onRemovePost}
                targets={targets}
                aiClient={aiClient}
                stabilityApiKey={stabilityApiKey}
                pageProfile={pageProfile}
                onGeneratePostFromText={onGeneratePostFromText}
                onGenerateImageFromText={handleGenerateImageFromText}
                onGeneratePostFromImage={onGeneratePostFromImage}
                onAddImageManually={onAddImageManually}
                role={role}
              />
            ))}
          </div>
          <div className="xl:col-span-1">
            <div className="sticky top-24 space-y-6">
              <BulkSchedulingOptions
                strategy={schedulingStrategy}
                onStrategyChange={onSchedulingStrategyChange}
                settings={weeklyScheduleSettings}
                onSettingsChange={onWeeklyScheduleSettingsChange}
                onReschedule={onReschedule}
                disabled={isViewer}
              />
              {!isViewer && (
                <Button
                  size="lg"
                  variant="primary"
                  onClick={onScheduleAll}
                  isLoading={isSchedulingAll}
                  className="w-full"
                  disabled={bulkPosts.length === 0 || isSchedulingAll}
                >
                  {isSchedulingAll ? 'جاري الجدولة...' : `جدولة كل المنشورات (${bulkPosts.length})`}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkSchedulerPage;
