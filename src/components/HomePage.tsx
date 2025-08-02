

import React from 'react';
import LandingHeader from './LandingHeader';
import Footer from './Footer';
import LoginPage from './LoginPage';

interface HomePageProps {
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<void>;
  authError: string | null;
}

const HomePage: React.FC<HomePageProps> = ({ onSignIn, onSignUp, authError }) => {
  return (
    <div className="bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 min-h-screen flex flex-col">
      <LandingHeader />
      
      <main className="flex-grow flex items-center justify-center p-4">
        <LoginPage onSignIn={onSignIn} onSignUp={onSignUp} authError={authError} />
      </main>

      <Footer />
    </div>
  );
};

export default HomePage;