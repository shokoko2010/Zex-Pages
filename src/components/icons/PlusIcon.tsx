import React from 'react';

const PlusIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
    );
};

export default PlusIcon;