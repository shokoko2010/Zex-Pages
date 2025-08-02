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
import PencilSquareIcon from './icons/PencilSquareIcon';
import ArchiveBoxIcon from './icons/ArchiveBoxIcon';

// Assume these service functions exist and are imported correctly
import { generatePostSuggestion, generateImageFromPrompt, getBestPostingTime, generateHashtags, generateDescriptionForImage } from '../services/geminiService';
import { generateImageWithStabilityAI, upscaleImageWithStabilityAI, imageToImageWithStabilityAI } from '../services/stabilityai';

type ImageGenerationService = 'gemini' | 'stability';
type EditMode = 'upscale' | 'image-to-image' | 'inpainting' | null;


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

const stabilitySubModels = {
  "Generate": [
    "Video thumbnail",
    "Stable Image Ultra",
    "Stable Image Core",
    "Stable Diffusion 3.5 Large",
    "Stable Diffusion 3.5 Large Turbo",
    "Stable Diffusion 3.5 Medium",
    "SDXL 1.0"
  ],
  "Upscale": [
    "Video thumbnail",
    "Creative",
    "Fast",
    "Conservative"
  ],
  "Edit": [
    "Video thumbnail",
    "Erase Object",
    "Inpaint",
    "Outpaint",
    "Remove Background",
    "Search and Recolor",
    "Search and Replace",
    "Replace Background & Relight"
  ],
  "Control": [
    "Video thumbnail",
    "Sketch",
    "Structure",
    "Style Guide",
    "Style Transfer",
    "New!"
  ]
};

const geminiModels = [
    'imagen-3.0-generate-002',
    'imagen-3.0-generate-005',
    'imagen-3.0-generate-001'
];

const imageStyles = [
    'Photographic',
    'Cinematic',
    'Digital Art',
    'Anime',
    'Fantasy',
    'Neon Punk'
];


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
  const [selectedSubModel, setSelectedSubModel] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('Photographic');
  
  const [isEditingImage, setIsEditingImage] = useState(false);
  const [editPrompt, setEditPrompt] = useState('');
  const [editMode, setEditMode] = useState<EditMode>(null);


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
      const suggestion = await generatePostSuggestion(aiClient, aiTopic);
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
        base64Bytes = await generateImageWithStabilityAI(stabilityApiKey, aiImagePrompt, selectedStyle, '1:1', selectedSubModel || 'stable-diffusion-v1-6', aiClient);
      } else if (aiClient) {
        base64Bytes = await generateImageFromPrompt(aiClient, aiImagePrompt, selectedStyle, '1:1', selectedSubModel || 'imagen-3.0-generate-002');
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
  
  const handleEditImageWithAI = async () => {
    if (!selectedImage || !stabilityApiKey || !editMode || !editPrompt.trim()) {
        setAiImageError('Please select an image, an edit mode, and provide a prompt.');
        return;
    }
    setIsEditingImage(true);
    setAiImageError('');
    try {
        let base64Bytes: string;
        if (editMode === 'upscale') {
            base64Bytes = await upscaleImageWithStabilityAI(stabilityApiKey, selectedImage, editPrompt);
        } else if (editMode === 'image-to-image') {
            base64Bytes = await imageToImageWithStabilityAI(stabilityApiKey, selectedImage, editPrompt);
        } else {
            // Placeholder for other edit modes like inpainting
            throw new Error('This edit mode is not yet implemented.');
        }
        const imageFile = base64ToFile(base64Bytes, "edited_image.jpeg");
        onImageGenerated(imageFile);
    } catch (e: any) {
        setAiImageError(e.message || 'An error occurred during image editing.');
    } finally {
        setIsEditingImage(false);
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
      const bestTime = await getBestPostingTime(aiClient, managedTarget.id);
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
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {editingScheduledPostId ? 'تعديل المنشور' : 'إنشاء منشور جديد'}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {editingScheduledPostId ? 'قم بتعديل منشورك المجدول' : 'أنشئ منشورًا جديدًا بمساعدة الذكاء الاصطناعي'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-gray-500 dark:text-gray-400">متصل</span>
        </div>
      </div>
      
      {/* AI Text Assistant */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <SparklesIcon className="w-3 h-3 text-white" />
            </div>
            <label htmlFor="ai-topic" className="text-sm font-semibold text-gray-700 dark:text-gray-300">مساعد النصوص بالذكاء الاصطناعي</label>
          </div>
          <div className="flex gap-3">
            <input 
              id="ai-topic" 
              type="text" 
              value={aiTopic} 
              onChange={(e) => setAiTopic(e.target.value)} 
              placeholder="اكتب فكرة للمنشور..." 
              className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
              disabled={isGeneratingText || !aiClient || isViewer}
            />
            <Button 
              onClick={handleGenerateTextWithAI} 
              isLoading={isGeneratingText} 
              disabled={!aiClient || isViewer}
              variant="primary"
              leftIcon={<SparklesIcon className="w-4 h-4" />}
            >
              توليد نص
            </Button>
          </div>
          {aiTextError && <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
            <span className="w-1 h-1 bg-red-500 rounded-full"></span>
            {aiTextError}
          </p>}
      </div>

      {/* Main Content Area */}
      <div className="space-y-4">
        <textarea 
          value={postText} 
          onChange={(e) => onPostTextChange(e.target.value)} 
          placeholder="بماذا تفكر؟ اكتب منشورك هنا..." 
          className="w-full h-48 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all" 
          disabled={isViewer} 
        />
        
        {/* AI Enhancement Tools */}
        <div className="flex gap-3 flex-wrap">
            <Button 
              variant="outline" 
              onClick={handleGenerateHashtags} 
              isLoading={isGeneratingHashtags} 
              disabled={!aiClient || !postText.trim() || isViewer}
              leftIcon={<HashtagIcon className="w-4 h-4" />}
              size="sm"
            >
                توليد هاشتاجات
            </Button>
            {selectedImage && (
                <Button 
                  variant="outline" 
                  onClick={handleGenerateImageDescription} 
                  isLoading={isGeneratingImageDescription} 
                  disabled={!aiClient || isViewer}
                  leftIcon={<WandSparklesIcon className="w-4 h-4" />}
                  size="sm"
                >
                    توليد وصف للصورة
                </Button>
            )}
            <Button 
              variant="outline" 
              onClick={handleSuggestTime} 
              isLoading={isSuggestingTime} 
              disabled={!aiClient || isViewer}
              leftIcon={<ClockIcon className="w-4 h-4" />}
              size="sm"
            >
                اقترح وقت النشر
            </Button>
        </div>
      </div>

      {/* Content Type Selection */}
      <div className="space-y-3">
        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">نوع المحتوى</label>
        <div className="grid grid-cols-3 gap-2">
            {postTypeOptions.map(({ type, label, icon: Icon, available }) => (
                <button 
                  key={type} 
                  onClick={() => setPostType(type)} 
                  disabled={!available || isViewer} 
                  className={`group p-3 rounded-xl border-2 text-sm font-medium flex flex-col items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${postType === type ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                >
                    <Icon className={`w-5 h-5 ${postType === type ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'}`} />
                    {label}
                </button>
            ))}
        </div>
      </div>

      {/* Image Preview */}
      {imagePreview && (
        <div className="relative inline-block">
          <div className="relative group">
            <img 
              src={imagePreview} 
              alt="Preview" 
              className="rounded-xl w-40 h-40 object-cover shadow-lg" 
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-xl"></div>
            
            {/* Action Buttons */}
            <div className="absolute top-2 right-2 flex gap-1">
              {!isViewer && (
                <button 
                  onClick={onImageRemove} 
                  className="w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center justify-center transition-all duration-200 shadow-lg"
                  title="حذف الصورة"
                >
                  <XCircleIcon className="w-4 h-4" />
                </button>
              )}
            </div>
            
            {stabilityApiKey && (
              <button 
                onClick={() => setEditMode(editMode ? null : 'image-to-image')} 
                className="absolute bottom-2 left-2 w-8 h-8 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center justify-center transition-all duration-200 shadow-lg"
                title="تعديل الصورة"
              >
                <PencilSquareIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Image Editor */}
      {editMode && selectedImage && (
          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <PencilSquareIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                تعديل الصورة
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <select
                      value={editMode}
                      onChange={(e) => setEditMode(e.target.value as EditMode)}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                      <option value="image-to-image">Image to Image</option>
                      <option value="upscale">Upscale</option>
                  </select>
                  <input
                      type="text"
                      value={editPrompt}
                      onChange={(e) => setEditPrompt(e.target.value)}
                      placeholder="وصف التعديل..."
                      className="md:col-span-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <Button 
                    onClick={handleEditImageWithAI} 
                    isLoading={isEditingImage}
                    className="w-full"
                  >
                      تعديل
                  </Button>
              </div>
          </div>
      )}

      {/* AI Image Generator */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-xl border border-purple-200 dark:border-purple-800 space-y-4">
          <div className="flex items-center justify-between">
             <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                  <PhotoIcon className="w-3 h-3 text-white" />
                </div>
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">مولّد الصور بالذكاء الاصطناعي</label>
             </div>
             <div className="flex bg-gray-200 dark:bg-gray-700 rounded-lg p-1 text-xs">
                <button 
                  onClick={() => {setImageGenerationService('gemini'); setSelectedSubModel('');}} 
                  className={`px-3 py-1.5 rounded-md transition-all ${imageGenerationService === 'gemini' ? 'bg-white dark:bg-gray-900 shadow text-blue-600' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`} 
                  disabled={!aiClient}
                >
                  Gemini
                </button>
                <button 
                  onClick={() => {setImageGenerationService('stability'); setSelectedSubModel('');}} 
                  className={`px-3 py-1.5 rounded-md transition-all ${imageGenerationService === 'stability' ? 'bg-white dark:bg-gray-900 shadow text-purple-600' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`} 
                  disabled={!stabilityApiKey}
                >
                  Stability
                </button>
             </div>
          </div>
          <div className="flex gap-3">
            <input 
              id="ai-image-prompt" 
              type="text" 
              value={aiImagePrompt} 
              onChange={(e) => setAiImagePrompt(e.target.value)} 
              placeholder="وصف الصورة، مثلاً: رائد فضاء على المريخ" 
              className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all" 
              disabled={isGeneratingImage || isViewer} 
            />
            <Button 
              onClick={handleGenerateImageWithAI} 
              isLoading={isGeneratingImage} 
              disabled={isViewer || (imageGenerationService === 'gemini' && !aiClient) || (imageGenerationService === 'stability' && !stabilityApiKey)}
              variant="primary"
              leftIcon={<PhotoIcon className="w-4 h-4" />}
            >
                إنشاء صورة
            </Button>
          </div>
          
          {/* Image Style and Model Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="image-style" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">النمط</label>
              <select
                  id="image-style"
                  value={selectedStyle}
                  onChange={(e) => setSelectedStyle(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  disabled={isGeneratingImage || isViewer}
              >
                  {imageStyles.map(style => (
                      <option key={style} value={style}>{style}</option>
                  ))}
              </select>
            </div>
            <div>
              <label htmlFor="image-model" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الموديل</label>
              {imageGenerationService === 'gemini' ? (
                  <select
                      id="image-model"
                      value={selectedSubModel}
                      onChange={(e) => setSelectedSubModel(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      disabled={isGeneratingImage || isViewer}
                  >
                      <option value="">اختر الموديل</option>
                      {geminiModels.map(model => (
                          <option key={model} value={model}>{model}</option>
                      ))}
                  </select>
              ) : (
                  <select
                      id="image-model"
                      value={selectedSubModel}
                      onChange={(e) => setSelectedSubModel(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      disabled={isGeneratingImage || isViewer}
                  >
                      <option value="">اختر الموديل</option>
                      {Object.entries(stabilitySubModels).map(([category, models]) => (
                          <optgroup label={category} key={category}>
                              {models.map(model => (
                                  <option key={model} value={model}>{model}</option>
                              ))}
                          </optgroup>
                      ))}
                  </select>
              )}
            </div>
          </div>
          {aiImageError && <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
            <span className="w-1 h-1 bg-red-500 rounded-full"></span>
            {aiImageError}
          </p>}
      </div>

      {/* Scheduling Section */}
      <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
            <div className='flex items-center'>
              <input 
                id="schedule-checkbox" 
                type="checkbox" 
                checked={isScheduled} 
                onChange={e => onIsScheduledChange(e.target.checked)} 
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                disabled={isViewer}
              />
              <label htmlFor="schedule-checkbox" className="mr-2 text-sm font-medium text-gray-700 dark:text-gray-300">جدولة المنشور</label>
            </div>
            <Button 
              variant="outline" 
              onClick={handleSuggestTime} 
              isLoading={isSuggestingTime} 
              disabled={!aiClient || isViewer}
              leftIcon={<LightBulbIcon className="w-4 h-4" />}
              size="sm"
            >
                اقتراح أفضل وقت
            </Button>
        </div>
        {isScheduled && (
            <div className="mt-3">
                <input 
                  type="datetime-local" 
                  value={scheduleDate} 
                  onChange={e => onScheduleDateChange(e.target.value)} 
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                  disabled={isViewer}
                />
            </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
            <input type="file" id="imageUpload" className="hidden" accept="image/*" onChange={onImageChange} />
            <Button 
              variant="outline" 
              onClick={() => document.getElementById('imageUpload')?.click()} 
              disabled={isViewer}
              leftIcon={<PhotoIcon className="w-4 h-4" />}
            >
                أضف صورة
            </Button>
            
            {/* Instagram Toggle */}
            {includeInstagram !== undefined && (
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="instagram-toggle"
                  checked={includeInstagram}
                  onChange={(e) => onIncludeInstagramChange(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                  disabled={isViewer}
                />
                <label htmlFor="instagram-toggle" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                  <InstagramIcon className="w-4 h-4 text-pink-600" />
                  انشر على انستغرام
                </label>
              </div>
            )}
        </div>
        
        <div className="flex items-center gap-3">
         <Button 
           variant="outline" 
           onClick={onSaveDraft} 
           disabled={isPublishing || isViewer}
           leftIcon={<ArchiveBoxIcon className="w-4 h-4" />}
         >
           حفظ كمسودة
         </Button>
         <Button 
           onClick={() => onPublish(postType, {})} 
           isLoading={isPublishing} 
           disabled={isViewer}
           variant="primary"
         >
           {getPublishButtonText()}
         </Button>
        </div>
      </div>
    </div>
  );
};

export default PostComposer;
