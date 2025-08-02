import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

// Helper function to process and sort demographic data
const processDemographicData = (data: { [key: string]: number }, topN = 5) => {
    if (!data || Object.keys(data).length === 0) {
        return { labels: [], datasets: [{ data: [] }] };
    }

    const sortedData = Object.entries(data).sort(([, a], [, b]) => b - a);
    const topData = sortedData.slice(0, topN);

    return {
        labels: topData.map(([key]) => key),
        datasets: [
            {
                label: 'عدد المتابعين',
                data: topData.map(([, value]) => value),
                backgroundColor: 'rgba(52, 211, 153, 0.6)',
                borderColor: 'rgba(52, 211, 153, 1)',
                borderWidth: 1,
            },
        ],
    };
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
};


interface AudienceDemographicsProps {
    cityData: { [key: string]: number };
    countryData: { [key: string]: number };
}

const AudienceDemographics: React.FC<AudienceDemographicsProps> = ({ cityData, countryData }) => {

  const processedCityData = processDemographicData(cityData);
  const processedCountryData = processDemographicData(countryData);

  const hasCityData = processedCityData.labels.length > 0;
  const hasCountryData = processedCountryData.labels.length > 0;

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">تحليلات ديموغرافية للجمهور</h3>
      
      {!hasCityData && !hasCountryData ? (
        <div className="text-center py-10">
            <p className="text-gray-600 dark:text-gray-400">
                لا توجد بيانات ديموغرافية متاحة حاليًا.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                قد يكون هذا بسبب عدم وجود عدد كافٍ من المتابعين أو أن البيانات ما زالت قيد المعالجة من قبل فيسبوك.
            </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Country Chart */}
            {hasCountryData && (
                <div className="h-80">
                  <h4 className="text-center font-semibold mb-2 text-gray-700 dark:text-gray-300">أهم الدول</h4>
                  <Bar data={processedCountryData} options={chartOptions} />
                </div>
            )}

            {/* City Chart */}
            {hasCityData && (
                <div className="h-80">
                   <Bar data={processedCityData} options={{...chartOptions, indexAxis: 'y'}} />
                   <h4 className="text-center font-semibold mt-2 text-gray-700 dark:text-gray-300">أهم المدن</h4>
                </div>
            )}
        </div>
      )}
    </div>
  );
};

export default AudienceDemographics;
