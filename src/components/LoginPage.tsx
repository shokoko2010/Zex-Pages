import React, { useState } from 'react';
import Button from './ui/Button';
import FacebookIcon from './icons/FacebookIcon';

interface LoginPageProps {
  setIsAdmin: React.Dispatch<React.SetStateAction<boolean>>;
}

const LoginPage: React.FC<LoginPageProps> = ({ setIsAdmin }) => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!email || !password) {
      setFormError('يرجى ملء حقلي البريد الإلكتروني وكلمة المرور.');
      return;
    }
    if (!isLoginView && password !== confirmPassword) {
      setFormError('كلمتا المرور غير متطابقتين.');
      return;
    }

    setLoading(true);
    setLoading(false);
  };

  return (
    <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
      <div>
        <h2 className="text-3xl font-extrabold text-center text-gray-900 dark:text-white">
          {isLoginView ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
        </h2>
        <p className="mt-2 text-sm text-center text-gray-600 dark:text-gray-400">
          {isLoginView ? 'ليس لديك حساب؟' : 'لديك حساب بالفعل؟'}{' '}
          <button
            onClick={() => {
                setIsLoginView(!isLoginView);
                setFormError(null);
            }}
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            {isLoginView ? 'إنشاء حساب' : 'تسجيل الدخول'}
          </button>
        </p>
      </div>
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="rounded-md shadow-sm -space-y-px">
          <div>
            <label htmlFor="email-address" className="sr-only">
              البريد الإلكتروني
            </label>
            <input
              id="email-address"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              placeholder="البريد الإلكتروني"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="password" className="sr-only">
              كلمة المرور
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={isLoginView ? "current-password" : "new-password"}
              required
              className={`relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 ${isLoginView ? 'rounded-b-md' : ''} focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
              placeholder="كلمة المرور"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
           {!isLoginView && (
            <div>
              <label htmlFor="confirm-password" className="sr-only">
                تأكيد كلمة المرور
              </label>
              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                className="relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="تأكيد كلمة المرور"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
           )}
        </div>
        
        {(formError || authError) && (
            <p className="text-sm text-red-600 text-center">{formError || authError}</p>
        )}

        <div>
          <Button
            type="submit"
            className="w-full"
            isLoading={loading}
            disabled={loading}
          >
            {isLoginView ? 'تسجيل الدخول' : 'إنشاء حساب'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default LoginPage;
