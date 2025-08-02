import React, { useState } from 'react';
import { HeatmapDataPoint } from '../types';
import { LightbulbIcon, Clock, Calendar, TrendingUp } from 'lucide-react';

interface PostingTimesHeatmapProps {
  data: HeatmapDataPoint[];
}

const PostingTimesHeatmap: React.FC<PostingTimesHeatmapProps> = ({ data }) => {
  const [showAllTimes, setShowAllTimes] = useState(false);
  
  const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const hours = Array.from({ length: 12 }, (_, i) => i * 2); // every 2 hours

  const getEngagementForCell = (day: number, hour: number): number => {
    const point = data.find(d => d.day === day && d.hour >= hour && d.hour < hour + 2);
    return point?.engagement || 0;
  };

  const getColor = (value: number) => {
    if (value > 0.8) return 'bg-green-600 hover:bg-green-700';
    if (value > 0.6) return 'bg-green-500 hover:bg-green-600';
    if (value > 0.4) return 'bg-green-400 hover:bg-green-500';
    if (value > 0.2) return 'bg-green-300 hover:bg-green-400';
    if (value > 0) return 'bg-green-200 hover:bg-green-300';
    return 'bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500';
  };

  const getIntensityLabel = (value: number) => {
    if (value > 0.8) return 'ممتاز';
    if (value > 0.6) return 'جيد جداً';
    if (value > 0.4) return 'جيد';
    if (value > 0.2) return 'متوسط';
    if (value > 0) return 'ضعيف';
    return 'لا توجد بيانات';
  };

  // Get top suggestions
  const topSuggestions = data && data.length > 0 
    ? [...data]
        .sort((a, b) => b.engagement - a.engagement)
        .slice(0, showAllTimes ? 10 : 3)
    : [];

  // Calculate best performing day and time
  const bestPerforming = data.length > 0 ? data.reduce((best, current) => 
    current.engagement > best.engagement ? current : best
  ) : null;

  // Calculate average engagement by day
  const dayAverages = days.map((_, dayIndex) => {
    const dayData = data.filter(d => d.day === dayIndex);
    const avgEngagement = dayData.length > 0 
      ? dayData.reduce((sum, d) => sum + d.engagement, 0) / dayData.length 
      : 0;
    return { day: dayIndex, avgEngagement, dayName: days[dayIndex] };
  }).sort((a, b) => b.avgEngagement - a.avgEngagement);

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-500" />
            أفضل أوقات النشر
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            تحليل بالذكاء الاصطناعي لأوقات تفاعل جمهورك
          </p>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Calendar className="w-4 h-4" />
          <span>آخر 30 يومًا</span>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
            <Clock className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="font-semibold text-lg text-gray-700 dark:text-gray-300 mb-2">لا توجد بيانات كافية</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">لا توجد بيانات لأوقات النشر لتحليلها.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Best Performing Time Card */}
          {bestPerforming && (
            <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-gray-800 dark:text-white mb-1 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    أفضل وقت للنشر
                  </h4>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">
                    {days[bestPerforming.day]}، الساعة {bestPerforming.hour}:00
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    معدل تفاعل: {(bestPerforming.engagement * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-500" />
                </div>
              </div>
            </div>
          )}

          {/* Heatmap */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="mb-4">
                <h4 className="font-semibold text-gray-800 dark:text-white mb-2">خريطة التفاعل</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  كل خلية يمثل ساعتين (الأخضر الداكن = أفضل تفاعل)
                </p>
              </div>
              
              <div className="grid grid-cols-7 gap-1 text-center">
                {/* Day headers */}
                {days.map(day => (
                  <div key={day} className="text-xs font-bold text-gray-600 dark:text-gray-400 p-1">
                    {day.substring(0, 3)}
                  </div>
                ))}
                
                {/* Heatmap cells */}
                {Array.from({ length: 12 * 7 }).map((_, index) => {
                  const dayIndex = index % 7;
                  const hourIndex = Math.floor(index / 7) * 2;
                  const engagement = getEngagementForCell(dayIndex, hourIndex);
                  
                  return (
                    <div
                      key={`${dayIndex}-${hourIndex}`}
                      className={`
                        w-full aspect-square rounded cursor-pointer transition-all duration-200 
                        ${getColor(engagement)}
                        hover:scale-110 hover:shadow-md
                      `}
                      title={`${days[dayIndex]}, ${hourIndex}:00 - ${hourIndex + 2}:00\n${getIntensityLabel(engagement)} (${(engagement * 100).toFixed(1)}%)`}
                    >
                      {engagement > 0.4 && (
                        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white">
                          {Math.round(engagement * 100)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* Hour labels */}
              <div className="grid grid-cols-7 gap-1 mt-1">
                {hours.map((hour, index) => (
                  <div key={hour} className="col-span-1 text-xs text-gray-500 dark:text-gray-400 text-center">
                    {index === 0 && `${hour}:00`}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Suggestions Panel */}
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center mb-3">
                  <LightbulbIcon className="h-5 w-5 text-yellow-400 mr-2" />
                  <h4 className="font-bold text-gray-800 dark:text-white">أهم الاقتراحات</h4>
                </div>
                <ul className="space-y-2">
                  {topSuggestions.map((suggestion, index) => (
                    <li 
                      key={index} 
                      className="p-2 bg-white dark:bg-gray-700 rounded-md text-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {days[suggestion.day]}
                          </span>
                          <span className="text-gray-600 dark:text-gray-300 mx-1">،</span>
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {suggestion.hour}:00
                          </span>
                        </div>
                        <span className="text-xs font-bold text-green-600 dark:text-green-400">
                          {(suggestion.engagement * 100).toFixed(0)}%
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
                
                {topSuggestions.length > 3 && (
                  <button
                    onClick={() => setShowAllTimes(!showAllTimes)}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-2"
                  >
                    {showAllTimes ? 'عرض أقل' : 'عرض المزيد'}
                  </button>
                )}
              </div>

              {/* Best Days */}
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                <h4 className="font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-500" />
                  أفضل الأيام
                </h4>
                <div className="space-y-2">
                  {dayAverages.slice(0, 3).map((day, index) => (
                    <div key={day.day} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700 dark:text-gray-300">
                        <span className="font-bold">{index + 1}.</span> {day.dayName}
                      </span>
                      <span className="font-bold text-purple-600 dark:text-purple-400">
                        {(day.avgEngagement * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-800 dark:text-white mb-3">مستوى التفاعل</h4>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-600 rounded"></div>
                <span className="text-gray-600 dark:text-gray-300">ممتاز (80%+)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span className="text-gray-600 dark:text-gray-300">جيد جداً (60-80%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-400 rounded"></div>
                <span className="text-gray-600 dark:text-gray-300">جيد (40-60%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-300 rounded"></div>
                <span className="text-gray-600 dark:text-gray-300">متوسط (20-40%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-200 rounded"></div>
                <span className="text-gray-600 dark:text-gray-300">ضعيف (0-20%)</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostingTimesHeatmap;