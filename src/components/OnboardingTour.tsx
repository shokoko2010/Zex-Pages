
import React, { useState, useEffect } from 'react';
import Button from './ui/Button';

interface OnboardingTourProps {
  isOpen: boolean;
  onComplete: () => void;
  hasConnectedFacebook: boolean;
  hasSelectedTarget: boolean;
}

const steps = [
  {
    title: 'أهلاً بك في zex-pages!',
    content: 'للبدء، الخطوة الأولى هي ربط حسابك على فيسبوك للوصول إلى صفحاتك.',
    target: 'connect-facebook',
    requires: 'nothing',
  },
  {
    title: 'اختر صفحتك',
    content: 'رائع! الآن، اختر الصفحة التي ترغب في إدارتها من القائمة.',
    target: 'select-page',
    requires: 'facebook',
  },
  {
    title: 'أخبرنا عن صفحتك',
    content: 'هذه الخطوة مهمة جداً! املأ "ملف الصفحة" بمعلومات دقيقة ليتمكن الذكاء الاصطناعي من إنشاء محتوى مخصص ومثالي لعملك.',
    target: 'page-profile-tab',
    requires: 'target',
  },
  {
    title: 'أنشئ أول منشور لك',
    content: 'أنت جاهز الآن! اذهب إلى قسم "إنشاء منشور" واستخدم مساعد الذكاء الاصطناعي لكتابة أول محتوى لك.',
    target: 'composer-tab',
    requires: 'target',
  },
];

const OnboardingTour: React.FC<OnboardingTourProps> = ({
  isOpen,
  onComplete,
  hasConnectedFacebook,
  hasSelectedTarget,
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (isOpen) {
        if (hasSelectedTarget) {
            setCurrentStep(2);
        } else if (hasConnectedFacebook) {
            setCurrentStep(1);
        } else {
            setCurrentStep(0);
        }
    }
  }, [isOpen, hasConnectedFacebook, hasSelectedTarget]);

  if (!isOpen) {
    return null;
  }

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-md text-center fade-in">
        <h2 className="text-2xl font-bold mb-2 text-gray-800 dark:text-white">{step.title}</h2>
        <p className="mb-6 text-gray-600 dark:text-gray-300">{step.content}</p>

        <div className="flex justify-center items-center mb-6">
            {steps.map((_, index) => (
                <div key={index} className={`w-2.5 h-2.5 rounded-full mx-1 transition-colors ${index === currentStep ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
            ))}
        </div>

        <div className="flex justify-between items-center">
            <Button variant="secondary" onClick={onComplete}>
                تخطي الجولة
            </Button>
            <div className="flex gap-2">
                {currentStep > 0 && (
                    <Button variant="secondary" onClick={handlePrev}>
                        السابق
                    </Button>
                )}
                <Button onClick={handleNext}>
                    {currentStep === steps.length - 1 ? 'إنهاء' : 'التالي'}
                </Button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingTour;
