
import React, { useState, useEffect } from 'react';
import { db } from '../services/firebaseService';
import { Plan } from '../types';
import Button from './ui/Button';
import PlanEditorModal from './PlanEditorModal';
import TrashIcon from './icons/TrashIcon';
import PencilSquareIcon from './icons/PencilSquareIcon';


const AdminPage: React.FC = () => {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

    const fetchPlans = async () => {
        setIsLoading(true);
        try {
            const plansCollection = db.collection('plans');
            const planSnapshot = await plansCollection.get();
            const planList = planSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Plan));
            setPlans(planList.sort((a,b) => a.price - b.price));
        } catch (error) {
            console.error("Error fetching plans: ", error);
            alert("فشل تحميل الخطط. تحقق من صلاحيات Firestore.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPlans();
    }, []);

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
        await planRef.set(plan, { merge: true });
        setIsModalOpen(false);
        fetchPlans();
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
        <div className="space-y-8 fade-in">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">إدارة خطط الاشتراك</h1>
                <Button onClick={handleAddNew}>+ إضافة خطة جديدة</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plans.map(plan => (
                    <div key={plan.id} className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg flex flex-col">
                        <div className="flex-grow">
                            <h2 className="text-2xl font-bold text-blue-500">{plan.name}</h2>
                            <p className="font-semibold text-lg my-2">{plan.price} ر.س / {plan.pricePeriod === 'monthly' ? 'شهرياً' : (plan.pricePeriod === 'yearly' ? 'سنوياً' : 'مرة واحدة')}</p>
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
        </div>
    );
};

export default AdminPage;
