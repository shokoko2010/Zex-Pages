
import React, { useState, useEffect } from 'react';
import { db, User } from '../services/firebaseService';
import { Plan, AppUser, Target } from '../types'; // Import Target
import Button from './ui/Button';
import PlanEditorModal from './PlanEditorModal';
import TrashIcon from './icons/TrashIcon';
import PencilSquareIcon from './icons/PencilSquareIcon';
import SettingsIcon from './icons/SettingsIcon';
import SunIcon from './icons/SunIcon';
import MoonIcon from './icons/MoonIcon';
import UserCircleIcon from './icons/UserCircleIcon';
import ChartBarIcon from './icons/ChartBarIcon';
import BriefcaseIcon from './icons/BriefcaseIcon';
import PlusIcon from './icons/PlusIcon';
import ArrowPathIcon from './icons/ArrowPathIcon';
import EyeIcon from './icons/EyeIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import ArchiveBoxIcon from './icons/ArchiveBoxIcon';
import ArrowDownTrayIcon from './icons/ArrowDownTrayIcon';

import UserManagementPage from './UserManagementPage'; // Import UserManagementPage

interface AdminPageProps {
  appUser: AppUser; // Add appUser to props
  allUsers: AppUser[];
  plans: Plan[];
  onLogout: () => void;
  onSettingsClick: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onSelectTarget: (target: Target) => void; // New prop for selecting a target
  onNavigateToDashboard: () => void; // New prop for navigating to dashboard
}

const AdminPage: React.FC<AdminPageProps> = ({
  appUser, // Destructure appUser
  allUsers,
  plans: initialPlans,
  onLogout,
  onSettingsClick,
  theme,
  onToggleTheme,
  onSelectTarget, // Destructure onSelectTarget
  onNavigateToDashboard, // Destructure onNavigateToDashboard
}) => {
    const [plans, setPlans] = useState<Plan[]>(initialPlans);
    const [isLoading, setIsLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
    const [adminView, setAdminView] = useState<'dashboard' | 'userManagement' | 'adminPages' | 'analytics'>('dashboard'); // Add 'analytics' view
    const [adminPages, setAdminPages] = useState<Target[]>([]); // New state for admin's pages

    const fetchPlans = async () => {
        setIsLoading(true);
        try {
            const plansCollection = db.collection('plans');
            const planSnapshot = await plansCollection.get();
            const planList = planSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Plan));
            setPlans(planList.sort((a,b) => (a.price || 0) - (b.price || 0)));
        } catch (error) {
            console.error("Error fetching plans: ", error);
            alert("فشل تحميل الخطط. تحقق من صلاحيات Firestore.");
        } finally {
            setIsLoading(false);
        }
    };

    // Use initialPlans and update when it changes
    useEffect(() => {
        setPlans(initialPlans.sort((a,b) => (a.price || 0) - (b.price || 0)));
    }, [initialPlans]);

    // Corrected useEffect to use appUser.targets
    useEffect(() => {
        if (appUser && appUser.targets) {
            setAdminPages(appUser.targets);
        }
    }, [appUser]); // Rerun when appUser changes


    const handleEdit = (plan: Plan) => {
        setEditingPlan(plan);
        setIsModalOpen(true);
    };

    const handleAddNew = () => {
        setEditingPlan(null);
        setIsModalOpen(true);
    };

    const handleSavePlan = async (plan: Plan) => {
        if (!plan.id) {
            alert("معرف الخطة مطلوب.");
            return;
        }
        const planRef = db.collection('plans').doc(plan.id);
        await planRef.set({...plan, adminOnly: plan.adminOnly ?? false }, { merge: true });
        setIsModalOpen(false);
        fetchPlans(); // Refetch all plans to get the latest state
    };

    const handleDeletePlan = async (planId: string) => {
        if (planId === 'free') {
            alert('لا يمكن حذف الخطة المجانية.');
            return;
        }
        if (window.confirm(`هل أنت متأكد من حذف الخطة: ${planId}؟`)) {
            await db.collection('plans').doc(planId).delete();
            fetchPlans();
        }
    };
    
    if (isLoading) {
        return <div className="text-center p-10">جاري تحميل لوحة التحكم...</div>
    }

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
            <header className="bg-white dark:bg-gray-800 shadow-md p-4 flex justify-between items-center">
                 <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400">
                    zex-pages <span className="text-sm font-normal text-red-500">(وضع المدير)</span>
                </h1>
                <div className="flex items-center gap-2">
                     {/* New Buttons for view switching */}
                    {adminView === 'userManagement' ? (
                        <Button onClick={() => setAdminView('dashboard')} variant="secondary" className="!p-2" aria-label="لوحة تحكم المسؤول">
                            <ChartBarIcon className="w-5 h-5"/>
                        </Button>
                    ) : (
                         <Button onClick={() => setAdminView('userManagement')} variant="secondary" className="!p-2" aria-label="إدارة المستخدمين">
                            <UserCircleIcon className="w-5 h-5"/>
                        </Button>
                    )}
                    {/* Button for Analytics View */}
                    {adminView !== 'analytics' && (
                        <Button onClick={() => setAdminView('analytics')} variant="secondary" className="!p-2" aria-label="تحليلات النظام">
                            <ChartBarIcon className="w-5 h-5"/>
                        </Button>
                    )}
                    {adminView === 'analytics' && (
                        <Button onClick={() => setAdminView('dashboard')} variant="secondary" className="!p-2" aria-label="لوحة تحكم المسؤول">
                            <ChartBarIcon className="w-5 h-5"/>
                        </Button>
                    )}
                    {/* Button for Admin Pages View */}
                    {adminView !== 'adminPages' && (
                        <Button onClick={() => setAdminView('adminPages')} variant="secondary" className="!p-2" aria-label="صفحاتي">
                            <span className="text-xs">صفحاتي</span>
                        </Button>
                    )}
                    {adminView === 'adminPages' && (
                        <Button onClick={() => setAdminView('dashboard')} variant="secondary" className="!p-2" aria-label="لوحة تحكم المسؤول">
                            <ChartBarIcon className="w-5 h-5"/>
                        </Button>
                    )}

                    <Button onClick={onSettingsClick} variant="secondary" className="!p-2" aria-label="الإعدادات">
                        <SettingsIcon className="w-5 h-5"/>
                    </Button>
                    <Button onClick={onToggleTheme} variant="secondary" className="!p-2" aria-label="تغيير المظهر">
                        {theme === 'light' ? <MoonIcon className="w-5 h-5" /> : <SunIcon className="w-5 h-5" />}
                    </Button>
                    <Button onClick={onLogout} variant="secondary">تسجيل الخروج</Button>
                </div>
            </header>
            <main className="p-4 sm:p-8 space-y-8">
                {adminView === 'dashboard' ? (
                    <>
                        {/* System Overview Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-xl text-white">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-blue-100">إجمالي المستخدمين</p>
                                        <p className="text-3xl font-bold">{allUsers.length}</p>
                                    </div>
                                    <UserCircleIcon className="w-12 h-12 text-blue-200" />
                                </div>
                            </div>
                            <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-xl text-white">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-green-100">المستخدمون النشطون</p>
                                        <p className="text-3xl font-bold">{allUsers.filter(u => u.lastLoginIp && u.lastLoginIp !== 'unknown').length}</p>
                                    </div>
                                    <ChartBarIcon className="w-12 h-12 text-green-200" />
                                </div>
                            </div>
                            <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 rounded-xl text-white">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-purple-100">الصفحات المدارة</p>
                                        <p className="text-3xl font-bold">{allUsers.reduce((sum, user) => sum + (user.targets?.length || 0), 0)}</p>
                                    </div>
                                    <BriefcaseIcon className="w-12 h-12 text-purple-200" />
                                </div>
                            </div>
                            <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6 rounded-xl text-white">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-orange-100">خطط الاشتراك</p>
                                        <p className="text-3xl font-bold">{plans.length}</p>
                                    </div>
                                    <SettingsIcon className="w-12 h-12 text-orange-200" />
                                </div>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg mb-8">
                            <h2 className="text-2xl font-bold mb-4">إجراءات سريعة</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <Button onClick={() => setAdminView('userManagement')} className="flex items-center justify-center gap-2 h-20">
                                    <UserCircleIcon className="w-6 h-6" />
                                    إدارة المستخدمين
                                </Button>
                                <Button onClick={handleAddNew} variant="secondary" className="flex items-center justify-center gap-2 h-20">
                                    <PlusIcon className="w-6 h-6" />
                                    إضافة خطة جديدة
                                </Button>
                                <Button onClick={() => setAdminView('adminPages')} variant="secondary" className="flex items-center justify-center gap-2 h-20">
                                    <BriefcaseIcon className="w-6 h-6" />
                                    صفحاتي
                                </Button>
                                <Button variant="outline" className="flex items-center justify-center gap-2 h-20">
                                    <ArrowPathIcon className="w-6 h-6" />
                                    مزامنة النظام
                                </Button>
                            </div>
                        </div>

                        {/* Plan Management */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg mb-8">
                            <div className="flex justify-between items-center mb-6">
                                <h1 className="text-3xl font-bold">إدارة خطط الاشتراك</h1>
                                <Button onClick={handleAddNew}>+ إضافة خطة جديدة</Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {plans.map(plan => (
                                    <div key={plan.id} className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg flex flex-col border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow">
                                        <div className="flex-grow">
                                            <div className="flex items-center justify-between mb-2">
                                                <h2 className="text-2xl font-bold text-blue-500">{plan.name}</h2>
                                                {plan.adminOnly && (
                                                    <span className="inline-block bg-red-100 text-red-700 text-xs font-semibold px-2 py-1 rounded-full">خاص بالمسؤولين</span>
                                                )}
                                            </div>
                                            <p className="font-semibold text-lg my-2 text-gray-700 dark:text-gray-300">{plan.price} ر.س / {plan.pricePeriod === 'monthly' ? 'شهرياً' : (plan.pricePeriod === 'annual' ? 'سنوياً' : 'مرة واحدة')}</p>
                                            <ul className="mt-4 space-y-2 text-sm list-disc list-inside text-gray-700 dark:text-gray-300">
                                                {plan.features.map((feature, i) => <li key={i}>{feature}</li>)}
                                                <li className="font-semibold">{plan.limits.pages === -1 ? 'عدد لا نهائي من الصفحات' : `حتى ${plan.limits.pages} صفحة`}</li>
                                            </ul>
                                        </div>
                                        <div className="mt-6 flex gap-2 pt-4 border-t dark:border-gray-700">
                                            <Button variant="secondary" size="sm" onClick={() => handleEdit(plan)} className="w-full">
                                                <PencilSquareIcon className="w-4 h-4 ml-2"/>
                                                تعديل
                                            </Button>
                                            <Button variant="danger" size="sm" onClick={() => handleDeletePlan(plan.id)} className="w-full" disabled={plan.id === 'free'}>
                                                <TrashIcon className="w-4 h-4 ml-2"/>
                                                حذف
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    
                        <PlanEditorModal
                            isOpen={isModalOpen}
                            onClose={() => setIsModalOpen(false)}
                            onSave={handleSavePlan}
                            plan={editingPlan}
                        />

                        {/* Enhanced Users Table */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold">المستخدمون ({allUsers.length})</h2>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm">تصدير CSV</Button>
                                    <Button variant="outline" size="sm">تصفية</Button>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                        <tr>
                                            <th scope="col" className="px-6 py-3">المستخدم</th>
                                            <th scope="col" className="px-6 py-3">البريد الإلكتروني</th>
                                            <th scope="col" className="px-6 py-3">الخطة</th>
                                            <th scope="col" className="px-6 py-3">الحالة</th>
                                            <th scope="col" className="px-6 py-3">الصفحات</th>
                                            <th scope="col" className="px-6 py-3">تاريخ التسجيل</th>
                                            <th scope="col" className="px-6 py-3">آخر نشاط</th>
                                            <th scope="col" className="px-6 py-3">إجراءات</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {allUsers.map(u => {
                                            const userPlan = plans.find(p => p.id === u.planId);
                                            const isActive = u.lastLoginIp && u.lastLoginIp !== 'unknown';
                                            
                                            return (
                                                <tr key={u.uid} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center">
                                                            <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center mr-3">
                                                                {u.photoURL ? (
                                                                    <img src={u.photoURL} alt={u.name} className="w-10 h-10 rounded-full object-cover" />
                                                                ) : (
                                                                    <span className="text-gray-600 dark:text-gray-300 font-semibold">
                                                                        {u.displayName?.charAt(0) || u.email?.charAt(0) || 'U'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <div className="font-medium text-gray-900 dark:text-white">{u.displayName || u.name || 'غير محدد'}</div>
                                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                                    {u.isAdmin ? <span className="text-red-600">مسؤول</span> : 'مستخدم'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{u.email}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                                            userPlan?.id === 'free' ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' :
                                                            userPlan?.id === 'premium' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' :
                                                            'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                                                        }`}>
                                                            {userPlan?.name || u.planId || 'free'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                                            isActive ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                                        }`}>
                                                            {isActive ? 'نشط' : 'غير نشط'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">{u.targets?.length || 0}</td>
                                                    <td className="px-6 py-4">{u.createdAt ? new Date(u.createdAt).toLocaleDateString('ar-EG') : '-'}</td>
                                                    <td className="px-6 py-4">
                                                        {u.lastLoginIp && u.lastLoginIp !== 'unknown' ? (
                                                            u.createdAt && Math.floor((Date.now() - u.createdAt) / (1000 * 60 * 60 * 24)) === 0 ? 'اليوم' :
                                                            u.createdAt && Math.floor((Date.now() - u.createdAt) / (1000 * 60 * 60 * 24)) === 1 ? 'أمس' :
                                                            u.createdAt ? `منذ ${Math.floor((Date.now() - u.createdAt) / (1000 * 60 * 60 * 24))} أيام` : 'مستخدم جديد'
                                                        ) : 'لم يسجل دخوله'}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex gap-2">
                                                            <Button variant="outline" size="sm" className="!p-2" title="عرض التفاصيل">
                                                                <EyeIcon className="w-4 h-4" />
                                                            </Button>
                                                            <Button variant="outline" size="sm" className="!p-2" title="تعديل">
                                                                <PencilSquareIcon className="w-4 h-4" />
                                                            </Button>
                                                            {!u.isAdmin && (
                                                                <Button variant="danger" size="sm" className="!p-2" title="حذف">
                                                                    <TrashIcon className="w-4 h-4" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                ) : adminView === 'analytics' ? (
                    <div className="space-y-8">
                        {/* System Analytics Overview */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
                            <h2 className="text-2xl font-bold mb-6">تحليلات النظام</h2>
                            
                            {/* User Growth Chart */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                                <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
                                    <h3 className="text-lg font-semibold mb-4">نمو المستخدمين</h3>
                                    <div className="h-64 flex items-center justify-center text-gray-500">
                                        <div className="text-center">
                                            <ChartBarIcon className="w-16 h-16 mx-auto mb-2" />
                                            <p>مخطط نمو المستخدمين</p>
                                            <p className="text-sm">سيتم عرض البيانات هنا عند توفرها</p>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Plan Distribution */}
                                <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
                                    <h3 className="text-lg font-semibold mb-4">توزيع الخطط</h3>
                                    <div className="space-y-4">
                                        {plans.map(plan => {
                                            const userCount = allUsers.filter(u => u.planId === plan.id).length;
                                            const percentage = allUsers.length > 0 ? (userCount / allUsers.length) * 100 : 0;
                                            
                                            return (
                                                <div key={plan.id}>
                                                    <div className="flex justify-between mb-1">
                                                        <span className="text-sm font-medium">{plan.name}</span>
                                                        <span className="text-sm text-gray-600">{userCount} مستخدم ({percentage.toFixed(1)}%)</span>
                                                    </div>
                                                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                                        <div 
                                                            className={`h-2 rounded-full ${
                                                                plan.id === 'free' ? 'bg-gray-500' :
                                                                plan.id === 'premium' ? 'bg-purple-500' :
                                                                'bg-blue-500'
                                                            }`}
                                                            style={{ width: `${percentage}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* System Health */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg border border-green-200 dark:border-green-800">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="font-semibold text-green-800 dark:text-green-300">حالة النظام</h4>
                                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">جيد</p>
                                        </div>
                                        <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                                            <CheckCircleIcon className="w-6 h-6 text-white" />
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="font-semibold text-blue-800 dark:text-blue-300">استخدام التخزين</h4>
                                            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">45%</p>
                                        </div>
                                        <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                                            <ArchiveBoxIcon className="w-6 h-6 text-white" />
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="bg-orange-50 dark:bg-orange-900/20 p-6 rounded-lg border border-orange-200 dark:border-orange-800">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="font-semibold text-orange-800 dark:text-orange-300">معدل الاستخدام</h4>
                                            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">87%</p>
                                        </div>
                                        <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
                                            <ChartBarIcon className="w-6 h-6 text-white" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Recent Activity */}
                            <div className="mt-8">
                                <h3 className="text-lg font-semibold mb-4">النشاط الأخير</h3>
                                <div className="space-y-3">
                                    {allUsers.slice(0, 5).map(user => (
                                        <div key={user.uid} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                                                    <span className="text-xs font-semibold">
                                                        {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="font-medium text-sm">{user.displayName || user.email}</p>
                                                    <p className="text-xs text-gray-600 dark:text-gray-400">
                                                        {user.lastLoginIp && user.lastLoginIp !== 'unknown' ? `آخر دخول: ${new Date(user.createdAt || Date.now()).toLocaleDateString('ar-EG')}` : 'لم يسجل دخوله'}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="text-xs text-gray-500">
                                                {user.isAdmin ? 'مسؤول' : 'مستخدم'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Data Export */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
                            <h3 className="text-lg font-semibold mb-4">تصدير البيانات</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Button variant="outline" className="flex items-center justify-center gap-2 h-16">
                                    <ArrowDownTrayIcon className="w-5 h-5" />
                                    تصدير المستخدمين
                                </Button>
                                <Button variant="outline" className="flex items-center justify-center gap-2 h-16">
                                    <ArrowDownTrayIcon className="w-5 h-5" />
                                    تصدير التحليلات
                                </Button>
                                <Button variant="outline" className="flex items-center justify-center gap-2 h-16">
                                    <ArrowDownTrayIcon className="w-5 h-5" />
                                    نسخة احتياطية
                                </Button>
                            </div>
                        </div>
                    </div>
                ) : adminView === 'userManagement' ? (
                    <UserManagementPage 
                        allUsers={allUsers} 
                        plans={plans} 
                        // Pass necessary props to UserManagementPage
                        // You might need to add props here for managing users and their pages
                        // based on the implementation of UserManagementPage
                    />
                ) : ( // adminView === 'adminPages'
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
                        <h2 className="text-2xl font-bold mb-4">صفحاتي ({adminPages.length})</h2>
                        {adminPages.length === 0 ? (
                            <p className="text-gray-600 dark:text-gray-400">لا توجد صفحات مرتبطة بحساب المسؤول هذا حتى الآن.</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {adminPages.map(page => (
                                    <Button key={page.id} onClick={() => {
                                        onSelectTarget(page);
                                        onNavigateToDashboard();
                                    }} variant="secondary" className="border dark:border-gray-700 rounded-lg p-4 flex items-center space-x-4 text-left w-full">
                                        <img src={page.picture.data.url} alt={page.name} className="w-12 h-12 rounded-full object-cover" />
                                        <div>
                                            <h3 className="text-lg font-semibold">{page.name}</h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">المنصة: {page.type === 'facebook' ? 'فيسبوك' : 'إنستغرام'}</p>
                                        </div>
                                    </Button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};

export default AdminPage;
