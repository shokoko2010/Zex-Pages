import React from 'react';

interface SmartRepliesProps {
  replies: string[];
  onSelectReply: (reply: string) => void;
}

const SmartReplies: React.FC<SmartRepliesProps> = ({ replies, onSelectReply }) => {
  return (
    <div className="space-y-2">
      {replies.map((reply, index) => (
        <button
          key={index}
          onClick={() => onSelectReply(reply)}
          className="px-3 py-1 text-sm rounded-full bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-800 dark:text-blue-200 dark:hover:bg-blue-700"
        >
          {reply}
        </button>
      ))}
    </div>
  );
};

export default SmartReplies;
