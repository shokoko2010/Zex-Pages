import React, { useState, useEffect } from 'react';
import Button from './ui/Button';
import PhotoIcon from './icons/PhotoIcon';
import SparklesIcon from './icons/SparklesIcon';
import WandSparklesIcon from './icons/WandSparklesIcon';
import { generatePostSuggestion, generateImageFromPrompt, getBestPostingTime, generateHashtags, generateDescriptionForImage } from '../services/geminiService';
import { generateImageWithStabilityAI, getStabilityAIModels, imageToImageWithStabilityAI, upscaleImageWithStabilityAI, inpaintingWithStabilityAI } from '../services/stabilityai';
import { GoogleGenAI } from '@google/genai';
import { Target, PageProfile, Role, Plan } from '../types';
import InstagramIcon from './icons/InstagramIcon';
import HashtagIcon from './icons/HashtagIcon';
import CanvaIcon from './icons/CanvaIcon';
import ArrowPathIcon from './icons/ArrowPathIcon';
import ArrowUpTrayIcon from './icons/ArrowUpTrayIcon';
import XCircleIcon from './icons/XCircleIcon';
import PencilSquareIcon from './icons/PencilSquareIcon';


interface PostComposerProps {
  onPublish: () => Promise<void>;
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
        onPostTextChange(postText ? `${postText}\n\n${hashtagString}` : hashtagString);
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

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg space-y-6">
      
      {/* Inpainting Modal */}
      {isInpaintingModalOpen && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
           <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-2xl space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white">تعديل الصورة (Inpainting)</h3>
                <button onClick={() => setIsInpaintingModalOpen(false)} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white">
                    <XCircleIcon className="w-6 h-6"/>
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                  <div className="space-y-2">
                    <label htmlFor="inpainting-prompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300">صف التعديل المطلوب</label>
                    <textarea id="inpainting-prompt" value={inpaintingPrompt} onChange={e => setInpaintingPrompt(e.target.value)} placeholder="مثال: أزل الشخص من الخلفية" className="mt-1 w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 h-24"/>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        ملاحظة: حالياً، يتم تطبيق التعديل على المنطقة الوسطى من الصورة. أداة التحديد الدقيق قيد التطوير.
                    </p>
                  </div>
                  <div className="space-y-2">
                     <p className="block text-sm font-medium text-gray-700 dark:text-gray-300">معاينة</p>
                     <div className="relative">
                        {imagePreview && <img src={imagePreview} alt="Inpainting preview" className="rounded-lg w-full h-auto" />}
                        <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2 border-2 border-dashed border-white opacity-75 pointer-events-none" title="المنطقة التي سيتم تعديلها (مؤقتاً)"></div>
                     </div>
                  </div>
              </div>
              {inpaintingError && <p className="text-red-500 text-sm">{inpaintingError}</p>}
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setIsInpaintingModalOpen(false)}>إلغاء</Button>
                <Button onClick={handleInpainting} isLoading={isGeneratingInpainting}>
                    {isGeneratingInpainting ? 'جاري التعديل...' : 'طبّق التعديل'}
                </Button>
              </div>
               <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1">
                سيتم إرسال صورتك والوصف إلى Stability AI لمعالجة الطلب.
               </p>
           </div>
         </div>
       )}

      {/* Image-to-Image Modal */}
      {isImageToImageModalOpen && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
           <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-lg space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white">تحويل صورة إلى صورة</h3>
                <button onClick={() => setIsImageToImageModalOpen(false)} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white">
                    <XCircleIcon className="w-6 h-6"/>
                </button>
              </div>
              <div>
                <label htmlFor="img2img-prompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300">الوصف الجديد</label>
                <input id="img2img-prompt" type="text" value={imageToImagePrompt} onChange={e => setImageToImagePrompt(e.target.value)} placeholder="مثال: اجعلها تبدو كلوحة زيتية" className="mt-1 w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"/>
              </div>
              <div>
                 <label htmlFor="img2img-strength" className="block text-sm font-medium text-gray-700 dark:text-gray-300">قوة الصورة الأصلية ({imageToImageStrength.toFixed(2)})</label>
                 <input id="img2img-strength" type="range" min="0" max="1" step="0.05" value={imageToImageStrength} onChange={e => setImageToImageStrength(parseFloat(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"/>
              </div>
              {imageToImageError && <p className="text-red-500 text-sm">{imageToImageError}</p>}
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setIsImageToImageModalOpen(false)}>إلغاء</Button>
                <Button onClick={handleImageToImage} isLoading={isGeneratingImageToImage}>
                    {isGeneratingImageToImage ? 'جاري التحويل...' : 'حوّل الصورة'}
                </Button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1">
                سيتم إرسال صورتك والوصف الجديد إلى Stability AI لمعالجة الطلب.
               </p>
           </div>
         </div>
       )}

      <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{editingScheduledPostId ? 'تعديل المنشور المجدول' : 'إنشاء منشور جديد'}</h2>
      
      <div className="p-4 border border-blue-200 dark:border-blue-900 rounded-lg bg-blue-50 dark:bg-gray-700/50">
          <label htmlFor="ai-topic" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            مساعد النصوص بالذكاء الاصطناعي ✨
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input id="ai-topic" type="text" value={aiTopic} onChange={(e) => setAiTopic(e.target.value)} placeholder="اكتب فكرة للمنشور، مثلاً: إطلاق منتج جديد" className="flex-grow p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 focus:ring-blue-500 focus:border-blue-500" disabled={isGeneratingText || !aiClient || isViewer}/>
            <Button onClick={handleGenerateTextWithAI} isLoading={isGeneratingText} disabled={!aiClient || isViewer}><SparklesIcon className="w-5 h-5 ml-2"/>{isGeneratingText ? 'جاري التوليد...' : 'ولّد لي نصاً'}</Button>
          </div>
          {aiTextError && <p className="text-red-500 text-sm mt-2">{aiTextError}</p>}
          {aiHelperText}
      </div>

      <textarea value={postText} onChange={(e) => onPostTextChange(e.target.value)} placeholder="بماذا تفكر؟ اكتب منشورك هنا..." className="w-full h-48 p-3 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition" disabled={isViewer} />
        
      <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={handleGenerateHashtags} isLoading={isGeneratingHashtags} disabled={!aiClient || (!postText.trim() && !selectedImage) || isViewer} variant="secondary" className="w-full sm:w-auto">
              <HashtagIcon className="w-5 h-5 ml-2"/>
              {isGeneratingHashtags ? 'جاري...' : 'اقترح هاشتاجات'}
          </Button>
      </div>
      {aiHashtagError && <p className="text-red-500 text-sm mt-2">{aiHashtagError}</p>}

      {imagePreview && (
        <div className="space-y-4 p-4 border rounded-md dark:border-gray-700">
          <div className="relative w-40">
            <img src={imagePreview} alt="Preview" className="rounded-lg w-full h-auto" />
            {!isViewer && <button onClick={onImageRemove} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 leading-none w-6 h-6 flex items-center justify-center text-lg" aria-label="Remove image">&times;</button>}
          </div>
          <div className="flex flex-wrap gap-2">
             <Button onClick={handleGenerateImageDescription} isLoading={isGeneratingDesc} disabled={!aiClient || !selectedImage || isGeneratingDesc || isViewer} variant="secondary" size="sm">
                <SparklesIcon className="w-4 h-4 ml-2" /> ولّد نصًا من الصورة
             </Button>
             <Button onClick={() => setIsImageToImageModalOpen(true)} disabled={isViewer || !stabilityApiKey || !selectedImage} variant="secondary" size="sm" title="تحويل الصورة لصورة أخرى (Stability AI)">
                <ArrowPathIcon className="w-4 h-4 ml-2" /> صورة-إلى-صورة
             </Button>
             <Button onClick={handleUpscaleImage} isLoading={isUpscaling} disabled={isViewer || !selectedImage || !stabilityApiKey} variant="secondary" size="sm" title="تحسين دقة الصورة (Stability AI)">
                <ArrowUpTrayIcon className="w-4 h-4 ml-2" /> {isUpscaling ? 'جاري التحسين...' : 'تحسين الدقة'}
             </Button>
             <Button onClick={() => setIsInpaintingModalOpen(true)} disabled={isViewer || !stabilityApiKey || !selectedImage} variant="secondary" size="sm" title="تعديل أجزاء من الصورة (Stability AI)">
                <PencilSquareIcon className="w-4 h-4 ml-2" /> تعديل الصورة
             </Button>
          </div>
           {upscaleError && <p className="text-red-500 text-sm mt-2">{upscaleError}</p>}
        </div>
      )}
      
      {includeInstagram && !imagePreview && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-md text-sm">
          <b>ملاحظة:</b> منشورات انستجرام تتطلب وجود صورة. يرجى إضافة صورة للمتابعة.
        </div>
      )}
      
      <div className="p-4 border border-purple-200 dark:border-purple-900 rounded-lg bg-purple-50 dark:bg-gray-700/50 space-y-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">مولّد الصور بالذكاء الاصطناعي 🤖</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex bg-gray-200 dark:bg-gray-600 rounded-lg p-1">
                <button onClick={() => setImageService('gemini')} disabled={!aiClient || isViewer} className={`w-1/2 p-2 rounded-md text-sm font-semibold transition-colors ${imageService === 'gemini' ? 'bg-white dark:bg-gray-900 shadow text-purple-600' : 'text-gray-600 dark:text-gray-300'} disabled:opacity-50 disabled:cursor-not-allowed`}>
                    Gemini
                </button>
                <button onClick={() => setImageService('stability')} disabled={!stabilityApiKey || isViewer} className={`w-1/2 p-2 rounded-md text-sm font-semibold transition-colors ${imageService === 'stability' ? 'bg-white dark:bg-gray-900 shadow text-purple-600' : 'text-gray-600 dark:text-gray-300'} disabled:opacity-50 disabled:cursor-not-allowed`}>
                    Stability AI
                </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
                <select id="aspect-ratio" value={imageAspectRatio} onChange={e => setImageAspectRatio(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 focus:ring-purple-500 focus:border-purple-500 text-sm" disabled={isViewer}>
                    {aspectRatios.map(ar => <option key={ar.value} value={ar.value}>{ar.label}</option>)}
                </select>
                <select id="image-style" value={imageStyle} onChange={e => setImageStyle(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 focus:ring-purple-500 focus:border-purple-500 text-sm" disabled={isViewer}>
                    {imageStyles.map(style => <option key={style.value} value={style.value}>{style.label}</option>)}
                </select>
            </div>
          </div>

          {imageService === 'stability' && (
            <div>
              <label htmlFor="stability-model" className="sr-only">نموذج Stability</label>
              <select id="stability-model" value={stabilityModel} onChange={e => setStabilityModel(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 focus:ring-purple-500 focus:border-purple-500 text-sm" disabled={!stabilityApiKey || stabilityModels.length === 0 || isViewer}>
                {stabilityModels.length > 0 ? (
                    stabilityModels.map(model => <option key={model.id} value={model.id}>{model.name}</option>)
                ) : (
                    <option>جاري تحميل النماذج...</option>
                )}
              </select>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <input id="ai-image-prompt" type="text" value={
aiImagePrompt} onChange={(e) => setAiImagePrompt(e.target.value)} placeholder="وصف الصورة، مثلاً: رائد فضاء يقرأ على المريخ" className="flex-grow p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 focus:ring-purple-500 focus:border-purple-500" disabled={isGeneratingImage || ((imageService === 'gemini' && !aiClient) || (imageService === 'stability' && !stabilityApiKey)) || isViewer}/>
<Button
  onClick={handleGenerateImageWithAI}
  isLoading={isGeneratingImage}
  className="bg-purple-600 hover:bg-purple-700 focus:ring-purple-500"
  disabled={isViewer || isGeneratingImage || (imageService === 'gemini' && !aiClient) || (imageService === 'stability' && !stabilityApiKey)}
  title={imageService === 'stability' && !aiClient ? "تتطلب الترجمة التلقائية للغة العربية مفتاح Gemini API." : ""}
>
    <PhotoIcon className="w-5 h-5 ml-2"/>{isGeneratingImage ? 'جاري الإنشاء...' : 'إنشاء صورة'}
</Button>
</div>
{aiImageError && <p className="text-red-500 text-sm mt-2">{aiImageError}</p>}
{(imageService === 'gemini' && !aiClient) && <p className="text-yellow-600 dark:text-yellow-400 text-sm mt-2">يرجى إضافة مفتاح Gemini API في الإعدادات.</p>}
{(imageService === 'stability' && !stabilityApiKey) && <p className="text-yellow-600 dark:text-yellow-400 text-sm mt-2">يرجى إضافة مفتاح Stability AI API في الإعدادات.</p>}
{(imageService === 'stability' && stabilityApiKey && !aiClient) && <p className="text-yellow-600 dark:text-yellow-400 text-sm mt-2">تتطلب الترجمة التلقائية للغة العربية مفتاح Gemini API.</p>}
<p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
    باستخدام هذه الميزة، يتم إرسال وصفك إلى Gemini أو Stability AI لمعالجة الطلب.
</p>
</div>

{error && <p className="text-red-500 text-sm mt-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-md">{error}</p>}

{managedTarget.type === 'facebook' && <div className="p-4 border rounded-lg dark:border-gray-700">
<div className="flex items-center">
<input id="include-ig-checkbox" type="checkbox" checked={includeInstagram} onChange={e => onIncludeInstagramChange(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" disabled={!linkedInstagramTarget || isViewer} />
<label htmlFor="include-ig-checkbox" className="mr-2 text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1"><InstagramIcon className="w-4 h-4"/> النشر على انستجرام أيضاً</label>
</div>
{!linkedInstagramTarget && <p className="text-xs text-gray-400 mt-1">لم يتم العثور على حساب انستجرام مرتبط بهذه الصفحة.</p>}
</div>}

<div className="p-4 border rounded-lg dark:border-gray-700">
<div className="flex items-center">
<input id="schedule-checkbox" type="checkbox" checked={isScheduled} onChange={e => onIsScheduledChange(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" disabled={isViewer}/>
<label htmlFor="schedule-checkbox" className="mr-2 text-sm font-medium text-gray-700 dark:text-gray-300">{isScheduled ? "جدولة المنشور" : "النشر الآن"}</label>
</div>

{isScheduled && (
<div className="mt-3 flex flex-wrap items-center gap-2">
    <input type="datetime-local" value={scheduleDate} onChange={e => onScheduleDateChange(e.target.value)} className="p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 focus:ring-blue-500 focus:border-blue-500" disabled={isViewer}/>
     <Button variant="secondary" onClick={handleSuggestTimeWithAI} isLoading={isSuggestingTime} disabled={!aiClient || isViewer}><WandSparklesIcon className="w-5 h-5 ml-2"/>اقترح أفضل وقت</Button>
</div>
)}
{aiTimeError && <p className="text-red-500 text-sm mt-2">{aiTimeError}</p>}
{isScheduled && aiHelperText}
</div>

<div className="flex flex-col sm:flex-row items-center justify-between gap-4">
<div className="flex items-center gap-2 flex-wrap">
<input type="file" id="imageUpload" className="hidden" accept="image/*" onChange={onImageChange}/>
<Button variant="secondary" onClick={() => document.getElementById('imageUpload')?.click()} disabled={isViewer}><PhotoIcon className="w-5 h-5 ml-2" />أضف صورة</Button>
<Button variant="secondary" onClick={handleCanvaClick} className="!bg-[#00c4cc] hover:!bg-[#00a2a8] text-white focus:ring-[#00c4cc]">
    <CanvaIcon className="w-5 h-5 ml-2" />
    صمم على Canva
</Button>
</div>
<div className="flex items-center gap-2">
 <Button variant="secondary" onClick={onSaveDraft} disabled={isPublishing || (!postText.trim() && !imagePreview) || isViewer}>حفظ كمسودة</Button>
<Button onClick={onPublish} isLoading={isPublishing} disabled={(!postText.trim() && !imagePreview) || (includeInstagram && !imagePreview) || isViewer}>{getPublishButtonText()}</Button>
</div>
</div>
</div>
);
};

export default PostComposer;
