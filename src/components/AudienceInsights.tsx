import React, { useState } from 'react';
import { Target } from '../types';
import Button from './ui/Button';
import XMarkIcon from './icons/XMarkIcon';
import UserGroupIcon from './icons/UserGroupIcon';
import ChartPieIcon from './icons/ChartPieIcon';
import MapPinIcon from './icons/ArchiveBoxIcon';
import SparklesIcon from './icons/SparklesIcon';
import HeartIcon from './icons/HeartIcon';
import ChatBubbleLeftRightIcon from './icons/ChatBubbleLeftRightIcon';

interface AudienceInsightsProps {
    isOpen: boolean;
    onClose: () => void;
    target: Target | null;
    campaigns: any[];
}

interface AudienceData {
    demographics: {
        age: { range: string; percentage: number }[];
        gender: { type: string; percentage: number }[];
        location: { country: string; percentage: number }[];
    };
    interests: { category: string; score: number }[];
    behaviors: { behavior: string; score: number }[];
    deviceUsage: { device: string; percentage: number }[];
}

const AudienceInsights: React.FC<AudienceInsightsProps> = ({ isOpen, onClose, target, campaigns }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'demographics' | 'interests' | 'behaviors'>('overview');
    const [selectedTimeRange, setSelectedTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

    // Mock audience data - in a real implementation, this would come from Facebook API
    const mockAudienceData: AudienceData = {
        demographics: {
            age: [
                { range: '13-17', percentage: 5 },
                { range: '18-24', percentage: 25 },
                { range: '25-34', percentage: 35 },
                { range: '35-44', percentage: 20 },
                { range: '45-54', percentage: 10 },
                { range: '55+', percentage: 5 }
            ],
            gender: [
                { type: 'female', percentage: 58 },
                { type: 'male', percentage: 40 },
                { type: 'other', percentage: 2 }
            ],
            location: [
                { country: 'السعودية', percentage: 45 },
                { country: 'مصر', percentage: 20 },
                { country: 'الإمارات', percentage: 15 },
                { country: 'الكويت', percentage: 10 },
                { country: 'أخرى', percentage: 10 }
            ]
        },
        interests: [
            { category: 'التسوق', score: 85 },
            { category: 'التكنولوجيا', score: 78 },
            { category: 'السفر', score: 72 },
            { category: 'الطعام', score: 68 },
            { category: 'الرياضة', score: 65 },
            { category: 'الموضة', score: 62 },
            { category: 'الصحة', score: 58 },
            { category: 'التعليم', score: 55 }
        ],
        behaviors: [
            { behavior: 'مشتركي متكرر', score: 82 },
            { behavior: 'مستخدمو الهاتف المحمول', score: 78 },
            { behavior: 'مشتركي عبر الإنترنت', score: 75 },
            { behavior: 'مهتمون بالعروض', score: 70 },
            { behavior: 'مشاركون اجتماعيين', score: 68 }
        ],
        deviceUsage: [
            { device: 'الهاتف المحمول', percentage: 75 },
            { device: 'الحاسوب', percentage: 20 },
            { device: 'الجهاز اللوحي', percentage: 5 }
        ]
    };

    const calculateTotalReach = () => {
        return campaigns.reduce((sum, campaign) => sum + parseInt(campaign.insights?.reach || '0', 10), 0);
    };

    const calculateEngagementRate = () => {
        const totalClicks = campaigns.reduce((sum, campaign) => sum + parseInt(campaign.insights?.clicks || '0', 10), 0);
        const totalReach = calculateTotalReach();
        return totalReach > 0 ? (totalClicks / totalReach) * 100 : 0;
    };

    const getTopPerformingDemographic = () => {
        const ageData = mockAudienceData.demographics.age;
        return ageData.reduce((max, current) => current.percentage > max.percentage ? current : max);
    };

    const getAudienceQualityScore = () => {
        const avgInterestScore = mockAudienceData.interests.reduce((sum, interest) => sum + interest.score, 0) / mockAudienceData.interests.length;
        const avgBehaviorScore = mockAudienceData.behaviors.reduce((sum, behavior) => sum + behavior.score, 0) / mockAudienceData.behaviors.length;
        return Math.round((avgInterestScore + avgBehaviorScore) / 2);
    };

    const renderOverview = () => (
        <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                        <UserGroupIcon className="w-6 h-6 text-blue-600" />
                        <h3 className="font-semibold text-blue-800 dark:text-blue-300">إجمالي الوصول</h3>
                    </div>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {calculateTotalReach().toLocaleString()}
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-400">مستخدم فريد</p>
                </div>

                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                        <ChartPieIcon className="w-6 h-6 text-green-600" />
                        <h3 className="font-semibold text-green-800 dark:text-green-300">معدل التفاعل</h3>
                    </div>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {calculateEngagementRate().toFixed(2)}%
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-400">متوسط التفاعل</p>
                </div>

                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                        <SparklesIcon className="w-6 h-6 text-purple-600" />
                        <h3 className="font-semibold text-purple-800 dark:text-purple-300">جودة الجمهور</h3>
                    </div>
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {getAudienceQualityScore()}/100
                    </p>
                    <p className="text-sm text-purple-700 dark:text-purple-400">نقاط الجودة</p>
                </div>
            </div>

            {/* Top Demographics */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-4">أهم الفئات الديموغرافية</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <h4 className="font-medium mb-2">العمر الأكثر تفاعلاً</h4>
                        <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                <div 
                                    className="bg-blue-600 h-2 rounded-full" 
                                    style={{ width: `${getTopPerformingDemographic().percentage}%` }}
                                ></div>
                            </div>
                            <span className="text-sm font-medium">{getTopPerformingDemographic().range}</span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            {getTopPerformingDemographic().percentage}% من الجمهور
                        </p>
                    </div>
                    <div>
                        <h4 className="font-medium mb-2">الجنس الأكثر تفاعلاً</h4>
                        <div className="space-y-2">
                            {mockAudienceData.demographics.gender.map((gender, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <span className="text-sm w-16">{gender.type === 'female' ? 'إناث' : gender.type === 'male' ? 'ذكور' : 'آخر'}</span>
                                    <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                        <div 
                                            className={`h-2 rounded-full ${gender.type === 'female' ? 'bg-pink-600' : gender.type === 'male' ? 'bg-blue-600' : 'bg-gray-600'}`}
                                            style={{ width: `${gender.percentage}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-sm font-medium">{gender.percentage}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Top Interests */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-4">أهم الاهتمامات</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {mockAudienceData.interests.slice(0, 8).map((interest, index) => (
                        <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-3 text-center">
                            <div className="text-2xl mb-1">
                                {interest.category === 'التسوق' ? '🛍️' :
                                 interest.category === 'التكنولوجيا' ? '💻' :
                                 interest.category === 'السفر' ? '✈️' :
                                 interest.category === 'الطعام' ? '🍕' :
                                 interest.category === 'الرياضة' ? '⚽' :
                                 interest.category === 'الموضة' ? '👗' : '📦'}
                            </div>
                            <p className="text-sm font-medium">{interest.category}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">{interest.score}/100</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Insights Summary */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <SparklesIcon className="w-5 h-5 text-yellow-600" />
                    رؤى الجمهور
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                        <p className="text-yellow-800 dark:text-yellow-400 mb-2">
                            • الجمهور المستهدف ينتمي بشكل أساسي إلى فئة العمر {getTopPerformingDemographic().range}
                        </p>
                        <p className="text-yellow-800 dark:text-yellow-400 mb-2">
                            • الإناث يمثلن الغالبية ({mockAudienceData.demographics.gender.find(g => g.type === 'female')?.percentage}%)
                        </p>
                        <p className="text-yellow-800 dark:text-yellow-400">
                            • معظم المستخدمين يفضلون الهاتف المحمول ({mockAudienceData.deviceUsage.find(d => d.device === 'الهاتف المحمول')?.percentage}%)
                        </p>
                    </div>
                    <div>
                        <p className="text-yellow-800 dark:text-yellow-400 mb-2">
                            • الاهتمامات الأعلى: التسوق والتكنولوجيا
                        </p>
                        <p className="text-yellow-800 dark:text-yellow-400 mb-2">
                            • سلوك الشراء: {mockAudienceData.behaviors.find(b => b.behavior === 'مشتركي متكرر')?.score}/100
                        </p>
                        <p className="text-yellow-800 dark:text-yellow-400">
                            • جودة الجمهور الإجمالية: {getAudienceQualityScore()}/100
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderDemographics = () => (
        <div className="space-y-6">
            {/* Age Distribution */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-4">توزيع العمر</h3>
                <div className="space-y-3">
                    {mockAudienceData.demographics.age.map((age, index) => (
                        <div key={index} className="flex items-center gap-3">
                            <span className="text-sm w-16">{age.range}</span>
                            <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-3">
                                <div 
                                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full" 
                                    style={{ width: `${age.percentage}%` }}
                                ></div>
                            </div>
                            <span className="text-sm font-medium w-12 text-left">{age.percentage}%</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Gender Distribution */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-4">توزيع الجنس</h3>
                <div className="grid grid-cols-3 gap-4">
                    {mockAudienceData.demographics.gender.map((gender, index) => (
                        <div key={index} className="text-center">
                            <div className="w-20 h-20 mx-auto mb-2 rounded-full flex items-center justify-center text-2xl bg-gray-100 dark:bg-gray-700">
                                {gender.type === 'female' ? '👩' : gender.type === 'male' ? '👨' : '👤'}
                            </div>
                            <p className="font-medium">{gender.type === 'female' ? 'إناث' : gender.type === 'male' ? 'ذكور' : 'آخر'}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{gender.percentage}%</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Geographic Distribution */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <MapPinIcon className="w-5 h-5" />
                    التوزيع الجغرافي
                </h3>
                <div className="space-y-3">
                    {mockAudienceData.demographics.location.map((location, index) => (
                        <div key={index} className="flex items-center gap-3">
                            <span className="text-sm w-24">{location.country}</span>
                            <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-3">
                                <div 
                                    className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full" 
                                    style={{ width: `${location.percentage}%` }}
                                ></div>
                            </div>
                            <span className="text-sm font-medium w-12 text-left">{location.percentage}%</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Device Usage */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-4">استخدام الأجهزة</h3>
                <div className="grid grid-cols-3 gap-4">
                    {mockAudienceData.deviceUsage.map((device, index) => (
                        <div key={index} className="text-center">
                            <div className="w-16 h-16 mx-auto mb-2 rounded-full flex items-center justify-center text-2xl bg-gray-100 dark:bg-gray-700">
                                {device.device === 'الهاتف المحمول' ? '📱' : device.device === 'الحاسوب' ? '💻' : '📟'}
                            </div>
                            <p className="font-medium text-sm">{device.device}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{device.percentage}%</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderInterests = () => (
        <div className="space-y-6">
            {/* Interest Categories */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-4">فئات الاهتمام</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {mockAudienceData.interests.map((interest, index) => (
                        <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-4">
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="font-medium">{interest.category}</h4>
                                <span className="text-sm font-bold text-blue-600">{interest.score}/100</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                <div 
                                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full" 
                                    style={{ width: `${interest.score}%` }}
                                ></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Interest Insights */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <HeartIcon className="w-5 h-5 text-blue-600" />
                    رؤى الاهتمامات
                </h3>
                <div className="space-y-3 text-sm">
                    <p className="text-blue-800 dark:text-blue-400">
                        • الاهتمامات الأعلى: {mockAudienceData.interests[0].category} و {mockAudienceData.interests[1].category}
                    </p>
                    <p className="text-blue-800 dark:text-blue-400">
                        • متوسط نقاط الاهتمام: {(mockAudienceData.interests.reduce((sum, interest) => sum + interest.score, 0) / mockAudienceData.interests.length).toFixed(1)}/100
                    </p>
                    <p className="text-blue-800 dark:text-blue-400">
                        • يمكن استهداف الجمهور بمحتوى يتعلق بالتسوق والتكنولوجيا لتحقيق تفاعل أعلى
                    </p>
                </div>
            </div>
        </div>
    );

    const renderBehaviors = () => (
        <div className="space-y-6">
            {/* Behavior Patterns */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-4">أنماط السلوك</h3>
                <div className="space-y-4">
                    {mockAudienceData.behaviors.map((behavior, index) => (
                        <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-4">
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="font-medium">{behavior.behavior}</h4>
                                <span className="text-sm font-bold text-green-600">{behavior.score}/100</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                <div 
                                    className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full" 
                                    style={{ width: `${behavior.score}%` }}
                                ></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Behavior Insights */}
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <ChatBubbleLeftRightIcon className="w-5 h-5 text-green-600" />
                    رؤى السلوك
                </h3>
                <div className="space-y-3 text-sm">
                    <p className="text-green-800 dark:text-green-400">
                        • الجمهور يميل إلى الشراء المتكرر ({mockAudienceData.behaviors.find(b => b.behavior === 'مشتركي متكرر')?.score}/100)
                    </p>
                    <p className="text-green-800 dark:text-green-400">
                        • معظم المستخدمين نشطون على الهاتف المحمول ({mockAudienceData.behaviors.find(b => b.behavior === 'مستخدمو الهاتف المحمول')?.score}/100)
                    </p>
                    <p className="text-green-800 dark:text-green-400">
                        • استهداف العروض والتخفيضات فعال مع هذا الجمهور ({mockAudienceData.behaviors.find(b => b.behavior === 'مهتمون بالعروض')?.score}/100)
                    </p>
                </div>
            </div>

            {/* Recommendations */}
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-3">توصيات الاستهداف</h3>
                <div className="space-y-2 text-sm">
                    <p className="text-purple-800 dark:text-purple-400">
                        • ركز على المحتوى الذي يناسب الفئة العمرية {getTopPerformingDemographic().range}
                    </p>
                    <p className="text-purple-800 dark:text-purple-400">
                        • استخدم صوراً ومنشورات تجذب الإناث (الجمهور الأكبر)
                    </p>
                    <p className="text-purple-800 dark:text-purple-400">
                        • قدم عروضاً خاصة وعروضاً ترويجية لزيادة التفاعل
                    </p>
                    <p className="text-purple-800 dark:text-purple-400">
                        • تأكد من أن موقعك متوافق مع الهاتف المحمول
                    </p>
                </div>
            </div>
        </div>
    );

    if (!isOpen || !target) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
                    <div>
                        <h2 className="text-xl font-bold">رؤى الجمهور المستهدف</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            الصفحة: {target.name} | الفترة: {selectedTimeRange === '7d' ? 'آخر 7 أيام' : selectedTimeRange === '30d' ? 'آخر 30 يوم' : 'آخر 90 يوم'}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <select
                            value={selectedTimeRange}
                            onChange={(e) => setSelectedTimeRange(e.target.value as any)}
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                        >
                            <option value="7d">آخر 7 أيام</option>
                            <option value="30d">آخر 30 يوم</option>
                            <option value="90d">آخر 90 يوم</option>
                        </select>
                        <Button onClick={onClose} variant="secondary" size="sm">
                            <XMarkIcon className="w-5 h-5"/>
                        </Button>
                    </div>
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
                                onClick={() => setActiveTab('demographics')}
                                className={`px-4 py-2 text-sm font-medium transition-colors rounded-t-lg ${
                                    activeTab === 'demographics'
                                        ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                }`}
                            >
                                ديموغرافيا
                            </button>
                            <button
                                onClick={() => setActiveTab('interests')}
                                className={`px-4 py-2 text-sm font-medium transition-colors rounded-t-lg ${
                                    activeTab === 'interests'
                                        ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                }`}
                            >
                                اهتمامات
                            </button>
                            <button
                                onClick={() => setActiveTab('behaviors')}
                                className={`px-4 py-2 text-sm font-medium transition-colors rounded-t-lg ${
                                    activeTab === 'behaviors'
                                        ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                }`}
                            >
                                سلوكيات
                            </button>
                        </nav>
                    </div>

                    {activeTab === 'overview' && renderOverview()}
                    {activeTab === 'demographics' && renderDemographics()}
                    {activeTab === 'interests' && renderInterests()}
                    {activeTab === 'behaviors' && renderBehaviors()}
                </div>
            </div>
        </div>
    );
};

export default AudienceInsights;