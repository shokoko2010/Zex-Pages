
import React, { useState, useRef } from 'react';
import { BulkPostItem, Target, Role, PageProfile } from '../types';
import Button from './ui/Button';
import TrashIcon from './icons/TrashIcon';
import SparklesIcon from './icons/SparklesIcon';
import { GoogleGenAI } from '@google/genai';
import FacebookIcon from './icons/FacebookIcon';
import InstagramIcon from './icons/InstagramIcon';
import ArrowDownTrayIcon from './icons/ArrowDownTrayIcon';
import WandSparklesIcon from './icons/WandSparklesIcon';
import CalendarIcon from './icons/CalendarIcon'; // Added for UI improvement
import { generateDescriptionForImage, generatePostSuggestion, generateImageFromPrompt } from '../services/geminiService';

interface BulkPostItemCardProps {
  item: BulkPostItem;
  onUpdate: (id: string, updates: Partial<BulkPostItem>) => void;
  onRemove: (id: string) => void;
  targets: Target[];
  aiClient: GoogleGenAI | null;
  stabilityApiKey: string | null;
  pageProfile: PageProfile;

  onGeneratePostFromText: (id: string, text: string) => Promise<void>;
  onGenerateImageFromText: (id: string, text: string, service: 'gemini' | 'stability') => Promise<void>;
  onGeneratePostFromImage: (id: string, imageFile: File) => Promise<void>;
  onAddImageManually: (id: string, file: File) => void;
  role: Role;
}

const BulkPostItemCard: React.FC<BulkPostItemCardProps> = ({
  item,
  onUpdate,
  onRemove,
  targets,
  aiClient,
  stabilityApiKey,
  pageProfile,
  onGeneratePostFromText,
  onGenerateImageFromText,
  onGeneratePostFromImage,
  onAddImageManually,
  role
}) => {
  const [isGeneratingPost, setIsGeneratingPost] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdate(item.id, { text: e.target.value });
  };

  const handleTargetChange = (targetId: string, isChecked: boolean) => {
    onUpdate(item.id, {
      targetIds: isChecked
        ? [...item.targetIds, targetId]
        : item.targetIds.filter((id) => id !== targetId),
    });
  };

  const handleManualImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onAddImageManually(item.id, e.target.files[0]);
    }
  };

  const handleGeneratePostClick = async () => {
    setIsGeneratingPost(true);
    try {
      if (item.hasImage && item.imageFile) {
        await onGeneratePostFromImage(item.id, item.imageFile);
      } else {
        await onGeneratePostFromText(item.id, item.text || '');
      }
    } finally {
      setIsGeneratingPost(false);
    }
  };

  const handleGenerateImageClick = async (service: 'gemini' | 'stability') => {
    setIsGeneratingImage(true);
    try {
      await onGenerateImageFromText(item.id, item.text || '', service);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const isViewer = role === 'viewer';
  const hasContent = item.text && item.text.length > 0;
  const canGenerateGeminiImage = aiClient && hasContent && !item.hasImage && !isViewer;
  const canGenerateStabilityImage = stabilityApiKey && hasContent && !item.hasImage && !isViewer;
  const canGeneratePost = aiClient && !isViewer && (hasContent || item.hasImage);
  const canAddManualImage = !item.hasImage && !isViewer;


  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 space-y-4 border-l-4 border-transparent hover:border-blue-500 transition-all">
      <div className="flex justify-between items-start">
        <h4 className="font-semibold text-lg text-gray-800 dark:text-white">منشور مجدول</h4>
        {!isViewer && (
            <Button variant="danger" size="sm" onClick={() => onRemove(item.id)}>
              <TrashIcon className="w-4 h-4" />
            </Button>
        )}
      </div>

      {/* Schedule Date Display */}
      <div className="flex items-center p-3 rounded-md bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600">
          <CalendarIcon className="w-6 h-6 text-gray-500 dark:text-gray-400 mr-4" />
          <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">تاريخ النشر</p>
              {item.scheduleDate ? (
                  <p className="text-base font-bold text-blue-600 dark:text-blue-400">
                      {new Date(item.scheduleDate).toLocaleString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' })}
                  </p>
              ) : (
                  <p className="text-sm font-semibold text-yellow-600 dark:text-yellow-500">
                      لم تتم الجدولة بعد
                  </p>
              )}
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Column: Text and AI actions */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              النص
            </label>
            <textarea
              value={item.text}
              onChange={handleTextChange}
              rows={6}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              placeholder="اكتب منشورك هنا..."
              disabled={isViewer}
            />
          </div>

           <div className="grid grid-cols-1 gap-2">
              {canGeneratePost && (
                <Button
                  onClick={handleGeneratePostClick}
                  isLoading={isGeneratingPost}
                  disabled={!canGeneratePost || isGeneratingPost}
                  variant="secondary"
                  className="text-purple-600 border-purple-600 hover:bg-purple-50 dark:text-purple-400 dark:border-purple-400 dark:hover:bg-purple-900/30"
                >
                  <SparklesIcon className="w-4 h-4 ml-2" />
                  {isGeneratingPost ? 'جاري التوليد...' : item.hasImage ? 'ولد منشوراً من الصورة' : 'ولد منشوراً من النص'}
                </Button>
              )}
          </div>
        </div>

        {/* Right Column: Image and Image actions */}
        <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                الصورة
              </label>
              {item.imagePreview ? (
                <div className="mb-2 relative w-full h-48 rounded-md overflow-hidden group">
                  <img src={item.imagePreview} alt="Post preview" className="w-full h-full object-cover" />
                  {!isViewer && (
                       <button
                          onClick={() => onUpdate(item.id, { imageFile: undefined, imagePreview: undefined, hasImage: false })}
                          className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="إزالة الصورة"
                       >
                          <TrashIcon className="w-4 h-4" />
                       </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center w-full h-48 bg-gray-100 dark:bg-gray-700 rounded-md border-2 border-dashed border-gray-300 dark:border-gray-600">
                    <p className="text-gray-500">لا توجد صورة</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-2">
                {canAddManualImage && (
                    <div className="flex items-center">
                        <input
                          type="file"
                          accept="image/*"
                          ref={fileInputRef}
                          onChange={handleManualImageUpload}
                          className="hidden"
                        />
                        <Button
                          variant="secondary"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isViewer}
                          className="w-full"
                        >
                          <ArrowDownTrayIcon className="w-4 h-4 ml-2" />
                          أضف صورة يدوياً
                        </Button>
                    </div>
                )}
                {canGenerateGeminiImage && (
                  <Button
                    onClick={() => handleGenerateImageClick('gemini')}
                    isLoading={isGeneratingImage}
                    disabled={!canGenerateGeminiImage || isGeneratingImage || isViewer}
                    variant="secondary"
                    className="w-full text-blue-600 border-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-400 dark:hover:bg-blue-900/30"
                  >
                    <WandSparklesIcon className="w-4 h-4 ml-2" />
                    {isGeneratingImage ? 'جاري التوليد...' : 'ولد صورة من النص (Gemini)'}
                  </Button>
                )}
                {canGenerateStabilityImage && (
                  <Button
                    onClick={() => handleGenerateImageClick('stability')}
                    isLoading={isGeneratingImage}
                    disabled={!canGenerateStabilityImage || isGeneratingImage || isViewer}
                    variant="secondary"
                    className="w-full text-green-600 border-green-600 hover:bg-green-50 dark:text-green-400 dark:border-green-400 dark:hover:bg-green-900/30"
                  >
                    <WandSparklesIcon className="w-4 h-4 ml-2" />
                    {isGeneratingImage ? 'جاري التوليد...' : 'ولد صورة من النص (Stability)'}
                  </Button>
                )}
            </div>
        </div>
      </div>


      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          المنصات المستهدفة
        </label>
        <div className="flex flex-wrap gap-2">
          {targets.map((target) => (
            <label
              key={target.id}
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium cursor-pointer transition-colors ${
                item.targetIds.includes(target.id)
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600'
              } ${isViewer ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input
                type="checkbox"
                checked={item.targetIds.includes(target.id)}
                onChange={(e) => handleTargetChange(target.id, e.target.checked)}
                className="form-checkbox h-4 w-4 text-blue-600 rounded ml-2 border-gray-300 dark:border-gray-500 focus:ring-blue-500"
                disabled={isViewer}
              />
              {target.type === 'instagram' ? <InstagramIcon className="w-4 h-4 mr-1" /> : <FacebookIcon className="w-4 h-4 mr-1" />}
              {target.name}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BulkPostItemCard;
