
import React from 'react';
import { HeatmapDataPoint } from '../types';
import LightBulbIcon from './icons/LightBulbIcon'; // أيقونة لمسة جمالية

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

  // --- جديد: منطق اقتراح أفضل الأوقات ---
  const topSuggestions = data && data.length > 0 
    ? [...data]
        .sort((a, b) => b.engagement - a.engagement)
        .slice(0, 3)
    : [];

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg h-full flex flex-col">
      <h3 className="font-bold text-lg mb-1 text-gray-800 dark:text-white">أفضل أوقات النشر</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        تحليل بالذكاء الاصطناعي لأوقات تفاعل جمهورك (الأخضر الداكن هو الأفضل).
      </p>
      
      {data.length === 0 ? (
          <div className="flex-grow flex items-center justify-center text-gray-500">لا توجد بيانات كافية للتحليل.</div>
      ) : (
        <div className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
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
          </div>
          
          {/* --- جديد: قسم عرض الاقتراحات --- */}
          <div className="md:col-span-1">
            <div className="flex items-center mb-2">
              <LightBulbIcon className="h-5 w-5 text-yellow-400 mr-2" />
              <h4 className="font-bold text-md text-gray-800 dark:text-white">أهم الاقتراحات</h4>
            </div>
            <ul className="space-y-2">
              {topSuggestions.map((suggestion, index) => (
                <li key={index} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-md text-sm">
                  <span className="font-semibold text-gray-900 dark:text-white">{days[suggestion.day]}</span>
                  <span className="text-gray-600 dark:text-gray-300">، حوالي الساعة </span>
                  <span className="font-semibold text-gray-900 dark:text-white">{suggestion.hour}:00</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostingTimesHeatmap;
