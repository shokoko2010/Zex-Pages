
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/firebaseService';
import { AppUser, Plan } from '../types';
import Button from './ui/Button';
import SearchIcon from './icons/SearchIcon';

interface UserManagementPageProps {
  plans: Plan[];
}

const UserManagementPage: React.FC<UserManagementPageProps> = ({ plans }) => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [userPlanChanges, setUserPlanChanges] = useState<Record<string, string>>({});
  const [updatingUsers, setUpdatingUsers] = useState<Set<string>>(new Set());

  const plansMap = useMemo(() => new Map(plans.map(p => [p.id, p.name])), [plans]);

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const usersCollection = db.collection('users');
        const usersSnapshot = await usersCollection.get();
        const usersList = usersSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as AppUser));
        setUsers(usersList);
      } catch (e) {
        console.error("Error fetching users:", e);
        setError("فشل تحميل بيانات المستخدمين.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const handlePlanSelectionChange = (uid: string, newPlanId: string) => {
    setUserPlanChanges(prev => ({
      ...prev,
      [uid]: newPlanId,
    }));
  };

  const handleSaveChanges = async (uid: string) => {
    const newPlanId = userPlanChanges[uid];
    if (!newPlanId) return;

    setUpdatingUsers(prev => new Set(prev).add(uid));
    try {
      const userDocRef = db.collection('users').doc(uid);
      await userDocRef.update({ planId: newPlanId });
      
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.uid === uid ? { ...user, planId: newPlanId } : user
        )
      );
      
      setUserPlanChanges(prev => {
        const newChanges = { ...prev };
        delete newChanges[uid];
        return newChanges;
      });

      alert(`تم تحديث خطة المستخدم بنجاح إلى: ${plansMap.get(newPlanId) || newPlanId}`);

    } catch (e) {
      console.error("Error updating user plan:", e);
      alert("فشل تحديث خطة المستخدم.");
    } finally {
        setUpdatingUsers(prev => {
            const newSet = new Set(prev);
            newSet.delete(uid);
            return newSet;
        });
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(user => 
      user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [users, searchTerm]);
  
  if (isLoading) return <div className="text-center p-10">جاري تحميل المستخدمين...</div>;
  if (error) return <div className="text-center p-10 text-red-500">{error}</div>;

  return (
    <div className="space-y-6 fade-in">
        <h1 className="text-3xl font-bold">إدارة المستخدمين</h1>

        <div className="relative w-full max-w-lg">
            <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ابحث عن مستخدم عبر البريد الإلكتروني..."
                className="w-full p-3 pl-10 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon className="w-5 h-5 text-gray-400" />
            </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                    <tr>
                        <th scope="col" className="px-6 py-3">البريد الإلكتروني</th>
                        <th scope="col" className="px-6 py-3">تاريخ التسجيل</th>
                        <th scope="col" className="px-6 py-3">الخطة الحالية</th>
                        <th scope="col" className="px-6 py-3">تغيير الخطة</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredUsers.map(user => {
                        const isUpdating = updatingUsers.has(user.uid);
                        const hasChange = !!userPlanChanges[user.uid];
                        return (
                            <tr key={user.uid} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                                    {user.email}
                                </td>
                                <td className="px-6 py-4">
                                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString('ar-EG') : 'غير معروف'}
                                </td>
                                <td className="px-6 py-4">
                                    <span className="px-2 py-1 font-semibold leading-tight text-green-700 bg-green-100 rounded-full dark:bg-green-700 dark:text-green-100">
                                      {plansMap.get(user.planId) || user.planId}
                                    </span>
                                </td>
                                <td className="px-6 py-4 flex items-center gap-2">
                                    <select 
                                        value={userPlanChanges[user.uid] || user.planId}
                                        onChange={(e) => handlePlanSelectionChange(user.uid, e.target.value)}
                                        className="p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        {plans.sort((a,b) => a.price - b.price).map(plan => (
                                            <option key={plan.id} value={plan.id}>{plan.name}</option>
                                        ))}
                                    </select>
                                    <Button
                                        size="sm"
                                        onClick={() => handleSaveChanges(user.uid)}
                                        isLoading={isUpdating}
                                        disabled={!hasChange || isUpdating}
                                    >
                                        حفظ
                                    </Button>
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
            {filteredUsers.length === 0 && (
                <p className="text-center py-8 text-gray-500">
                    {searchTerm ? 'لم يتم العثور على مستخدمين يطابقون البحث.' : 'لا يوجد مستخدمون لعرضهم.'}
                </p>
            )}
        </div>
    </div>
  );
};

export default UserManagementPage;
