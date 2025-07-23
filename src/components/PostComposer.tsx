
import React, { useState, useEffect } from 'react';
import Button from './ui/Button';
import PhotoIcon from './icons/PhotoIcon';
import SparklesIcon from './icons/SparklesIcon';
import WandSparklesIcon from './icons/WandSparklesIcon';
import { generatePostSuggestion, generateImageFromPrompt, getBestPostingTime, generateHashtags, generateDescriptionForImage } from '../services/geminiService';
import { generateImageWithStabilityAI, getStabilityAIModels, imageToImageWithStabilityAI, upscaleImageWithStabilityAI, inpaintingWithStabilityAI } from '../services/stabilityai';
import { GoogleGenAI } from '@google/genai';
import { Target, PageProfile, Role, Plan, PostType } from '../types'; // <-- استيراد PostType
import InstagramIcon from './icons/InstagramIcon';
import HashtagIcon from './icons/HashtagIcon';
import CanvaIcon from './icons/CanvaIcon';
import ArrowPathIcon from './icons/ArrowPathIcon';
import ArrowUpTrayIcon from './icons/ArrowUpTrayIcon';
import XCircleIcon from './icons/XCircleIcon';
import PencilSquareIcon from './icons/PencilSquareIcon';
import Squares2x2Icon from './icons/Squares2x2Icon'; // أيقونة للمنشور
import StarIcon from './icons/StarIcon';       // أيقونة للقصة
import ClockIcon from './icons/ClockIcon';     // أيقونة للريلز


interface PostComposerProps {
  onPublish: (postType: PostType) => Promise<void>; // <-- تعديل onPublish
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

// Helper to create a dummy mask for Inpainting functionality
const createDummyMask = (width: number, height: number): Promise<File> => {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            // For this dummy version, we'll just create a rectangular mask in the center.
            // A real implementation would use a drawing canvas library.
            ctx.fillStyle = 'black'; // Mask is black
            ctx.fillRect(0, 0, width, height);
            ctx.fillStyle = 'white'; // Area to be inpainted is white
            ctx.fillRect(width * 0.25, height * 0.25, width * 0.5, height * 0.5);
        }
        canvas.toBlob((blob) => {
            if (blob) {
                resolve(new File([blob], 'mask.png', { type: 'image/png' }));
            }
        }, 'image/png');
    });
};


const formatDateTimeForInput = (date: Date) => {
    const pad = (num: number) => num.toString().padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const PostComposer: React.FC<PostComposerProps> = ({
  onPublish,
  onSaveDraft,
  isPublishing,
  postText,
  onPostTextChange,
  onImageChange,
  onImageGenerated,
  onImageRemove,
  imagePreview,
  selectedImage,
  isScheduled,
  onIsScheduledChange,
  scheduleDate,
  onScheduleDateChange,
  error,
  aiClient,
  stabilityApiKey,
  managedTarget,
  linkedInstagramTarget,
  includeInstagram,
  onIncludeInstagramChange,
  pageProfile,
  editingScheduledPostId,
  role,
  userPlan
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

  const [stabilityModels, setStabilityModels] = useState<any[]>([]);
  const [stabilityModel, setStabilityModel] = useState<string>('stable-diffusion-v1-6'); 
  
  const [isUpscaling, setIsUpscaling] = useState(false);
  const [upscaleError, setUpscaleError] = useState('');

  const [isImageToImageModalOpen, setIsImageToImageModalOpen] = useState(false);
  const [imageToImagePrompt, setImageToImagePrompt] = useState('');
  const [imageToImageStrength, setImageToImageStrength] = useState(0.6);
  const [isGeneratingImageToImage, setIsGeneratingImageToImage] = useState(false);
  const [imageToImageError, setImageToImageError] = useState('');

  const [isInpaintingModalOpen, setIsInpaintingModalOpen] = useState(false);
  const [inpaintingPrompt, setInpaintingPrompt] = useState('');
  const [isGeneratingInpainting, setIsGeneratingInpainting] = useState(false);
  const [inpaintingError, setInpaintingError] = useState('');

  const [isSuggestingTime, setIsSuggestingTime] = useState(false);
  const [aiTimeError, setAiTimeError] = useState('');
  const [isGeneratingHashtags, setIsGeneratingHashtags] = useState(false);
  const [aiHashtagError, setAiHashtagError] = useState('');

  const [postType, setPostType] = useState<PostType>('post'); // <-- جديد: حالة نوع المنشور

  const isViewer = role === 'viewer';
  const isAdmin = userPlan?.adminOnly;

  useEffect(() => {
    if (stabilityApiKey) {
      getStabilityAIModels(stabilityApiKey)
        .then(models => {
            const allModels = [
                ...models.map((m: any) => ({id: m.id, name: m.name}))
            ];
            setStabilityModels(allModels);
            if(allModels.length > 0 && !allModels.find(m => m.id === stabilityModel)) {
                setStabilityModel(allModels[0].id);
            }
        })
        .catch(err => {
            console.error("Failed to fetch stability models", err);
        });
    }
  }, [stabilityApiKey]);

  // --- جديد: تحديث نسبة العرض إلى الارتفاع بناءً على نوع المنشور ---
  useEffect(() => {
    if (postType === 'story' || postType === 'reel') {
        setImageAspectRatio('9:16');
    } else {
        setImageAspectRatio('1:1');
    }
  }, [postType]);

  const handleGenerateTextWithAI = async () => {
      if (!aiClient) {
          setAiTextError('ميزات الذكاء الاصطناعي معطلة. يرجى إدخال مفتاح Gemini API في الإعدادات لتفعيلها.');
          return;
      }
      if (!aiTopic.trim()) {
          setAiTextError('يرجى إدخال موضوع لتوليد منشور عنه.');
          return;
      }
      setAiTextError('');
      setIsGeneratingText(true);
      try {
        const suggestion = await generatePostSuggestion(aiClient, aiTopic, pageProfile);
        onPostTextChange(suggestion);
      } catch (e: any) {
        setAiTextError(e.message || 'حدث خطأ غير متوقع أثناء توليد النص.');
      } finally {
        setIsGeneratingText(false);
      }
  };

  const handleGenerateImageDescription = async () => {
    if (!aiClient || !selectedImage) return;
    setIsGeneratingDesc(true);
    setAiTextError('');
    try {
        const description = await generateDescriptionForImage(aiClient, selectedImage, pageProfile);
        onPostTextChange(description);
    } catch (e: any) {
        setAiTextError(e.message || 'Failed to generate description.');
    } finally {
        setIsGeneratingDesc(false);
    }
  };

  const handleGenerateImageWithAI = async () => {
    if (!aiImagePrompt.trim()) {
      setAiImageError('يرجى إدخال وصف لإنشاء الصورة.');
      return;
    }
    setAiImageError('');
    setIsGeneratingImage(true);
    
    try {
      let base64Bytes: string;
      if (imageService === 'stability') {
        if (!stabilityApiKey) throw new Error("مفتاح Stability AI API غير مكوّن. يرجى إضافته في الإعدادات.");
        base64Bytes = await generateImageWithStabilityAI(stabilityApiKey, aiImagePrompt, imageStyle, imageAspectRatio, stabilityModel, aiClient);
      } else { // 'gemini'
        if (!aiClient) throw new Error("مفتاح Gemini API غير مكوّن. يرجى إضافته في الإعدادات.");
        base64Bytes = await generateImageFromPrompt(aiClient, aiImagePrompt, imageStyle, imageAspectRatio);
      }
      const imageFile = base64ToFile(base64Bytes, `${aiImagePrompt.substring(0, 20).replace(/\s/g, '_')}.jpeg`);
      onImageGenerated(imageFile);
    } catch (e: any) {
      setAiImageError(e.message || 'حدث خطأ غير متوقع. يرجى التأكد من أن وصفك لا ينتهك سياسات المحتوى.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleUpscaleImage = async () => {
    if (!selectedImage || !stabilityApiKey) return;
    setIsUpscaling(true);
    setUpscaleError('');
    try {
      const upscaledBase64 = await upscaleImageWithStabilityAI(stabilityApiKey, selectedImage, "Upscale to improve quality and details");
      const imageFile = base64ToFile(upscaledBase64, `upscaled_${selectedImage.name}`);
      onImageGenerated(imageFile);
    } catch(e: any) {
      setUpscaleError(e.message || 'An unexpected error occurred during upscaling.');
    } finally {
      setIsUpscaling(false);
    }
  };
  
  const handleImageToImage = async () => {
    if (!selectedImage || !stabilityApiKey || !imageToImagePrompt.trim()) {
        setImageToImageError("Please provide a prompt.");
        return;
    };
    setIsGeneratingImageToImage(true);
    setImageToImageError('');
    try {
        const resultBase64 = await imageToImageWithStabilityAI(stabilityApiKey, selectedImage, imageToImagePrompt, stabilityModel, imageToImageStrength);
        const imageFile = base64ToFile(resultBase64, `img2img_${selectedImage.name}`);
        onImageGenerated(imageFile);
        setIsImageToImageModalOpen(false);
    } catch(e: any) {
        setImageToImageError(e.message || 'An unexpected error occurred during image-to-image generation.');
    } finally {
        setIsGeneratingImageToImage(false);
    }
  };

  const handleInpainting = async () => {
    if (!selectedImage || !stabilityApiKey || !inpaintingPrompt.trim()) {
        setInpaintingError("Please provide a description for the edit.");
        return;
    }
    setIsGeneratingInpainting(true);
    setInpaintingError('');
    try {
        const image = new Image();
        image.src = imagePreview!; // Use imagePreview which is a URL
        await new Promise(resolve => { image.onload = resolve; });

        const maskFile = await createDummyMask(image.naturalWidth, image.naturalHeight);

        const resultBase64 = await inpaintingWithStabilityAI(stabilityApiKey, selectedImage, maskFile, inpaintingPrompt, stabilityModel);
        const imageFile = base64ToFile(resultBase64, `inpainted_${selectedImage.name}`);
        onImageGenerated(imageFile);
        setIsInpaintingModalOpen(false);
    } catch (e: any) {
        setInpaintingError(e.message || 'An unexpected error occurred during inpainting.');
    } finally {
        setIsGeneratingInpainting(false);
    }
  };

  const handleSuggestTimeWithAI = async () => {
    if (!aiClient) return;
    if (!postText.trim()) {
        setAiTimeError('اكتب نص المنشور أولاً لاقتراح وقت.');
        return;
    }
    setAiTimeError('');
    setIsSuggestingTime(true);
    try {
        const suggestedDate = await getBestPostingTime(aiClient, postText);
        onScheduleDateChange(formatDateTimeForInput(suggestedDate));
        onIsScheduledChange(true);
    } catch (e: any) {
        setAiTimeError(e.message || 'حدث خطأ غير متوقع. قد تكون استجابة الذكاء الاصطناعي غير صالحة.');
    } finally {
        setIsSuggestingTime(false);
    }
  };

  const handleGenerateHashtags = async () => {
    if (!aiClient) return;
    if (!postText.trim() && !selectedImage) {
        setAiHashtagError('اكتب نصًا أو أضف صورة أولاً لاقتراح هاشتاجات.');
        return;
    }
    setAiHashtagError('');
    setIsGeneratingHashtags(true);
    try {
        const hashtags = await generateHashtags(aiClient, postText, pageProfile, selectedImage ?? undefined);
        const hashtagString = hashtags.join(' ');
        onPostTextChange(postText ? `${postText}

${hashtagString}` : hashtagString);
    } catch (e: any) {
        setAiHashtagError(e.message || 'حدث خطأ غير متوقع.');
    } finally {
        setIsGeneratingHashtags(false);
    }
  };

  const handleCanvaClick = () => {
    window.open('https://canva.com', '_blank');
  };

  const aiHelperText = !aiClient ? (
    <p className="text-yellow-600 dark:text-yellow-400 text-sm mt-2">
      ميزات الذكاء الاصطناعي معطلة. يرجى إدخال مفتاح Gemini API في الإعدادات لتفعيلها.
    </p>
  ) : null;
  
  const getPublishButtonText = () => {
    if (isPublishing) return 'جاري العمل...';
    if (isScheduled) {
        if (!isAdmin && userPlan?.limits.contentApprovalWorkflow && role === 'editor') {
            return 'إرسال للمراجعة';
        }
        return editingScheduledPostId ? 'تحديث الجدولة' : 'جدولة الآن';
    }
    return 'انشر الآن';
  };

  const imageStyles = [
    { value: 'Photographic', label: 'فوتوغرافي' }, { value: 'Cinematic', label: 'سينمائي' },
    { value: 'Digital Art', label: 'فن رقمي' }, { value: 'Anime', label: 'أنمي' },
    { value: 'Fantasy', label: 'خيالي' }, { value: 'Neon Punk', label: 'نيون بانك' },
  ];

  const aspectRatios = [
    { value: '1:1', label: 'مربع (1:1)' }, { value: '16:9', label: 'عريض (16:9)' }, { value: '9:16', label: 'طولي (9:16)' },
  ];
  
  // --- جديد: خيارات نوع المنشور ---
  const postTypeOptions = [
    { type: 'post' as PostType, label: 'منشور', icon: Squares2x2Icon, available: true },
    { type: 'story' as PostType, label: 'قصة', icon: StarIcon, available: includeInstagram || managedTarget.type === 'instagram' },
    { type: 'reel' as PostType, label: 'ريل', icon: ClockIcon, available: includeInstagram || managedTarget.type === 'instagram' },
  ];


  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg space-y-6">
      
      {/* ... (الكود الخاص بالنوافذ المنبثقة يبقى كما هو) ... */}

      <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{editingScheduledPostId ? 'تعديل المنشور المجدول' : 'إنشاء منشور جديد'}</h2>
      
      {/* ... (كود مساعد النصوص يبقى كما هو) ... */}

      <textarea value={postText} onChange={(e) => onPostTextChange(e.target.value)} placeholder="بماذا تفكر؟ اكتب منشورك هنا..." className="w-full h-48 p-3 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition" disabled={isViewer} />
      
      {/* --- جديد: محدد نوع المنشور --- */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          نوع المحتوى
        </label>
        <div className="flex bg-gray-200 dark:bg-gray-700 rounded-lg p-1 space-x-1">
            {postTypeOptions.map(({ type, label, icon: Icon, available }) => (
                <button 
                    key={type}
                    onClick={() => setPostType(type)}
                    disabled={!available || isViewer}
                    className={`flex-1 p-2 rounded-md text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${postType === type ? 'bg-white dark:bg-gray-900 shadow text-blue-600' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
                    title={!available ? `متاح فقط لمنشورات انستغرام` : ''}
                >
                    <Icon className="w-5 h-5" />
                    {label}
                </button>
            ))}
        </div>
        {(postType === 'story' || postType === 'reel') && !imagePreview && (
            <p className="text-yellow-600 dark:text-yellow-400 text-sm mt-2">
               القصص والريلز تتطلب وجود صورة أو فيديو.
            </p>
        )}
      </div>

      {/* ... (كود اقتراح الهاشتاجات وصورة المعاينة يبقى كما هو) ... */}

      {imagePreview && (
        <div className="space-y-4 p-4 border rounded-md dark:border-gray-700">
          <div className="relative w-40">
            <img src={imagePreview} alt="Preview" className="rounded-lg w-full h-auto" />
            {!isViewer && <button onClick={onImageRemove} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 leading-none w-6 h-6 flex items-center justify-center text-lg" aria-label="Remove image">&times;</button>}
          </div>
          {/* ... */}
        </div>
      )}
      
      {includeInstagram && !imagePreview && postType !== 'post' && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-md text-sm">
          <b>ملاحظة:</b> {postType === 'story' ? 'القصص' : 'الريلز'} تتطلب وجود صورة. يرجى إضافة صورة للمتابعة.
        </div>
      )}
      
      {/* ... (كود مولد الصور يبقى كما هو, لكن مع تعديل بسيط) ... */}
       <div className="p-4 border border-purple-200 dark:border-purple-900 rounded-lg bg-purple-50 dark:bg-gray-700/50 space-y-3">
          {/* ... */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* ... */}
            <div className="grid grid-cols-2 gap-2">
                <select id="aspect-ratio" value={imageAspectRatio} onChange={e => setImageAspectRatio(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 focus:ring-purple-500 focus:border-purple-500 text-sm" disabled={isViewer || postType !== 'post'}>
                    {aspectRatios.map(ar => <option key={ar.value} value={ar.value}>{ar.label}</option>)}
                </select>
                {/* ... */}
            </div>
          </div>
          {/* ... */}
      </div>

      {/* ... (بقية الكود مع تعديل زر النشر) ... */}

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* ... */}
        <div className="flex items-center gap-2">
         <Button variant="secondary" onClick={onSaveDraft} disabled={isPublishing || (!postText.trim() && !imagePreview) || isViewer}>حفظ كمسودة</Button>
        <Button onClick={() => onPublish(postType)} isLoading={isPublishing} disabled={(!postText.trim() && !imagePreview) || ((includeInstagram || postType !== 'post') && !imagePreview) || isViewer}>{getPublishButtonText()}</Button>
        </div>
      </div>
    </div>
  );
};

export default PostComposer;
