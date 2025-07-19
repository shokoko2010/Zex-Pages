
import React from 'react';
import { HeatmapDataPoint } from '../types';

interface PostingTimesHeatmapProps {
  data: HeatmapDataPoint[];
}

const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const hours = Array.from({ length: 12 }, (_, i) => `${(i * 2)}`); // every 2 hours

const PostingTimesHeatmap: React.FC<PostingTimesHeatmapProps> = ({ data }) => {

  const getEngagementForCell = (day: number, hour: number): number => {
    const point = data.find(d => d.day === day && d.hour >= hour && d.hour < hour + 2);
    return point?.engagement || 0;
  };

  const getColor = (value: number) => {
    if (value > 0.8) return 'bg-green-600';
    if (value > 0.6) return 'bg-green-500';
    if (value > 0.4) return 'bg-green-400';
    if (value > 0.2) return 'bg-green-300';
    return 'bg-gray-200 dark:bg-gray-600';
  };

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg h-full">
      <h3 className="font-bold text-lg mb-1 text-gray-800 dark:text-white">أفضل أوقات النشر</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        تحليل بالذكاء الاصطناعي لأوقات تفاعل جمهورك (الأخضر الداكن هو الأفضل).
      </p>
      
      {data.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-gray-500">لا توجد بيانات كافية للتحليل.</div>
      ) : (
        <div className="grid grid-cols-7 gap-1 text-center text-xs">
          {days.map(day => <div key={day} className="font-bold">{day.substring(0,3)}</div>)}
          {Array.from({ length: 12 * 7 }).map((_, index) => {
              const dayIndex = index % 7;
              const hourIndex = Math.floor(index / 7) * 2;
              const engagement = getEngagementForCell(dayIndex, hourIndex);
              return (
                  <div 
                      key={`${dayIndex}-${hourIndex}`} 
                      className={`w-full aspect-square rounded ${getColor(engagement)}`}
                      title={`${days[dayIndex]}, الساعة ${hourIndex}:00 - ${hourIndex+2}:00`}
                  ></div>
              );
          })}
        </div>
      )}
    </div>
  );
};

export default PostingTimesHeatmap;
