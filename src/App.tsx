import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, useNavigate } from 'react-router-dom';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile, FacebookAuthProvider, signInWithPopup, linkWithCredential, unlink } from "firebase/auth";
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { db, storage, firebaseConfig } from './services/firebaseService';

import LoginPage from './components/LoginPage';
import HomePage from './components/HomePage';
import Header from './components/Header';
import PrivacyPolicyPage from './components/PrivacyPolicyPage';
import LandingHeader from './components/LandingHeader';
import Footer from './components/Footer';
import OnboardingTour from './components/OnboardingTour';
import AdminPage from './components/AdminPage';
import UserManagementPage from './components/UserManagementPage';
import AnalyticsPage from './components/AnalyticsPage';

import { AppUser, Plan, PerformanceSummaryData, PublishedPost, Role, AudienceGrowthData, HeatmapDataPoint, ContentTypePerformanceData } from './types';
import { getIpAddress } from './utils';



function App() {
    const [user, setUser] = useState<AppUser | null>(null);
    const [apiKey, setApiKey] = useState<string | null>(null);
    const [stabilityApiKey, setStabilityApiKey] = useState<string | null>(null);
    const [fbAccessToken, setFbAccessToken, ] = useState<string | null>(null);
    const [favoriteTargetIds, setFavoriteTargetIds] = useState<Set<string>>(new Set());
    const [isAdmin, setIsAdmin] = useState<boolean>(false);
    const [isTourOpen, setIsTourOpen] = useState(false);
    const [userPlanId, setUserPlanId] = useState<string>('free');
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const [plans, setPlans] = useState<Plan[]>([]);
    const [hasConnectedFacebook, setHasConnectedFacebook] = useState<boolean>(false);
    const [hasSelectedTarget, setHasSelectedTarget] = useState<boolean>(false);
    const [authError, setAuthError] = useState<string | null>(null);

    // Analytics Page Props
    const [analyticsPeriod, setAnalyticsPeriod] = useState<'7d' | '30d'>('7d');
    const [analyticsSummaryData, setAnalyticsSummaryData] = useState<PerformanceSummaryData | null>(null);
    const [analyticsAISummary, setAnalyticsAISummary] = useState<string>('');
    const [isGeneratingAnalyticsSummary, setIsGeneratingAnalyticsSummary] = useState<boolean>(false);
    const [analyticsPosts, setAnalyticsPosts] = useState<PublishedPost[]>([]);
    const [isAnalyticsLoading, setIsAnalyticsLoading] = useState<boolean>(false);
    const [analyticsAudienceGrowthData, setAnalyticsAudienceGrowthData] = useState<AudienceGrowthData[]>([]);
    const [analyticsHeatmapData, setAnalyticsHeatmapData] = useState<HeatmapDataPoint[]>([]);
    const [analyticsContentTypeData, setAnalyticsContentTypeData] = useState<ContentTypePerformanceData[]>([]);
    const [isGeneratingDeepAnalytics, setIsGeneratingDeepAnalytics] = useState<boolean>(false);

    const handleAnalyticsPeriodChange = (period: '7d' | '30d') => {
        setAnalyticsPeriod(period);
    };

    const handleFetchAnalytics = (postId: string) => {
        // Implement your fetch analytics logic here
        console.log('Fetch analytics clicked for post:', postId);
    };

    const handleGenerateInsights = (postId: string) => {
        // Implement your generate insights logic here
        console.log('Generate insights clicked for post:', postId);
    };

     const handleSignIn = async (email: string, password: string) => {
        try {
            const auth = getAuth();
            await signInWithEmailAndPassword(auth, email, password);
            setAuthError(null);
        } catch (error: any) {
            setAuthError(error.message);
        }
    };

    const handleSignUp = async (email: string, password: string) => {
        try {
            const auth = getAuth();
            await createUserWithEmailAndPassword(auth, email, password);
            setAuthError(null);
        } catch (error: any) {
            setAuthError(error.message);
        }
    };

    const handleLogout = () => {
        // Implement your logout logic here
        console.log('Logout clicked');
    };

    const handleToggleTheme = () => {
        setTheme(theme === 'light' ? 'dark' : 'light');
    };

    const handleOnboardingComplete = () => {
        setIsTourOpen(false);
    };

     const fetchPlans = async () => {
        try {
            const plansCollection = db.collection('plans');
            const plansSnapshot = await plansCollection.get();
            const plansList = plansSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Plan));
            setPlans(plansList);
        } catch (error) {
            console.error("Error fetching plans:", error);
            // Handle error appropriately
        }
    };

    useEffect(() => {
        initializeApp(firebaseConfig);
        fetchPlans();

        const auth = getAuth();
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {

                const initialAppUser: AppUser = {
                    uid: currentUser.uid,
                    email: currentUser.email!,
                    isAdmin: false,
                    planId: 'free',
                    createdAt: new Date().toISOString(),
                    name: currentUser.displayName || '',
                    photoURL: currentUser.photoURL || ''
                };

                 setUser(initialAppUser);
                 const userDocRef = db.collection('users').doc(currentUser.uid);
                 const userDoc = await userDocRef.get();
                 let userData;
                 if (userDoc.exists) {
                     userData = userDoc.data() as AppUser;
                     if (userData) {
                         setApiKey(userData.geminiApiKey || null);
                         setStabilityApiKey(userData.stabilityApiKey || null);
                         setFavoriteTargetIds(new Set(userData.favoriteTargetIds || []));
                         setFbAccessToken(userData.fbAccessToken || null);
                         setIsAdmin(userData.isAdmin || false);
                         setUserPlanId(userData.planId || 'free');
                         if (!userData.onboardingCompleted) {
                             setIsTourOpen(true);
                         }
                     }
                 } else {
                    const ip = await getIpAddress();
                    const newUserDoc: AppUser = {
                        email: currentUser.email!,
                        uid: currentUser.uid,
                        isAdmin: false,
                        planId: 'free',
                        createdAt: new Date().toISOString(),
                        onboardingCompleted: false,
                        lastLoginIp: ip,
                        name: currentUser.displayName || '',
                        photoURL: currentUser.photoURL || ''
                    };

                    await userDocRef.set(newUserDoc);


                    setIsTourOpen(true);




                 }

            } else {
                setUser(null);
                setIsAdmin(false);
            }
        });

        return () => unsubscribe();
    }, []);

    return (
        <Router>
            <Routes>
                <Route path="/privacy-policy" element={<div> <LandingHeader/> <PrivacyPolicyPage/> <Footer/> </div>} />
                <Route path="/admin" element={                     user?.isAdmin ? (
                        <div>
                            <Header
                                onLogout={handleLogout}
                                isSimulationMode={false} // Replace with your actual simulation mode logic
                                theme={theme}
                                onToggleTheme={handleToggleTheme}
                            />
                            <AdminPage/>
                        </div>
                    ) : (
                        <div className="flex justify-center items-center h-screen">
                            <div className="text-red-500 font-bold text-2xl">ليس لديك صلاحية الوصول إلى هذه الصفحة.</div>
                        </div>
                    )}
                 } />
                 <Route path="/users" element={                    user?.isAdmin ? (
                        <div>
                            <Header
                                onLogout={handleLogout}
                                isSimulationMode={false} // Replace with your actual simulation mode logic
                                theme={theme}
                                onToggleTheme={handleToggleTheme}
                            />
                            <UserManagementPage plans={plans} />
                        </div>
                    ) : (
                        <div className="flex justify-center items-center h-screen">
                            <div className="text-red-500 font-bold text-2xl">ليس لديك صلاحية الوصول إلى هذه الصفحة.</div>
                        </div>
                    )}
                 } />
                <Route path="/analytics" element={                  user?.isAdmin ? (
                    <div>
                      <Header
                          onLogout={handleLogout}
                          isSimulationMode={false} // Replace with your actual simulation mode logic
                          theme={theme}
                          onToggleTheme={handleToggleTheme}
                      />
                      <AnalyticsPage
                            period={analyticsPeriod}
                            onPeriodChange={handleAnalyticsPeriodChange}
                            summaryData={analyticsSummaryData}
                            aiSummary={analyticsAISummary}
                            isGeneratingSummary={isGeneratingAnalyticsSummary}
                            posts={analyticsPosts}
                            isLoading={isAnalyticsLoading}
                            onFetchAnalytics={handleFetchAnalytics}
                            onGenerateInsights={handleGenerateInsights}
                            role={'owner'} // Replace with your actual role logic
                            userPlan={plans[0] || null} // Replace with your actual user plan logic
                            audienceGrowthData={analyticsAudienceGrowthData}
                            heatmapData={analyticsHeatmapData}
                            contentTypeData={analyticsContentTypeData}
                            isGeneratingDeepAnalytics={isGeneratingDeepAnalytics}
                        />
                    </div>
                  ) : (
                    <div className="flex justify-center items-center h-screen">
                      <div className="text-red-500 font-bold text-2xl">ليس لديك صلاحية الوصول إلى هذه الصفحة.</div>
                    </div>
                  )}
                 } />
                <Route path="/" element={                   user ? (
                        <div>
                            <Header
                                onLogout={handleLogout}
                                isSimulationMode={false} // Replace with your actual simulation mode logic
                                theme={theme}
                                onToggleTheme={handleToggleTheme}
                            />
                            <HomePage 
                              apiKey={apiKey} 
                              stabilityApiKey={stabilityApiKey} 
                              favoriteTargetIds={favoriteTargetIds} 
                              fbAccessToken={fbAccessToken} 
                              setFbAccessToken={setFbAccessToken} 
                              userPlanId={userPlanId}
                              onSignIn={handleSignIn}
                              onSignUp={handleSignUp}
                              authError={authError}
                            />
                            <OnboardingTour
                                isOpen={isTourOpen}
                                onComplete={handleOnboardingComplete}
                                hasConnectedFacebook={hasConnectedFacebook}
                                hasSelectedTarget={hasSelectedTarget}
                            />
                        </div>
                    ) : (
                        <LoginPage setIsAdmin={setIsAdmin}/>
                    )}
                 } />
            </Routes>
        </Router>
    );
}

export default App;
