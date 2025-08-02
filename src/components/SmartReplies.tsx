import React, { useState } from 'react';
import { Sparkles, Copy } from 'lucide-react';

interface SmartRepliesProps {
  replies: string[];
  onSelectReply: (reply: string) => void;
}

const SmartReplies: React.FC<SmartRepliesProps> = ({ replies, onSelectReply }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopyToClipboard = async (reply: string, index: number) => {
    try {
      await navigator.clipboard.writeText(reply);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  if (replies.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-yellow-500" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">ردود ذكية مقترحة:</span>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {replies.map((reply, index) => (
          <div key={index} className="relative group">
            <button
              onClick={() => onSelectReply(reply)}
              className="px-4 py-2 text-sm rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <span className="pr-6">{reply}</span>
            </button>
            
            <button
              onClick={() => handleCopyToClipboard(reply, index)}
              className="absolute -top-1 -right-1 p-1 bg-white dark:bg-gray-700 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-gray-100 dark:hover:bg-gray-600"
              title="نسخ إلى الحافظة"
            >
              {copiedIndex === index ? (
                <div className="w-4 h-4 text-green-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              ) : (
                <Copy className="w-4 h-4 text-gray-500" />
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SmartReplies;