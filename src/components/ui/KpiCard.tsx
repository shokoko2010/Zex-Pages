import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  trend?: { value: number; isPositive: boolean };
  change?: string;
  index?: number;
}

const KpiCard: React.FC<KpiCardProps> = ({ icon, label, value, trend, change, index = 0 }) => {
  // Different gradient colors for each card
  const gradients = [
    'from-blue-500 to-blue-600',
    'from-green-500 to-green-600', 
    'from-purple-500 to-purple-600',
    'from-orange-500 to-orange-600'
  ];

  const bgColors = [
    'bg-blue-100 dark:bg-blue-900/20',
    'bg-green-100 dark:bg-green-900/20',
    'bg-purple-100 dark:bg-purple-900/20', 
    'bg-orange-100 dark:bg-orange-900/20'
  ];

  const borderColors = [
    'border-blue-200 dark:border-blue-800',
    'border-green-200 dark:border-green-800',
    'border-purple-200 dark:border-purple-800',
    'border-orange-200 dark:border-orange-800'
  ];

  const currentGradient = gradients[index % gradients.length];
  const currentBgColor = bgColors[index % bgColors.length];
  const currentBorderColor = borderColors[index % borderColors.length];

  return (
    <div className={`group relative overflow-hidden rounded-xl border ${currentBorderColor} bg-white dark:bg-gray-800 p-6 transition-all duration-300 hover:shadow-lg hover:scale-[1.02]`}>
      {/* Background gradient overlay */}
      <div className={`absolute inset-0 bg-gradient-to-br ${currentGradient} opacity-5 group-hover:opacity-10 transition-opacity duration-300`}></div>
      
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${currentBgColor} transition-colors duration-300 group-hover:scale-110`}>
            {icon}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">{label}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          </div>
        </div>
        
        {trend && change && (
          <div className="text-right">
            <div className={`flex items-center gap-1 text-sm font-medium ${
              trend.isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}>
              {trend.isPositive ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span>{trend.value.toFixed(1)}%</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{change}</p>
          </div>
        )}
      </div>
      
      {/* Subtle accent line */}
      <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${currentGradient} opacity-60`}></div>
    </div>
  );
};

export default KpiCard;