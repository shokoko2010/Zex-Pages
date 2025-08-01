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
          {stabilityApiKey && (
            <Button variant="secondary" onClick={() => setEditMode(editMode ? null : 'image-to-image')} className="absolute bottom-2 left-2">
              <PencilSquareIcon className="w-5 h-5" />
            </Button>
          )}
        </div>
      )}

      {editMode && selectedImage && (
          <div className="p-4 border rounded-lg bg-gray-100 dark:bg-gray-700/50 space-y-3">
              <h3 className="text-lg font-semibold">تعديل الصورة</h3>
              <div className="flex gap-2">
                  <select
                      value={editMode}
                      onChange={(e) => setEditMode(e.target.value as EditMode)}
                      className="p-2 border rounded-md bg-white dark:bg-gray-800"
                  >
                      <option value="image-to-image">Image to Image</option>
                      <option value="upscale">Upscale</option>
                      {/* Add other edit modes here */}
                  </select>
                  <input
                      type="text"
                      value={editPrompt}
                      onChange={(e) => setEditPrompt(e.target.value)}
                      placeholder="وصف التعديل..."
                      className="flex-grow p-2 border rounded-md bg-white dark:bg-gray-800"
                  />
                  <Button onClick={handleEditImageWithAI} isLoading={isEditingImage}>
                      تعديل
                  </Button>
              </div>
          </div>
      )}

      <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-700/50 space-y-3">
          <div className="flex justify-between items-center">
             <label className="block text-sm font-medium">مولّد الصور بالذكاء الاصطناعي 🤖</label>
             <div className="flex bg-gray-200 dark:bg-gray-700 rounded-lg p-1 text-xs">
                <button onClick={() => {setImageGenerationService('gemini'); setSelectedSubModel('');}} className={`px-2 py-1 rounded-md ${imageGenerationService === 'gemini' ? 'bg-white dark:bg-gray-900 shadow' : ''}`} disabled={!aiClient}>Gemini</button>
                <button onClick={() => {setImageGenerationService('stability'); setSelectedSubModel('');}} className={`px-2 py-1 rounded-md ${imageGenerationService === 'stability' ? 'bg-white dark:bg-gray-900 shadow' : ''}`} disabled={!stabilityApiKey}>Stability</button>
             </div>
          </div>
          <div className="flex gap-2">
            <input id="ai-image-prompt" type="text" value={aiImagePrompt} onChange={(e) => setAiImagePrompt(e.target.value)} placeholder="وصف الصورة، مثلاً: رائد فضاء على المريخ" className="flex-grow p-2 border rounded-md bg-white dark:bg-gray-800" disabled={isGeneratingImage || isViewer} />
            <Button onClick={handleGenerateImageWithAI} isLoading={isGeneratingImage} disabled={isViewer || (imageGenerationService === 'gemini' && !aiClient) || (imageGenerationService === 'stability' && !stabilityApiKey)}>
                <PhotoIcon className="w-5 h-5 ml-1"/> إنشاء صورة
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
                <label htmlFor="image-style" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">النمط</label>
                <select
                    id="image-style"
                    value={selectedStyle}
                    onChange={(e) => setSelectedStyle(e.target.value)}
                    className="w-full p-2 border rounded-md bg-white dark:bg-gray-800"
                    disabled={isGeneratingImage || isViewer}
                >
                    {imageStyles.map(style => (
                        <option key={style} value={style}>{style}</option>
                    ))}
                </select>
            </div>
            <div>
              <label htmlFor="image-model" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الموديل</label>
              {imageGenerationService === 'gemini' ? (
                  <select
                      id="image-model"
                      value={selectedSubModel}
                      onChange={(e) => setSelectedSubModel(e.target.value)}
                      className="w-full p-2 border rounded-md bg-white dark:bg-gray-800"
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
                      className="w-full p-2 border rounded-md bg-white dark:bg-gray-800"
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
