import React, { useState } from 'react';
import { Target } from '../types';
import Button from './ui/Button';
import XMarkIcon from './icons/XMarkIcon';
import ChartBarIcon from './icons/ChartBarIcon';
import UserGroupIcon from './icons/UserGroupIcon';
import CursorArrowRaysIcon from './icons/CursorArrowRaysIcon';
import PlayPauseIcon from './icons/PlayPauseIcon';
import PlusIcon from './icons/PlusIcon';
import SparklesIcon from './icons/SparklesIcon';
import ArrowsRightLeftIcon from './icons/ArrowPathIcon';

interface ABTest {
    id: string;
    name: string;
    status: 'ACTIVE' | 'PAUSED' | 'COMPLETED';
    startDate: string;
    endDate?: string;
    variants: {
        id: string;
        name: string;
        spend: number;
        reach: number;
        clicks: number;
        ctr: number;
        conversions: number;
        conversionRate: number;
    }[];
    winner?: string;
    confidence: number;
}

interface ABTestingModalProps {
    isOpen: boolean;
    onClose: () => void;
    target: Target | null;
    campaigns: any[];
}

const ABTestingModal: React.FC<ABTestingModalProps> = ({ isOpen, onClose, target, campaigns }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'create' | 'tests'>('overview');
    const [isCreatingTest, setIsCreatingTest] = useState(false);
    const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
    const [testName, setTestName] = useState('');

    // Mock A/B test data
    const mockABTests: ABTest[] = [
        {
            id: '1',
            name: 'اختبار صورة المنتج',
            status: 'COMPLETED',
            startDate: '2024-01-01',
            endDate: '2024-01-14',
            variants: [
                {
                    id: 'v1',
                    name: 'صورة المنتج الأساسية',
                    spend: 150,
                    reach: 15000,
                    clicks: 450,
                    ctr: 3.0,
                    conversions: 45,
                    conversionRate: 10.0
                },
                {
                    id: 'v2',
                    name: 'صورة المنتج البديلة',
                    spend: 150,
                    reach: 14800,
                    clicks: 590,
                    ctr: 4.0,
                    conversions: 71,
                    conversionRate: 12.0
                }
            ],
            winner: 'v2',
            confidence: 95
        },
        {
            id: '2',
            name: 'اختبار نص الإعلان',
            status: 'ACTIVE',
            startDate: '2024-01-15',
            variants: [
                {
                    id: 'v1',
                    name: 'نص قصير وجذاب',
                    spend: 200,
                    reach: 20000,
                    clicks: 600,
                    ctr: 3.0,
                    conversions: 60,
                    conversionRate: 10.0
                },
                {
                    id: 'v2',
                    name: 'نص مفصل ومعلوماتي',
                    spend: 200,
                    reach: 19500,
                    clicks: 780,
                    ctr: 4.0,
                    conversions: 86,
                    conversionRate: 11.0
                }
            ],
            confidence: 87
        }
    ];

    const handleCreateTest = () => {
        if (selectedCampaigns.length >= 2 && testName) {
            console.log('Creating A/B test:', { testName, selectedCampaigns });
            setIsCreatingTest(false);
            setTestName('');
            setSelectedCampaigns([]);
            // In a real implementation, this would call an API
        }
    };

    const getTestStatusColor = (status: string) => {
        switch (status) {
            case 'ACTIVE': return 'text-green-600 bg-green-100 dark:bg-green-900/20';
            case 'PAUSED': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
            case 'COMPLETED': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20';
            default: return 'text-gray-600 bg-gray-100 dark:bg-gray-700';
        }
    };

    const getWinnerBadge = (test: ABTest) => {
        if (!test.winner) return null;
        const winnerVariant = test.variants.find(v => v.id === test.winner);
        return (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                🏆 {winnerVariant?.name}
            </span>
        );
    };

    const renderOverview = () => (
        <div className="space-y-6">
            {/* A/B Testing Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                        <ChartBarIcon className="w-6 h-6 text-blue-600" />
                        <h3 className="font-semibold text-blue-800 dark:text-blue-300">إجمالي الاختبارات</h3>
                    </div>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {mockABTests.length}
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-400">اختبار نشط</p>
                </div>

                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                        <UserGroupIcon className="w-6 h-6 text-green-600" />
                        <h3 className="font-semibold text-green-800 dark:text-green-300">متوسط التحسين</h3>
                    </div>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        +23%
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-400">في معدل التحويل</p>
                </div>

                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                        <CursorArrowRaysIcon className="w-6 h-6 text-purple-600" />
                        <h3 className="font-semibold text-purple-800 dark:text-purple-300">معدل النجاح</h3>
                    </div>
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        87%
                    </p>
                    <p className="text-sm text-purple-700 dark:text-purple-400">متوسط الثقة</p>
                </div>

                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                        <SparklesIcon className="w-6 h-6 text-orange-600" />
                        <h3 className="font-semibold text-orange-800 dark:text-orange-300">الاختبارات النشطة</h3>
                    </div>
                    <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                        {mockABTests.filter(t => t.status === 'ACTIVE').length}
                    </p>
                    <p className="text-sm text-orange-700 dark:text-orange-400">جاري التشغيل</p>
                </div>
            </div>

            {/* Recent Tests */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-4">آخر الاختبارات</h3>
                <div className="space-y-4">
                    {mockABTests.map((test) => (
                        <div key={test.id} className="bg-white dark:bg-gray-800 rounded-lg p-4">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h4 className="font-semibold text-lg">{test.name}</h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        {test.startDate} {test.endDate ? `- ${test.endDate}` : ''}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTestStatusColor(test.status)}`}>
                                        {test.status === 'ACTIVE' ? 'نشط' : test.status === 'PAUSED' ? 'متوقف' : 'مكتمل'}
                                    </span>
                                    {getWinnerBadge(test)}
                                </div>
                            </div>

                            {/* Variants Comparison */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {test.variants.map((variant) => (
                                    <div key={variant.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                                        <div className="flex justify-between items-center mb-2">
                                            <h5 className="font-medium">{variant.name}</h5>
                                            {test.winner === variant.id && (
                                                <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 px-2 py-1 rounded">
                                                    الفائز
                                                </span>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            <div>
                                                <p className="text-gray-600 dark:text-gray-400">الإنفاق</p>
                                                <p className="font-medium">${variant.spend}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-600 dark:text-gray-400">الوصول</p>
                                                <p className="font-medium">{variant.reach.toLocaleString()}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-600 dark:text-gray-400">CTR</p>
                                                <p className="font-medium">{variant.ctr}%</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-600 dark:text-gray-400">معدل التحويل</p>
                                                <p className="font-medium">{variant.conversionRate}%</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {test.confidence && (
                                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">مستوى الثقة</span>
                                        <div className="flex items-center gap-2">
                                            <div className="w-32 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                                <div 
                                                    className="bg-blue-600 h-2 rounded-full" 
                                                    style={{ width: `${test.confidence}%` }}
                                                ></div>
                                            </div>
                                            <span className="text-sm font-medium">{test.confidence}%</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Benefits */}
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <SparklesIcon className="w-5 h-5 text-green-600" />
                    فوائد اختبار A/B
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                        <p className="text-green-800 dark:text-green-400 mb-2">
                            • تحسين معدلات التحويل بنسبة تصل إلى 30%
                        </p>
                        <p className="text-green-800 dark:text-green-400 mb-2">
                            • تقليل تكلفة اكتساب العملاء
                        </p>
                        <p className="text-green-800 dark:text-green-400">
                            • زيادة عائد الاستثمار الإعلاني
                        </p>
                    </div>
                    <div>
                        <p className="text-green-800 dark:text-green-400 mb-2">
                            • فهم أفضل لتفضيلات الجمهور
                        </p>
                        <p className="text-green-800 dark:text-green-400 mb-2">
                            • تحسين جودة الإعلانات المستقبلية
                        </p>
                        <p className="text-green-800 dark:text-green-400">
                            • اتخاذ قرارات مبنية على البيانات
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderCreateTest = () => (
        <div className="space-y-6">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-4">إنشاء اختبار A/B جديد</h3>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            اسم الاختبار
                        </label>
                        <input
                            type="text"
                            value={testName}
                            onChange={(e) => setTestName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            placeholder="أدخل اسم الاختبار"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            اختر الحملات للمقارنة (حدد حملتين على الأقل)
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                            {campaigns.map((campaign) => (
                                <label key={campaign.id} className="flex items-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <input
                                        type="checkbox"
                                        checked={selectedCampaigns.includes(campaign.id)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedCampaigns([...selectedCampaigns, campaign.id]);
                                            } else {
                                                setSelectedCampaigns(selectedCampaigns.filter(id => id !== campaign.id));
                                            }
                                        }}
                                        className="mr-3"
                                    />
                                    <div className="flex-1">
                                        <p className="font-medium">{campaign.name}</p>
                                        <p className="text-xs text-gray-600 dark:text-gray-400">{campaign.objective.replace(/_/g, ' ')}</p>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <Button 
                            onClick={handleCreateTest}
                            disabled={selectedCampaigns.length < 2 || !testName}
                            className="flex items-center gap-2"
                        >
                            <PlusIcon className="w-4 h-4" />
                            إنشاء الاختبار
                        </Button>
                        <Button 
                            onClick={() => {
                                setIsCreatingTest(false);
                                setTestName('');
                                setSelectedCampaigns([]);
                            }}
                            variant="secondary"
                        >
                            إلغاء
                        </Button>
                    </div>
                </div>
            </div>

            {/* Best Practices */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-3">أفضل الممارسات لاختبار A/B</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                        <p className="text-blue-800 dark:text-blue-400 mb-2">
                            • اختبر عنصراً واحداً في كل مرة
                        </p>
                        <p className="text-blue-800 dark:text-blue-400 mb-2">
                            • تأكد من حجم عينة كافٍ
                        </p>
                        <p className="text-blue-800 dark:text-blue-400">
                            • دع الاختبار يعمل لفترة كافية
                        </p>
                    </div>
                    <div>
                        <p className="text-blue-800 dark:text-blue-400 mb-2">
                            • استخدم مستوى ثقة 95% على الأقل
                        </p>
                        <p className="text-blue-800 dark:text-blue-400 mb-2">
                            • قسّم الميزانية بالتساوي بين المتغيرات
                        </p>
                        <p className="text-blue-800 dark:text-blue-400">
                            • اختبر في أوقات مختلفة من اليوم
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderTests = () => (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="font-semibold text-lg">الاختبارات النشطة</h3>
                <Button 
                    onClick={() => setIsCreatingTest(true)}
                    className="flex items-center gap-2"
                >
                    <PlusIcon className="w-4 h-4" />
                    اختبار جديد
                </Button>
            </div>

            {isCreatingTest ? (
                renderCreateTest()
            ) : (
                <>
                    {/* Active Tests */}
                    <div className="space-y-4">
                        {mockABTests.filter(test => test.status === 'ACTIVE').map((test) => (
                            <div key={test.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h4 className="font-semibold text-lg">{test.name}</h4>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">بدأ في {test.startDate}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTestStatusColor(test.status)}`}>
                                            نشط
                                        </span>
                                        <Button size="sm" variant="outline">
                                            <PlayPauseIcon isPlaying={true} className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Real-time Comparison */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    {test.variants.map((variant) => (
                                        <div key={variant.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                                            <h5 className="font-medium mb-2">{variant.name}</h5>
                                            <div className="grid grid-cols-2 gap-2 text-sm">
                                                <div>
                                                    <p className="text-gray-600 dark:text-gray-400">الإنفاق</p>
                                                    <p className="font-medium">${variant.spend}</p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-600 dark:text-gray-400">الوصول</p>
                                                    <p className="font-medium">{variant.reach.toLocaleString()}</p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-600 dark:text-gray-400">CTR</p>
                                                    <p className="font-medium">{variant.ctr}%</p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-600 dark:text-gray-400">تحويلات</p>
                                                    <p className="font-medium">{variant.conversions}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Progress */}
                                <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">مستوى الثقة</span>
                                        <span className="text-sm font-medium">{test.confidence}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                        <div 
                                            className="bg-blue-600 h-2 rounded-full" 
                                            style={{ width: `${test.confidence}%` }}
                                        ></div>
                                    </div>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                        {test.confidence >= 95 ? 'جاهز لإعلان الفائز' : test.confidence >= 80 ? 'اقترب من النتائج' : 'يحتاج المزيد من الوقت'}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Completed Tests */}
                    <div>
                        <h3 className="font-semibold text-lg mb-4">الاختبارات المكتملة</h3>
                        <div className="space-y-4">
                            {mockABTests.filter(test => test.status === 'COMPLETED').map((test) => (
                                <div key={test.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h4 className="font-semibold">{test.name}</h4>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                {test.startDate} - {test.endDate}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTestStatusColor(test.status)}`}>
                                                مكتمل
                                            </span>
                                            {getWinnerBadge(test)}
                                        </div>
                                    </div>

                                    {/* Results Summary */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {test.variants.map((variant) => (
                                            <div key={variant.id} className="bg-white dark:bg-gray-800 rounded-lg p-3">
                                                <div className="flex justify-between items-center mb-2">
                                                    <h5 className="font-medium">{variant.name}</h5>
                                                    {test.winner === variant.id && (
                                                        <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 px-2 py-1 rounded">
                                                            الفائز
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-sm">
                                                    <p>CTR: <span className="font-medium">{variant.ctr}%</span></p>
                                                    <p>معدل التحويل: <span className="font-medium">{variant.conversionRate}%</span></p>
                                                    <p>التحويلات: <span className="font-medium">{variant.conversions}</span></p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );

    if (!isOpen || !target) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <ArrowsRightLeftIcon className="w-5 h-5" />
                            اختبار A/B
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            الصفحة: {target.name}
                        </p>
                    </div>
                    <Button onClick={onClose} variant="secondary" size="sm">
                        <XMarkIcon className="w-5 h-5"/>
                    </Button>
                </div>

                <div className="p-4 overflow-y-auto flex-grow">
                    <div className="border-b dark:border-gray-700 mb-4">
                        <nav className="-mb-px flex space-x-4" aria-label="Tabs">
                            <button
                                onClick={() => setActiveTab('overview')}
                                className={`px-4 py-2 text-sm font-medium transition-colors rounded-t-lg ${
                                    activeTab === 'overview'
                                        ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                }`}
                            >
                                نظرة عامة
                            </button>
                            <button
                                onClick={() => setActiveTab('create')}
                                className={`px-4 py-2 text-sm font-medium transition-colors rounded-t-lg ${
                                    activeTab === 'create'
                                        ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                }`}
                            >
                                إنشاء اختبار
                            </button>
                            <button
                                onClick={() => setActiveTab('tests')}
                                className={`px-4 py-2 text-sm font-medium transition-colors rounded-t-lg ${
                                    activeTab === 'tests'
                                        ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                }`}
                            >
                                الاختبارات
                            </button>
                        </nav>
                    </div>

                    {activeTab === 'overview' && renderOverview()}
                    {activeTab === 'create' && renderCreateTest()}
                    {activeTab === 'tests' && renderTests()}
                </div>
            </div>
        </div>
    );
};

export default ABTestingModal;