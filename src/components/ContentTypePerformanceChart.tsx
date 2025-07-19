
import React from 'react';
import { ContentTypePerformanceData } from '../types';

interface ContentTypePerformanceChartProps {
  data: ContentTypePerformanceData[];
}

const ContentTypePerformanceChart: React.FC<ContentTypePerformanceChartProps> = ({ data }) => {
  const maxEngagement = Math.max(...data.map(d => d.avgEngagement), 0) || 1;

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <h3 className="font-bold text-lg mb-1 text-gray-800 dark:text-white">أداء أنواع المحتوى</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        اكتشف أنواع المنشورات التي تحقق أفضل تفاعل مع جمهورك.
      </p>
      {data.length === 0 ? (
           <div className="h-48 flex items-center justify-center text-gray-500">لا توجد بيانات كافية للتحليل.</div>
      ) : (
        <div className="space-y-3">
          {data.sort((a,b) => b.avgEngagement - a.avgEngagement).map(item => (
            <div key={item.type} className="flex items-center gap-4">
              <div className="w-28 text-sm font-semibold text-gray-700 dark:text-gray-300 text-right shrink-0">{item.type}</div>
              <div className="flex-grow bg-gray-200 dark:bg-gray-700 rounded-full h-6">
                <div
                  className="bg-purple-600 h-6 rounded-full flex items-center justify-end px-2 text-white text-xs font-bold"
                  style={{ width: `${(item.avgEngagement / maxEngagement) * 100}%`, transition: 'width 0.5s ease-in-out' }}
                >
                  {item.avgEngagement.toFixed(0)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ContentTypePerformanceChart;
