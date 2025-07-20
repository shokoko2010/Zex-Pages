
import React from 'react';
import { AudienceGrowthData } from '../types';

interface AudienceGrowthChartProps {
  data: AudienceGrowthData[];
  isLoading: boolean; // Added isLoading prop
}

const AudienceGrowthChart: React.FC<AudienceGrowthChartProps> = ({ data, isLoading }) => {
  if (isLoading) {
    return <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg text-center text-gray-500">Loading Audience Growth Data...</div>;
  }

  if (data.length === 0) {
    return <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg text-center text-gray-500">لا توجد بيانات كافية لعرض نمو الجمهور.</div>;
  }

  const startCount = data[0]?.fanCount ?? 0;
  const endCount = data[data.length - 1]?.fanCount ?? 0;
  const change = endCount - startCount;
  const changePercent = startCount > 0 ? (change / startCount) * 100 : 0;

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg h-full">
      <h3 className="font-bold text-lg mb-1 text-gray-800 dark:text-white">نمو الجمهور (آخر 30 يومًا)</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        تتبع زيادة عدد المعجبين بصفحتك بمرور الوقت.
      </p>
      <div className="flex items-baseline gap-4">
        <p className="text-4xl font-extrabold text-blue-600 dark:text-blue-400">{endCount.toLocaleString('ar-EG')}</p>
        <div className={`flex items-center text-lg font-bold ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
          <span>{change >= 0 ? '▲' : '▼'}</span>
          <span>{Math.abs(change).toLocaleString('ar-EG')}</span>
          <span className="text-sm font-normal ml-1">({changePercent.toFixed(1)}%)</span>
        </div>
      </div>
       <div className="mt-4 h-32 w-full text-center text-gray-400 flex items-center justify-center bg-gray-50 dark:bg-gray-700/50 rounded-md">
           <p>(تمثيل بياني للنمو)</p>
       </div>
    </div>
  );
};

export default AudienceGrowthChart;
