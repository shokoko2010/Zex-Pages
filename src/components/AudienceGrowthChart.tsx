import React from 'react';
import { AudienceGrowthData } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area } from 'recharts';
import { TrendingUp, Users, Calendar } from 'lucide-react';

interface AudienceGrowthChartProps {
  data: AudienceGrowthData[];
  isLoading: boolean;
}

const AudienceGrowthChart: React.FC<AudienceGrowthChartProps> = ({ data, isLoading }) => {
  if (isLoading) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="flex gap-4">
            <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded flex-1"></div>
            <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded flex-1"></div>
          </div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
          <Users className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="font-semibold text-lg text-gray-700 dark:text-gray-300 mb-2">لا توجد بيانات كافية</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">لا توجد بيانات لنمو الجمهور لعرضها.</p>
      </div>
    );
  }

  // Calculate growth metrics
  const startCount = data[0]?.fanCount ?? 0;
  const endCount = data[data.length - 1]?.fanCount ?? 0;
  const change = endCount - startCount;
  const changePercent = startCount > 0 ? (change / startCount) * 100 : 0;
  
  // Calculate average daily growth
  const dailyGrowthRates = data.slice(1).map((item, index) => {
    const prevCount = data[index].fanCount;
    return prevCount > 0 ? ((item.fanCount - prevCount) / prevCount) * 100 : 0;
  });
  const avgDailyGrowth = dailyGrowthRates.reduce((sum, rate) => sum + rate, 0) / dailyGrowthRates.length;

  // Prepare chart data with formatted dates
  const chartData = data.map(item => ({
    date: new Date(item.date).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' }),
    fans: item.fanCount,
    growth: item.fanCount - startCount
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
          <p className="text-sm text-blue-600 dark:text-blue-400">
            المعجبين: {payload[0].value.toLocaleString('ar-EG')}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            النمو: {payload[1].value >= 0 ? '+' : ''}{payload[1].value.toLocaleString('ar-EG')}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            نمو الجمهور
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            تتبع زيادة عدد المعجبين بمرور الوقت (آخر 30 يومًا)
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Calendar className="w-4 h-4" />
          <span>آخر 30 يومًا</span>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">إجمالي المعجبين</p>
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
            {endCount.toLocaleString('ar-EG')}
          </p>
        </div>
        
        <div className={`p-4 rounded-lg border ${
          change >= 0 
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        }`}>
          <p className="text-sm font-medium mb-1">
            {change >= 0 ? 'النمو الإجمالي' : 'الانخفاض الإجمالي'}
          </p>
          <div className="flex items-center gap-2">
            <p className={`text-xl font-bold ${
              change >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
            }`}>
              {change >= 0 ? '+' : ''}{change.toLocaleString('ar-EG')}
            </p>
            <span className={`text-sm font-medium ${
              change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}>
              ({changePercent >= 0 ? '+' : ''}{changePercent.toFixed(1)}%)
            </span>
          </div>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
          <p className="text-sm font-medium text-purple-600 dark:text-purple-400 mb-1">متوسط النمو اليومي</p>
          <p className={`text-xl font-bold ${
            avgDailyGrowth >= 0 ? 'text-purple-700 dark:text-purple-300' : 'text-red-700 dark:text-red-300'
          }`}>
            {avgDailyGrowth >= 0 ? '+' : ''}{avgDailyGrowth.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64 mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.3} />
            <XAxis 
              dataKey="date" 
              stroke="#6b7280" 
              fontSize={12}
              tickLine={false}
            />
            <YAxis 
              stroke="#6b7280" 
              fontSize={12}
              tickLine={false}
              tickFormatter={(value) => value.toLocaleString('ar-EG')}
            />
            <Tooltip content={<CustomTooltip />} />
            <defs>
              <linearGradient id="colorFans" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <Area 
              type="monotone" 
              dataKey="fans" 
              stroke="#3b82f6" 
              strokeWidth={2}
              fill="url(#colorFans)"
              fillOpacity={0.3}
            />
            <Line 
              type="monotone" 
              dataKey="fans" 
              stroke="#3b82f6" 
              strokeWidth={3}
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: '#1d4ed8' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Insights */}
      <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
        <h4 className="font-semibold text-gray-800 dark:text-white mb-2 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-500" />
          رؤى سريعة
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-gray-600 dark:text-gray-300">
              أسرع نمو: {data.length > 1 ? new Date(data.reduce((max, current) => 
                (current.fanCount - data[data.indexOf(current) - 1]?.fanCount || 0) > 
                (max.fanCount - data[data.indexOf(max) - 1]?.fanCount || 0) ? current : max
              ).date).toLocaleDateString('ar-EG') : 'غير متوفر'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-gray-600 dark:text-gray-300">
              {change >= 0 ? 'اتجاه إيجابي' : 'اتجاه سلبي'} في النمو
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudienceGrowthChart;