import React, { useState } from 'react';
import { ContentTypePerformanceData } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { BarChart3, TrendingUp, Filter } from 'lucide-react';

interface ContentTypePerformanceChartProps {
  data: ContentTypePerformanceData[];
  isLoading: boolean;
}

const ContentTypePerformanceChart: React.FC<ContentTypePerformanceChartProps> = ({ data, isLoading }) => {
  const [sortBy, setSortBy] = useState<'engagement' | 'posts'>('engagement');
  const [viewMode, setViewMode] = useState<'chart' | 'list'>('chart');

  if (isLoading) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
          <BarChart3 className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="font-semibold text-lg text-gray-700 dark:text-gray-300 mb-2">لا توجد بيانات كافية</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">لا توجد بيانات لأداء أنواع المحتوى لعرضها.</p>
      </div>
    );
  }

  // Sort data based on selected criteria
  const sortedData = [...data].sort((a, b) => {
    if (sortBy === 'engagement') {
      return b.avgEngagement - a.avgEngagement;
    } else {
      return b.count - a.count;
    }
  });

  // Calculate total posts and engagement for percentages
  const totalPosts = data.reduce((sum, item) => sum + item.count, 0);
  const totalEngagement = data.reduce((sum, item) => sum + (item.avgEngagement * item.count), 0);
  const maxEngagement = Math.max(...data.map(d => d.avgEngagement), 0) || 1;

  // Colors for different content types
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const engagementPercentage = totalEngagement > 0 ? ((data.avgEngagement * data.postCount) / totalEngagement * 100).toFixed(1) : 0;
      const postPercentage = totalPosts > 0 ? (data.postCount / totalPosts * 100).toFixed(1) : 0;
      
      return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="font-medium text-gray-900 dark:text-white mb-2">{label}</p>
          <div className="space-y-1 text-sm">
            <p className="text-blue-600 dark:text-blue-400">
              متوسط التفاعل: <span className="font-bold">{data.avgEngagement.toFixed(1)}</span>
            </p>
            <p className="text-green-600 dark:text-green-400">
              عدد المنشورات: <span className="font-bold">{data.count}</span> ({postPercentage}%)
            </p>
            <p className="text-purple-600 dark:text-purple-400">
              نسبة التفاعل الكلي: <span className="font-bold">{engagementPercentage}%</span>
            </p>
          </div>
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
            <BarChart3 className="w-5 h-5 text-blue-500" />
            أداء أنواع المحتوى
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            اكتشف أنواع المنشورات التي تحقق أفضل تفاعل مع جمهورك
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'engagement' | 'posts')}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="engagement">حسب التفاعل</option>
              <option value="posts">حسب عدد المنشورات</option>
            </select>
          </div>
          
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('chart')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'chart'
                  ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              رسم بياني
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              قائمة
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">إجمالي المنشورات</p>
          <p className="text-xl font-bold text-blue-700 dark:text-blue-300">
            {totalPosts.toLocaleString('ar-EG')}
          </p>
        </div>
        
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
          <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-1">متوسط التفاعل</p>
          <p className="text-xl font-bold text-green-700 dark:text-green-300">
            {totalPosts > 0 ? (totalEngagement / totalPosts).toFixed(1) : '0'}
          </p>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
          <p className="text-sm font-medium text-purple-600 dark:text-purple-400 mb-1">أفضل أداءً</p>
          <p className="text-xl font-bold text-purple-700 dark:text-purple-300">
            {sortedData[0]?.type || 'غير متوفر'}
          </p>
        </div>
      </div>

      {/* Chart or List View */}
      {viewMode === 'chart' ? (
        <div className="h-64 mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sortedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.3} />
              <XAxis 
                dataKey="type" 
                stroke="#6b7280" 
                fontSize={12}
                tickLine={false}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                stroke="#6b7280" 
                fontSize={12}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey={sortBy === 'engagement' ? 'avgEngagement' : 'count'}
                radius={[4, 4, 0, 0]}
              >
                {sortedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="space-y-3 mb-6">
          {sortedData.map((item, index) => {
            const engagementPercentage = totalEngagement > 0 ? ((item.avgEngagement * item.count) / totalEngagement * 100) : 0;
            const postPercentage = totalPosts > 0 ? (item.count / totalPosts * 100) : 0;
            
            return (
              <div key={item.type} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: colors[index % colors.length] }}>
                  {index + 1}
                </div>
                <div className="flex-grow">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-semibold text-gray-800 dark:text-white">{item.type}</h4>
                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                      {sortBy === 'engagement' ? item.avgEngagement.toFixed(1) : item.count}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <span>منشورات: {item.count} ({postPercentage.toFixed(1)}%)</span>
                    <span>تفاعل: {item.avgEngagement.toFixed(1)}</span>
                    <span>مساهمة: {engagementPercentage.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Insights */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-600 p-4 rounded-lg">
        <h4 className="font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-500" />
          رؤى الأداء
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5"></div>
            <span className="text-gray-600 dark:text-gray-300">
              <strong>{sortedData[0]?.type}</strong> هو أفضل نوع محتوى بمعدل تفاعل <strong>{(sortedData[0]?.avgEngagement || 0).toFixed(1)}</strong>
            </span>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
            <span className="text-gray-600 dark:text-gray-300">
              <strong>{sortedData[0]?.type}</strong> يساهم بـ <strong>{totalEngagement > 0 ? (((sortedData[0]?.avgEngagement || 0) * (sortedData[0]?.count || 0)) / totalEngagement * 100).toFixed(1) : 0}%</strong> من إجمالي التفاعل
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentTypePerformanceChart;