import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Switch, useHistory } from 'react-router-dom';
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

import { AppUser } from './types';
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

    useEffect(() => {
        initializeApp(firebaseConfig);

        const auth = getAuth();
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {


                 setUser(currentUser);
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
                        photoURL: currentUser.photoURL || '',
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
            <Switch>
                <Route exact path="/privacy-policy">
                    <LandingHeader/>
                    <PrivacyPolicyPage/>
                    <Footer/>
                </Route>
                <Route exact path="/admin">
                    {user?.isAdmin ? (
                        <>
                            <Header user={user}/>
                            <AdminPage/>
                        </>
                    ) : (
                        <div className="flex justify-center items-center h-screen">
                            <div className="text-red-500 font-bold text-2xl">ليس لديك صلاحية الوصول إلى هذه الصفحة.</div>
                        </div>
                    )}
                </Route>
                 <Route exact path="/users">
                    {user?.isAdmin ? (
                        <>
                            <Header user={user}/>
                            <UserManagementPage/>
                        </>
                    ) : (
                        <div className="flex justify-center items-center h-screen">
                            <div className="text-red-500 font-bold text-2xl">ليس لديك صلاحية الوصول إلى هذه الصفحة.</div>
                        </div>
                    )}
                </Route>
                <Route exact path="/analytics">
                  {user?.isAdmin ? (
                    <>
                      <Header user={user} />
                      <AnalyticsPage />
                    </>
                  ) : (
                    <div className="flex justify-center items-center h-screen">
                      <div className="text-red-500 font-bold text-2xl">ليس لديك صلاحية الوصول إلى هذه الصفحة.</div>
                    </div>
                  )}
                </Route>
                <Route path="/">
                    {user ? (
                        <>
                            <Header user={user} />
                            <HomePage apiKey={apiKey} stabilityApiKey={stabilityApiKey} favoriteTargetIds={favoriteTargetIds} fbAccessToken={fbAccessToken} setFbAccessToken={setFbAccessToken} userPlanId={userPlanId}/>
                            <OnboardingTour isTourOpen={isTourOpen} setIsTourOpen={setIsTourOpen}/>
                        </>
                    ) : (
                        <LoginPage setIsAdmin={setIsAdmin}/>
                    )}
                </Route>
            </Switch>
        </Router>
    );
}

export default App;
