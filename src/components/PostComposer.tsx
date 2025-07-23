
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
import ArrowPathIcon from './icons/ArrowPathIcon';
import ArrowUpTrayIcon from './icons/ArrowUpTrayIcon';
import XCircleIcon from './icons/XCircleIcon';
import PencilSquareIcon from './icons/PencilSquareIcon';
import Squares2x2Icon from './icons/Squares2x2Icon';
import StarIcon from './icons/StarIcon';
import ClockIcon from './icons/ClockIcon';

// Assume these service functions exist and are imported
import { generatePostSuggestion, generateImageFromPrompt, getBestPostingTime, generateHashtags, generateDescriptionForImage } from '../services/geminiService';
import { generateImageWithStabilityAI, getStabilityAIModels, imageToImageWithStabilityAI, upscaleImageWithStabilityAI, inpaintingWithStabilityAI } from '../services/stabilityai';


interface PostComposerProps {
  onPublish: (postType: PostType) => Promise<void>;
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
  
  const [imageService, setImageService] = useState<'gemini' | 'stability'>('gemini');
  const [aiImagePrompt, setAiImagePrompt] = useState('');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [aiImageError, setAiImageError] = useState('');
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
  const [imageStyle, setImageStyle] = useState('Photographic');
  const [imageAspectRatio, setImageAspectRatio] = useState('1:1');

  const [postType, setPostType] = useState<PostType>('post');
  const isViewer = role === 'viewer';

  const handleGenerateTextWithAI = async () => {
    if (!aiClient || !aiTopic.trim()) return;
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
    if (!aiImagePrompt.trim()) {
      setAiImageError('Please enter a prompt.');
      return;
    }
    setIsGeneratingImage(true);
    setAiImageError('');
    try {
      let base64Bytes: string;
      if (imageService === 'stability' && stabilityApiKey) {
        base64Bytes = await generateImageWithStabilityAI(stabilityApiKey, aiImagePrompt, imageStyle, imageAspectRatio, 'stable-diffusion-v1-6', aiClient);
      } else if (aiClient) {
        base64Bytes = await generateImageFromPrompt(aiClient, aiImagePrompt, imageStyle, imageAspectRatio);
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
          <label htmlFor="ai-topic" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">مساعد النصوص بالذكاء الاصطناعي</label>
          <div className="flex gap-2">
            <input id="ai-topic" type="text" value={aiTopic} onChange={(e) => setAiTopic(e.target.value)} placeholder="اكتب فكرة للمنشور..." className="flex-grow p-2 border rounded-md" disabled={isGeneratingText || !aiClient || isViewer}/>
            <Button onClick={handleGenerateTextWithAI} isLoading={isGeneratingText} disabled={!aiClient || isViewer}><SparklesIcon className="w-5 h-5"/> توليد نص</Button>
          </div>
          {aiTextError && <p className="text-red-500 text-sm mt-2">{aiTextError}</p>}
      </div>

      <textarea value={postText} onChange={(e) => onPostTextChange(e.target.value)} placeholder="بماذا تفكر؟" className="w-full h-48 p-3 border rounded-md" disabled={isViewer} />
      
        <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">نوع المحتوى</label>
            <div className="flex bg-gray-200 dark:bg-gray-700 rounded-lg p-1 space-x-1">
                {postTypeOptions.map(({ type, label, icon: Icon, available }) => (
                    <button key={type} onClick={() => setPostType(type)} disabled={!available || isViewer} className={`flex-1 p-2 rounded-md text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 ${postType === type ? 'bg-white dark:bg-gray-900 shadow' : 'hover:bg-gray-300 dark:hover:bg-gray-600'}`}>
                        <Icon className="w-5 h-5" /> {label}
                    </button>
                ))}
            </div>
        </div>

      {imagePreview && (
        <div className="relative w-40">
          <img src={imagePreview} alt="Preview" className="rounded-lg w-full h-auto" />
          {!isViewer && <button onClick={onImageRemove} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1">&times;</button>}
        </div>
      )}

      <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-700/50 space-y-3">
          <label className="block text-sm font-medium">مولّد الصور بالذكاء الاصطناعي</label>
          <div className="flex gap-2">
            <input id="ai-image-prompt" type="text" value={aiImagePrompt} onChange={(e) => setAiImagePrompt(e.target.value)} placeholder="وصف الصورة..." className="flex-grow p-2 border rounded-md" disabled={isGeneratingImage || isViewer} />
            <Button onClick={handleGenerateImageWithAI} isLoading={isGeneratingImage} disabled={isViewer || (!aiClient && !stabilityApiKey)}>
                <PhotoIcon className="w-5 h-5"/> إنشاء صورة
            </Button>
          </div>
          {aiImageError && <p className="text-red-500 text-sm mt-2">{aiImageError}</p>}
      </div>

      <div className="p-4 border rounded-lg">
        <div className="flex items-center">
            <input id="schedule-checkbox" type="checkbox" checked={isScheduled} onChange={e => onIsScheduledChange(e.target.checked)} className="h-4 w-4 rounded" disabled={isViewer}/>
            <label htmlFor="schedule-checkbox" className="mr-2 text-sm font-medium">جدولة المنشور</label>
        </div>
        {isScheduled && (
            <div className="mt-3">
                <input type="datetime-local" value={scheduleDate} onChange={e => onScheduleDateChange(e.target.value)} className="p-2 border rounded-md" disabled={isViewer}/>
            </div>
        )}
      </div>

      <div className="flex justify-between items-center">
        <div>
            <input type="file" id="imageUpload" className="hidden" accept="image/*" onChange={onImageChange} />
            <Button variant="secondary" onClick={() => document.getElementById('imageUpload')?.click()} disabled={isViewer}><PhotoIcon className="w-5 h-5"/> أضف صورة</Button>
        </div>
        <div className="flex gap-2">
         <Button variant="secondary" onClick={onSaveDraft} disabled={isPublishing || isViewer}>حفظ كمسودة</Button>
        <Button onClick={() => onPublish(postType)} isLoading={isPublishing} disabled={isViewer}>{getPublishButtonText()}</Button>
        </div>
      </div>
    </div>
  );
};

export default PostComposer;
