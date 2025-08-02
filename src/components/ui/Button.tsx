import React, { ButtonHTMLAttributes } from 'react';

const SIZES = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

const VARIANTS = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 focus-visible:outline-blue-600 disabled:bg-blue-400 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus-visible:outline-blue-500 dark:disabled:bg-blue-500',
  secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus-visible:outline-gray-300 disabled:bg-gray-100 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 dark:focus-visible:outline-gray-500 dark:disabled:bg-gray-600',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-600 disabled:bg-red-400 dark:bg-red-600 dark:hover:bg-red-700 dark:focus-visible:outline-red-500 dark:disabled:bg-red-500',
  destructive: 'bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-600 disabled:bg-red-400 dark:bg-red-600 dark:hover:bg-red-700 dark:focus-visible:outline-red-500 dark:disabled:bg-red-500',
  outline: 'bg-transparent border border-gray-300 text-gray-700 hover:bg-gray-50 focus-visible:outline-gray-300 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800 dark:focus-visible:outline-gray-500',
  ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus-visible:outline-gray-300 disabled:opacity-50 dark:text-gray-300 dark:hover:bg-gray-800 dark:focus-visible:outline-gray-500',
  link: 'bg-transparent text-blue-600 hover:text-blue-700 focus-visible:outline-blue-600 disabled:opacity-50 dark:text-blue-400 dark:hover:text-blue-300 dark:focus-visible:outline-blue-500',
};

const LOADING_SIZES = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  children,
  className = '',
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  ...props
}) => {
  const loadingSize = LOADING_SIZES[size];
  
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-70 hover:scale-[1.02] active:scale-[0.98] ${SIZES[size]} ${VARIANTS[variant]} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && (
        <svg className={`animate-spin -ml-1 mr-2 ${loadingSize}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
      {children}
      {!isLoading && rightIcon && <span className="ml-2">{rightIcon}</span>}
    </button>
  );
};

export default Button;
