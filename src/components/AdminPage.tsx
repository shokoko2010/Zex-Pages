
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
import UserCircleIcon from './icons/UserCircleIcon'; // Import UserCircleIcon
import ChartBarIcon from './icons/ChartBarIcon'; // Import ChartBarIcon for Admin Dashboard button

import UserManagementPage from './UserManagementPage'; // Import UserManagementPage

interface AdminPageProps {
  user: User;
  appUser: AppUser; // Add appUser to props
  allUsers: AppUser[];
  plans: Plan[];
  onLogout: () => void;
  onSettingsClick: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onSelectTarget: (target: Target) => void; // New prop for selecting a target
}

const AdminPage: React.FC<AdminPageProps> = ({
  user,
  appUser, // Destructure appUser
  allUsers,
  plans: initialPlans,
  onLogout,
  onSettingsClick,
  theme,
  onToggleTheme,
  onSelectTarget, // Destructure onSelectTarget
}) => {
    const [plans, setPlans] = useState<Plan[]>(initialPlans);
    const [isLoading, setIsLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
    const [adminView, setAdminView] = useState<'dashboard' | 'userManagement' | 'adminPages'>('dashboard'); // Add 'adminPages' view
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
                        {/* Original Dashboard Content (Plan Management and Users Table) */}
                        <div className="flex justify-between items-center">
                            <h1 className="text-3xl font-bold">إدارة خطط الاشتراك</h1>
                            <Button onClick={handleAddNew}>+ إضافة خطة جديدة</Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {plans.map(plan => (
                                <div key={plan.id} className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg flex flex-col">
                                    <div className="flex-grow">
                                        <h2 className="text-2xl font-bold text-blue-500">{plan.name}</h2>
                                        <p className="font-semibold text-lg my-2">{plan.price} ر.س / {plan.pricePeriod === 'monthly' ? 'شهرياً' : (plan.pricePeriod === 'annual' ? 'سنوياً' : 'مرة واحدة')}</p>
                                        {plan.adminOnly && (
                                            <span className="inline-block bg-red-100 text-red-700 text-xs font-semibold px-2 py-1 rounded-full">خاص بالمسؤولين</span>
                                        )}
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
                    
                        <PlanEditorModal
                            isOpen={isModalOpen}
                            onClose={() => setIsModalOpen(false)}
                            onSave={handleSavePlan}
                            plan={editingPlan}
                        />

                        {/* Users Table - Keep this in dashboard view */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg mt-10">
                            <h2 className="text-2xl font-bold mb-4">المستخدمون ({allUsers.length})</h2>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                        <tr>
                                            <th scope="col" className="px-6 py-3">البريد الإلكتروني</th>
                                            <th scope="col" className="px-6 py-3">الاسم</th>
                                            <th scope="col" className="px-6 py-3">الخطة</th>
                                            <th scope="col" className="px-6 py-3">تاريخ التسجيل</th>
                                            <th scope="col" className="px-6 py-3">آخر IP</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {allUsers.map(u => (
                                            <tr key={u.uid} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                                <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{u.email}</td>
                                                <td className="px-6 py-4">{u.name || '-'}</td>
                                                <td className="px-6 py-4">{plans.find(p => p.id === u.planId)?.name || u.planId}</td>
                                                <td className="px-6 py-4">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}</td>
                                                <td className="px-6 py-4">{u.lastLoginIp || '-'}</td>
                                            </tr>
                                        ))}

                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
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
                                    <Button key={page.id} onClick={() => onSelectTarget(page)} variant="secondary" className="border dark:border-gray-700 rounded-lg p-4 flex items-center space-x-4 text-left w-full">
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
