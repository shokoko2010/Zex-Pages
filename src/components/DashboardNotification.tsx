import React, { useEffect, useState } from 'react';
import CheckCircleIcon from './icons/CheckCircleIcon';
import XCircleIcon from './icons/XCircleIcon';
import InformationCircleIcon from './icons/InformationCircleIcon';
import XMarkIcon from './icons/XMarkIcon';

interface DashboardNotificationProps {
    notification: {
        type: 'success' | 'error' | 'partial';
        message: string;
    } | null;
}

const DashboardNotification: React.FC<DashboardNotificationProps> = ({ notification }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        if (notification) {
            setIsVisible(true);
            setIsExiting(false);
            
            const timer = setTimeout(() => {
                setIsExiting(true);
                setTimeout(() => {
                    setIsVisible(false);
                }, 300);
            }, 5000);

            return () => clearTimeout(timer);
        }
    }, [notification]);

    if (!notification || !isVisible) return null;

    const getNotificationConfig = (type: string) => {
        switch (type) {
            case 'success':
                return {
                    bgColor: 'bg-green-500',
                    icon: <CheckCircleIcon className="w-5 h-5" />,
                    borderColor: 'border-green-600',
                    textColor: 'text-green-100'
                };
            case 'error':
                return {
                    bgColor: 'bg-red-500',
                    icon: <XCircleIcon className="w-5 h-5" />,
                    borderColor: 'border-red-600',
                    textColor: 'text-red-100'
                };
            case 'partial':
                return {
                    bgColor: 'bg-blue-500',
                    icon: <InformationCircleIcon className="w-5 h-5" />,
                    borderColor: 'border-blue-600',
                    textColor: 'text-blue-100'
                };
            default:
                return {
                    bgColor: 'bg-gray-500',
                    icon: <InformationCircleIcon className="w-5 h-5" />,
                    borderColor: 'border-gray-600',
                    textColor: 'text-gray-100'
                };
        }
    };

    const config = getNotificationConfig(notification.type);

    return (
        <div 
            className={`fixed bottom-4 right-4 z-50 transform transition-all duration-300 ease-out ${
                isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'
            }`}
        >
            <div 
                className={`${config.bgColor} ${config.textColor} px-4 py-3 rounded-lg shadow-lg border ${config.borderColor} min-w-[300px] max-w-md animate-slide-up`}
            >
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                        {config.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                            {notification.message}
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            setIsExiting(true);
                            setTimeout(() => setIsVisible(false), 300);
                        }}
                        className="flex-shrink-0 ml-2 hover:bg-black hover:bg-opacity-10 rounded p-1 transition-colors"
                    >
                        <XMarkIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DashboardNotification;