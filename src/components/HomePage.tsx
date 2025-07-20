import React from 'react';
import LandingHeader from './LandingHeader';
import Footer from './Footer';

interface HomePageProps {
  apiKey: string | null;
  stabilityApiKey: string | null;
  favoriteTargetIds: Set<string>;
  fbAccessToken: string | null;
  setFbAccessToken: React.Dispatch<React.SetStateAction<string | null>>;
  userPlanId: string;
}

const HomePage: React.FC<HomePageProps> = ({ apiKey, stabilityApiKey, favoriteTargetIds, fbAccessToken, setFbAccessToken, userPlanId }) => {
  return (
    <div className="bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 min-h-screen flex flex-col">
      <LandingHeader />
      
      <main className="flex-grow flex items-center justify-center p-4">
      </main>

      <Footer />
    </div>
  );
};

export default HomePage;