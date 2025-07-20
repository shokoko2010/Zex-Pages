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
    const [fbAccessToken, setFbAccessToken] = useState<string | null>(null);
    const [favoriteTargetIds, setFavoriteTargetIds] = useState<Set<string>>(new Set());
    const [isAdmin, setIsAdmin] = useState<boolean>(false);
    const [isTourOpen, setIsTourOpen] = useState(false);
    const [userPlanId, setUserPlanId] = useState<string>('free');

    useEffect(() => {
        initializeApp(firebaseConfig);

        const auth = getAuth();
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                console.log('currentUser', currentUser);

                // Get user IP address

                // setIsLoading(true);
                // console.log('user.metadata.creationTime', user.metadata.creationTime);
                // console.log('user.metadata.lastSignInTime', user.metadata.lastSignInTime);

                // const lastSignInDiff =  new Date(user.metadata.lastSignInTime).getTime() - new Date(user.metadata.creationTime).getTime();

                // console.log('lastSignInDiff', lastSignInDiff)


                // if(lastSignInDiff === 0){
                //   setIsTourOpen(true);
                // }

                // Get User Data from firestore
                try {
                    // Check if the user has just signed up for the first time
                    // if (currentUser && currentUser.metadata.creationTime === currentUser.metadata.lastSignInTime) {


                    const facebookProvider = new FacebookAuthProvider();


                    facebookProvider.addScope('pages_show_list');
                    facebookProvider.addScope('instagram_basic');
                    facebookProvider.addScope('instagram_manage_insights');


                    // Check if the user has already linked their facebook account
                    if (currentUser.providerData.find(provider => provider.providerId === FacebookAuthProvider.PROVIDER_ID) === undefined) {
                        console.log('currentUser.providerData', currentUser.providerData);
                        signInWithPopup(auth, facebookProvider)
                            .then(async (result) => {
                                // The signed-in user info.
                                const credential = FacebookAuthProvider.credentialFromResult(result);
                                console.log('credential', credential);

                                if (credential) {
                                    // This gives you a Facebook Access Token. You can use it to access the Facebook API.
                                    const fbAccessToken = credential.accessToken;
                                    console.log('fbAccessToken', fbAccessToken);
                                    setFbAccessToken(fbAccessToken || null);

                                    // Link the Facebook account to the existing Firebase user
                                    try {
                                        await linkWithCredential(currentUser, credential);
                                        console.log('Facebook account linked!');
                                    } catch (linkError: any) {
                                        console.error('Error linking Facebook account:', linkError);
                                    }
                                }

                            })

                            .catch(async (error: any) => {
                                console.error('Facebook connect error:', error);
                                // Handle Errors here.

                                if (error.code === 'auth/account-exists-with-different-credential') {
                                    const email = error.email;
                                    const pendingCred = error.credential; // Get the credential directly from the error object

                                    if (email && pendingCred) {
                                        // Show UI to inform user about the conflict and get their original login method
                                        const shouldProceed = confirm(
                                            `يوجد حساب بالفعل مرتبط بهذا البريد الإلكتروني (${email}). ` +
                                            `هل تريد ربط حساب فيسبوك بحسابك الحالي؟ ` +
                                            `ستحتاج إلى إدخال كلمة المرور الأصلية.`
                                        );

                                        if (shouldProceed) {
                                            // Prompt the user to sign in with their original sign-in method
                                            const password = prompt('الرجاء إدخال كلمة المرور الأصلية:');

                                            if (password) {
                                                try {
                                                    // Sign in with email and password
                                                    await signInWithEmailAndPassword(auth, email, password);

                                                    // Get the current user
                                                    const user = auth.currentUser;

                                                    if (user) {
                                                        // Link the Facebook account to the existing Firebase user
                                                        try {
                                                            await linkWithCredential(user, pendingCred);
                                                            console.log('Facebook account linked!');
                                                        } catch (linkError: any) {
                                                            console.error('Error linking Facebook account:', linkError);
                                                        }
                                                    }

                                                } catch (e) {
                                                    alert('كلمة المرور غير صحيحة.');
                                                }
                                            }
                                        }


                                    }
                                } else if (error.code === 'auth/cancelled-popup-request') {
                                    console.log('Facebook connect error: User cancelled the Facebook connect');
                                    alert('تم إلغاء ربط فيسبوك');

                                } else {
                                  console.log('Facebook connect error: OTHER', error);
                                    alert('Facebook connect error: ' + error.message);
                                }
                            });
                    }


                }

                catch (e) {
                    console.log('e', e)
                }



                 }

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

                    console.log('New user created');

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
