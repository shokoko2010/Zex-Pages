
import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

// --- بيانات وهمية ---
const genderData = {
  labels: ['أنثى', 'ذكر', 'غير محدد'],
  datasets: [
    {
      label: 'توزيع الجنس',
      data: [65, 33, 2],
      backgroundColor: [
        'rgba(236, 72, 153, 0.7)', // Pink
        'rgba(59, 130, 246, 0.7)', // Blue
        'rgba(156, 163, 175, 0.7)', // Gray
      ],
      borderColor: [
        'rgba(236, 72, 153, 1)',
        'rgba(59, 130, 246, 1)',
        'rgba(156, 163, 175, 1)',
      ],
      borderWidth: 1,
    },
  ],
};

const ageData = {
    labels: ['18-24', '25-34', '35-44', '45-54', '55+'],
    datasets: [
      {
        label: 'التوزيع العمري',
        data: [25, 45, 20, 8, 2],
        backgroundColor: 'rgba(96, 165, 250, 0.6)',
        borderColor: 'rgba(96, 165, 250, 1)',
        borderWidth: 1,
      },
    ],
};

const locationData = {
    labels: ['الرياض', 'جدة', 'الدمام', 'القاهرة', 'دبي', 'الكويت'],
    datasets: [
      {
        label: 'أهم المواقع',
        data: [30, 25, 15, 12, 10, 8],
        backgroundColor: 'rgba(52, 211, 153, 0.6)',
        borderColor: 'rgba(52, 211, 153, 1)',
        borderWidth: 1,
        indexAxis: 'y' as const, // لعرض المخطط بشكل أفقي
      },
    ],
};

const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            position: 'top' as const,
            labels: {
                font: {
                    family: "'Cairo', sans-serif",
                }
            }
        },
    },
};

const barChartOptions = (title: string) => ({
    ...chartOptions,
    plugins: {
        ...chartOptions.plugins,
        title: {
            display: true,
            text: title,
            font: {
                size: 16,
                family: "'Cairo', sans-serif",
            }
        },
    },
    scales: {
      x: {
        ticks: {
           font: {
                family: "'Cairo', sans-serif",
            }
        }
      },
      y: {
        ticks: {
           font: {
                family: "'Cairo', sans-serif",
            }
        }
      }
    }
});


const AudienceDemographics: React.FC = () => {
  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">تحليلات ديموغرافية للجمهور</h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Gender Chart */}
        <div className="h-80">
          <h4 className="text-center font-semibold mb-2 text-gray-700 dark:text-gray-300">التوزيع حسب الجنس</h4>
          <Doughnut data={genderData} options={chartOptions} />
        </div>

        {/* Age Chart */}
        <div className="h-80">
          <Bar data={ageData} options={barChartOptions('التوزيع العمري')} />
        </div>

        {/* Location Chart */}
        <div className="lg:col-span-2 h-96 mt-6">
           <Bar data={locationData} options={{...barChartOptions('أهم المواقع (حسب المدينة)'), indexAxis: 'y'}} />
        </div>
      </div>
       <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-6">
            ملاحظة: هذه واجهة أولية. سيتم ربطها ببيانات التحليلات الحقيقية قريباً.
        </p>
    </div>
  );
};

export default AudienceDemographics;
