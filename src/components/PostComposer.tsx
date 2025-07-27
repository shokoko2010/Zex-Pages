import React, { useState, useEffect } from 'react';
import Button from './ui/Button';
import PhotoIcon from './icons/PhotoIcon';
import SparklesIcon from './icons/SparklesIcon';
import WandSparklesIcon from './icons/WandSparklesIcon';
import { GoogleGenAI } from '@google/genai';
import { Target, PageProfile, Role, Plan, PostType } from '../types';
import InstagramIcon from './icons/InstagramIcon';
import HashtagIcon from './icons/HashtagIcon';
import CanvaIcon from './icons/CanvaIcon';
import XCircleIcon from './icons/XCircleIcon';
import Squares2x2Icon from './icons/Squares2x2Icon';
import StarIcon from './icons/StarIcon';
import ClockIcon from './icons/ClockIcon';
import LightBulbIcon from './icons/LightBulbIcon';

// Assume these service functions exist and are imported correctly
import { generatePostSuggestion, generateImageFromPrompt, getBestPostingTime, generateHashtags, generateDescriptionForImage } from '../services/geminiService';
import { generateImageWithStabilityAI } from '../services/stabilityai';

type ImageGenerationService = 'gemini' | 'stability';

interface PostComposerProps {
  onPublish: (postType: PostType, postOptions: { [key: string]: any }) => Promise<void>;
  onSaveDraft: () => void;
  isPublishing: boolean;
  postText: string;
  onPostTextChange: (text: string) => void;
  onImageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onImageGenerated: (file: File) => void;
  onImageRemove: () => void;
  imagePreview: string | null;
  selectedImage: File | null;
  isScheduled: boolean;
  onIsScheduledChange: (checked: boolean) => void;
  scheduleDate: string;
  onScheduleDateChange: (date: string) => void;
  error: string;
  aiClient: GoogleGenAI | null;
  stabilityApiKey: string | null;
  managedTarget: Target;
  linkedInstagramTarget: Target | null;
  includeInstagram: boolean;
  onIncludeInstagramChange: (checked: boolean) => void;
  pageProfile: PageProfile;
  editingScheduledPostId: string | null;
  role: Role;
  userPlan: Plan | null;
}

const base64ToFile = (base64: string, filename: string): File => {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: 'image/jpeg' });
  return new File([blob], filename, { type: 'image/jpeg' });
}

const PostComposer: React.FC<PostComposerProps> = ({
  onPublish, onSaveDraft, isPublishing, postText, onPostTextChange, onImageChange,
  onImageGenerated, onImageRemove, imagePreview, selectedImage, isScheduled, onIsScheduledChange,
  scheduleDate, onScheduleDateChange, error, aiClient, stabilityApiKey, managedTarget,
  linkedInstagramTarget, includeInstagram, onIncludeInstagramChange, pageProfile,
  editingScheduledPostId, role, userPlan
}) => {
  const [aiTopic, setAiTopic] = useState('');
  const [isGeneratingText, setIsGeneratingText] = useState(false);
  const [aiTextError, setAiTextError] = useState('');
  
  const [aiImagePrompt, setAiImagePrompt] = useState('');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [aiImageError, setAiImageError] = useState('');
  const [imageGenerationService, setImageGenerationService] = useState<ImageGenerationService>('gemini');

  const [isGeneratingHashtags, setIsGeneratingHashtags] = useState(false);
  const [isSuggestingTime, setIsSuggestingTime] = useState(false);
  const [isGeneratingImageDescription, setIsGeneratingImageDescription] = useState(false);

  const [postType, setPostType] = useState<PostType>('post');
  const isViewer = role === 'viewer';

  const handleGenerateTextWithAI = async () => {
    if (!aiClient || !aiTopic.trim() || isViewer) return;
    setIsGeneratingText(true);
    setAiTextError('');
    try {
      const suggestion = await generatePostSuggestion(aiClient, aiTopic, pageProfile);
      onPostTextChange(suggestion);
    } catch (e: any) {
      setAiTextError(e.message || 'An error occurred.');
    } finally {
      setIsGeneratingText(false);
    }
  };

  const handleGenerateImageWithAI = async () => {
    if (!aiImagePrompt.trim() || isViewer) {
      setAiImageError('Please enter a prompt.');
      return;
    }
    setIsGeneratingImage(true);
    setAiImageError('');
    try {
      let base64Bytes: string;
      if (imageGenerationService === 'stability' && stabilityApiKey) {
        base64Bytes = await generateImageWithStabilityAI(stabilityApiKey, aiImagePrompt, 'Photographic', '1:1', 'stable-diffusion-v1-6', aiClient);
      } else if (aiClient) {
        base64Bytes = await generateImageFromPrompt(aiClient, aiImagePrompt, 'Photographic', '1:1');
      } else {
        throw new Error("AI service not configured.");
      }
      const imageFile = base64ToFile(base64Bytes, "generated_image.jpeg");
      onImageGenerated(imageFile);
    } catch (e: any) {
      setAiImageError(e.message || 'An error occurred during image generation.');
    } finally {
      setIsGeneratingImage(false);
    }
  };
  
  const handleGenerateHashtags = async () => {
    if (!aiClient || !postText.trim() || isViewer) return;
    setIsGeneratingHashtags(true);
    try {
      const hashtags = await generateHashtags(aiClient, postText);
      onPostTextChange(`${postText}

${hashtags}`);
    } catch (e) {
      console.error("Error generating hashtags:", e);
    } finally {
      setIsGeneratingHashtags(false);
    }
  };

  const handleSuggestTime = async () => {
    if (!aiClient || isViewer) return;
    setIsSuggestingTime(true);
    try {
      const bestTime = await getBestPostingTime(aiClient, managedTarget.id, pageProfile);
      onIsScheduledChange(true);
      onScheduleDateChange(new Date(bestTime).toISOString().slice(0, 16));
    } catch (e) {
      console.error("Error suggesting best time:", e);
    } finally {
      setIsSuggestingTime(false);
    }
  };
  
  const handleGenerateImageDescription = async () => {
      if (!aiClient || !selectedImage || isViewer) return;
      setIsGeneratingImageDescription(true);
      try {
          const description = await generateDescriptionForImage(aiClient, selectedImage);
          onPostTextChange(postText ? `${postText}

${description}`: description);
      } catch (e) {
          console.error("Error generating image description:", e);
      } finally {
          setIsGeneratingImageDescription(false);
      }
  };


  const getPublishButtonText = () => {
    if (isPublishing) return 'جاري العمل...';
    if (isScheduled) return editingScheduledPostId ? 'تحديث الجدولة' : 'جدولة الآن';
    return 'انشر الآن';
  };
  
  const postTypeOptions = [
    { type: 'post' as PostType, label: 'منشور', icon: Squares2x2Icon, available: true },
    { type: 'story' as PostType, label: 'قصة', icon: StarIcon, available: includeInstagram || managedTarget.type === 'instagram' },
    { type: 'reel' as PostType, label: 'ريل', icon: ClockIcon, available: includeInstagram || managedTarget.type === 'instagram' },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{editingScheduledPostId ? 'تعديل المنشور' : 'إنشاء منشور جديد'}</h2>
      
      <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-700/50">
          <label htmlFor="ai-topic" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">مساعد النصوص بالذكاء الاصطناعي ✨</label>
          <div className="flex gap-2">
            <input id="ai-topic" type="text" value={aiTopic} onChange={(e) => setAiTopic(e.target.value)} placeholder="اكتب فكرة للمنشور..." className="flex-grow p-2 border rounded-md bg-white dark:bg-gray-800" disabled={isGeneratingText || !aiClient || isViewer}/>
            <Button onClick={handleGenerateTextWithAI} isLoading={isGeneratingText} disabled={!aiClient || isViewer}><SparklesIcon className="w-5 h-5 ml-1"/> توليد نص</Button>
          </div>
          {aiTextError && <p className="text-red-500 text-sm mt-2">{aiTextError}</p>}
      </div>

      <textarea value={postText} onChange={(e) => onPostTextChange(e.target.value)} placeholder="بماذا تفكر؟ اكتب منشورك هنا..." className="w-full h-48 p-3 border rounded-md dark:bg-gray-700 dark:text-white" disabled={isViewer} />
      
        <div className="flex gap-2 flex-wrap">
            <Button variant="secondary" onClick={handleGenerateHashtags} isLoading={isGeneratingHashtags} disabled={!aiClient || !postText.trim() || isViewer}>
                <HashtagIcon className="w-5 h-5 ml-1"/> توليد هاشتاجات
            </Button>
            {selectedImage && (
                <Button variant="secondary" onClick={handleGenerateImageDescription} isLoading={isGeneratingImageDescription} disabled={!aiClient || isViewer}>
                    <WandSparklesIcon className="w-5 h-5 ml-1"/> توليد وصف للصورة
                </Button>
            )}
        </div>


        <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">نوع المحتوى</label>
            <div className="flex bg-gray-200 dark:bg-gray-700 rounded-lg p-1 space-x-1">
                {postTypeOptions.map(({ type, label, icon: Icon, available }) => (
                    <button key={type} onClick={() => setPostType(type)} disabled={!available || isViewer} className={`flex-1 p-2 rounded-md text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors ${postType === type ? 'bg-white dark:bg-gray-900 shadow text-blue-600' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>
                        <Icon className="w-5 h-5" /> {label}
                    </button>
                ))}
            </div>
        </div>

      {imagePreview && (
        <div className="relative w-40">
          <img src={imagePreview} alt="Preview" className="rounded-lg w-full h-auto" />
          {!isViewer && <button onClick={onImageRemove} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 w-6 h-6 flex items-center justify-center">&times;</button>}
        </div>
      )}

      <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-700/50 space-y-3">
          <div className="flex justify-between items-center">
             <label className="block text-sm font-medium">مولّد الصور بالذكاء الاصطناعي 🤖</label>
             <div className="flex bg-gray-200 dark:bg-gray-700 rounded-lg p-1 text-xs">
                <button onClick={() => setImageGenerationService('gemini')} className={`px-2 py-1 rounded-md ${imageGenerationService === 'gemini' ? 'bg-white dark:bg-gray-900 shadow' : ''}`} disabled={!aiClient}>Gemini</button>
                <button onClick={() => setImageGenerationService('stability')} className={`px-2 py-1 rounded-md ${imageGenerationService === 'stability' ? 'bg-white dark:bg-gray-900 shadow' : ''}`} disabled={!stabilityApiKey}>Stability</button>
             </div>
          </div>
          <div className="flex gap-2">
            <input id="ai-image-prompt" type="text" value={aiImagePrompt} onChange={(e) => setAiImagePrompt(e.target.value)} placeholder="وصف الصورة، مثلاً: رائد فضاء على المريخ" className="flex-grow p-2 border rounded-md bg-white dark:bg-gray-800" disabled={isGeneratingImage || isViewer} />
            <Button onClick={handleGenerateImageWithAI} isLoading={isGeneratingImage} disabled={isViewer || (imageGenerationService === 'gemini' && !aiClient) || (imageGenerationService === 'stability' && !stabilityApiKey)}>
                <PhotoIcon className="w-5 h-5 ml-1"/> إنشاء صورة
            </Button>
          </div>
          {aiImageError && <p className="text-red-500 text-sm mt-2">{aiImageError}</p>}
      </div>

      <div className="p-4 border rounded-lg dark:border-gray-700">
        <div className="flex items-center justify-between">
            <div className='flex items-center'>
            <input id="schedule-checkbox" type="checkbox" checked={isScheduled} onChange={e => onIsScheduledChange(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600" disabled={isViewer}/>
            <label htmlFor="schedule-checkbox" className="mr-2 text-sm font-medium">جدولة المنشور</label>
            </div>
            <Button variant="secondary" onClick={handleSuggestTime} isLoading={isSuggestingTime} disabled={!aiClient || isViewer}>
                <LightBulbIcon className="w-5 h-5 ml-1"/> اقتراح أفضل وقت
            </Button>
        </div>
        {isScheduled && (
            <div className="mt-3">
                <input type="datetime-local" value={scheduleDate} onChange={e => onScheduleDateChange(e.target.value)} className="p-2 border rounded-md dark:bg-gray-800" disabled={isViewer}/>
            </div>
        )}
      </div>

      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="flex items-center gap-2">
            <input type="file" id="imageUpload" className="hidden" accept="image/*" onChange={onImageChange} />
            <Button variant="secondary" onClick={() => document.getElementById('imageUpload')?.click()} disabled={isViewer}><PhotoIcon className="w-5 h-5 ml-1"/> أضف صورة</Button>
        </div>
        <div className="flex items-center gap-2">
         <Button variant="secondary" onClick={onSaveDraft} disabled={isPublishing || isViewer}>حفظ كمسودة</Button>
        <Button onClick={() => onPublish(postType, {})} isLoading={isPublishing} disabled={isViewer}>{getPublishButtonText()}</Button>
        </div>
      </div>
    </div>
  );
};

export default PostComposer;
