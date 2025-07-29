import React, { useState, useCallback, useEffect } from 'react';
import PageSelectorPage from './components/PageSelectorPage';
import DashboardPage from './components/DashboardPage';
import HomePage from './components/HomePage';
import SettingsModal from './components/SettingsModal';
import PrivacyPolicyPage from './components/PrivacyPolicyPage';
import OnboardingTour from './components/OnboardingTour';
import AdminPage from './components/AdminPage';

import { GoogleGenAI } from '@google/genai';
import { initializeGoogleGenAI } from './services/geminiService';
import { Target, Business, Plan, AppUser, StrategyHistoryItem, ContentPlanItem, StrategyRequest } from './types';
import { auth, db, User, saveContentPlan, getStrategyHistory, deleteStrategy, exchangeAndStoreLongLivedToken } from './services/firebaseService';
import firebase from 'firebase/compat/app';

const isSimulation = window.location.protocol === 'http:';

class FacebookTokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FacebookTokenError';
  }
}


const MOCK_TARGETS: Target[] = [
    { id: '1', name: 'صفحة تجريبية 1', type: 'facebook', access_token: 'DUMMY_TOKEN_1', picture: { data: { url: 'https://via.placeholder.com/150/4B79A1/FFFFFF?text=Page1' } } },
    { id: 'ig1', name: 'Zex Pages IG (@zex_pages_ig)', type: 'instagram', parentPageId: '1', access_token: 'DUMMY_TOKEN_1', picture: { data: { url: 'https://via.placeholder.com/150/E4405F/FFFFFF?text=IG' } } }
];

const MOCK_BUSINESSES: Business[] = [
    { id: 'b1', name: 'الوكالة الرقمية الإبداعية', pictureUrl: 'https://via.placeholder.com/150' },
    { id: 'b2', name: 'مجموعة مطاعم النكهة الأصيلة', pictureUrl: 'https://via.placeholder.com/150' },
];

const getIpAddress = async (): Promise<string> => {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        if (!response.ok) return 'unknown';
        const data = await response.json();
        return data.ip || 'unknown';
    } catch (error) {
        console.error("Could not fetch IP address:", error);
        return 'unknown';
    }
};


const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  
  const [plans, setPlans] = useState<Plan[]>([]);
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);

  const [apiKey, setApiKey] = useState<string | null>(null);
  const [stabilityApiKey, setStabilityApiKey] = useState<string | null>(null);
  const [aiClient, setAiClient] = useState<GoogleGenAI | null>(null);
  
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const savedTheme = localStorage.getItem('theme');
    return (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) ? 'dark' : 'light';
  });

  const [targets, setTargets] = useState<Target[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [targetsLoading, setTargetsLoading] = useState(true);
  const [targetsError, setTargetsError] = useState<string | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<Target | null>(null);
  const [favoriteTargetIds, setFavoriteTargetIds] = useState<Set<string>>(new Set());
  
  const [loadingBusinessId, setLoadingBusinessId] = useState<string | null>(null);
  const [loadedBusinessIds, setLoadedBusinessIds] = useState<Set<string>>(new Set());
  const [strategyHistory, setStrategyHistory] = useState<StrategyHistoryItem[]>([]);


  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);
  
  useEffect(() => {
    const handlePopState = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  
  const handleFacebookTokenError = useCallback(async () => {
    alert("انتهت صلاحية جلسة فيسبوك أو أصبحت غير صالحة. يرجى إعادة ربط الحساب.");
    if (user) {
        await db.collection('users').doc(user.uid).set({ fbAccessToken: null, targets: [] }, { merge: true });
        setAppUser(prev => prev ? { ...prev, fbAccessToken: undefined, targets: [] } : null);
        setTargets([]);
    }
  }, [user]);

  const fetchWithPagination = useCallback(async (initialPath: string, accessToken?: string): Promise<any[]> => {
      let allData: any[] = [];
      let path: string | null = initialPath;
      const tokenToUse = accessToken || appUser?.fbAccessToken;
      if (!tokenToUse) throw new Error("Facebook Access Token is missing.");

      path = path.includes('?') ? `${path}&access_token=${tokenToUse}` : `${path}?access_token=${tokenToUse}`;

      let counter = 0;
      while (path && counter < 50) {
          const response: any = await new Promise(resolve => window.FB.api(path, (res: any) => resolve(res)));
          if (response?.data) {
              if (response.data.length > 0) allData = allData.concat(response.data);
              path = response.paging?.next ? response.paging.next.replace('https://graph.facebook.com', '') : null;
          } else {
              if (response?.error) {
                if (response.error.code === 190) { 
                  throw new FacebookTokenError(response.error.message);
                }
                throw new Error(`خطأ في واجهة فيسبوك: ${response.error.message}`);
              }
              path = null;
          }
          counter++;
      }
      return allData;
  }, [appUser?.fbAccessToken]);

  const fetchInstagramAccounts = useCallback(async (pages: Target[]): Promise<Target[]> => {
    if (pages.length === 0 || !appUser?.fbAccessToken) return [];
    const batchRequest = pages.map(page => ({ method: 'GET', relative_url: `${page.id}?fields=instagram_business_account{id,name,username,profile_picture_url}` }));
    
    return new Promise(resolve => {
        window.FB.api('/', 'POST', { batch: JSON.stringify(batchRequest), access_token: appUser.fbAccessToken }, (response: any) => {
            const igAccounts: Target[] = [];
            if (response && !response.error) {
                response.forEach((res: any, index: number) => {
                    if (res.code === 200) {
                        const body = JSON.parse(res.body);
                        if (body?.instagram_business_account) {
                            const igAccount = body.instagram_business_account;
                            igAccounts.push({
                                id: igAccount.id, name: igAccount.name ? `${igAccount.name} (@${igAccount.username})` : `@${igAccount.username}`,
                                type: 'instagram', parentPageId: pages[index].id, access_token: pages[index].access_token,
                                picture: { data: { url: igAccount.profile_picture_url || 'https://via.placeholder.com/150/833AB4/FFFFFF?text=IG' } }
                            });
                        }
                    }
                });
            }
            resolve(igAccounts);
        });
    });
  }, [appUser?.fbAccessToken]);

  const fetchFacebookData = useCallback(async () => {
    if (!user || isSimulation || !appUser?.fbAccessToken) {
        setTargetsLoading(false);
        return;
    }
    
    setTargetsLoading(true);
    setTargetsError(null);
    try {
        const allPagesData = await fetchWithPagination('/me/accounts?fields=id,name,access_token,picture{url}&limit=100');
        const allTargetsMap = new Map<string, Target>();
        allPagesData.forEach(p => allTargetsMap.set(p.id, { ...p, type: 'facebook' }));
        
        const igAccounts = await fetchInstagramAccounts(Array.from(allTargetsMap.values()));
        igAccounts.forEach(ig => allTargetsMap.set(ig.id, ig));
        
        const finalTargets = Array.from(allTargetsMap.values());
        setTargets(finalTargets);
        
        await db.collection('users').doc(user.uid).set({ targets: finalTargets }, { merge: true });
    } catch (error: any) {
        if (error instanceof FacebookTokenError) {
            handleFacebookTokenError();
        } else {
            setTargetsError(`فشل تحميل بياناتك من فيسبوك. الخطأ: ${error.message}`);
        }
    } finally {
        setTargetsLoading(false);
    }
  }, [user, appUser?.fbAccessToken, isSimulation, fetchWithPagination, fetchInstagramAccounts, handleFacebookTokenError]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
        setLoadingUser(true);
        if (currentUser) {
            setUser(currentUser);
            const userDocRef = db.collection('users').doc(currentUser.uid);
            const userDoc = await userDocRef.get();
            
            if (userDoc.exists) {
                setAppUser(userDoc.data() as AppUser);
            } else {
               const newUser: AppUser = {
                   email: currentUser.email!, uid: currentUser.uid, isAdmin: false,
                   planId: 'free', createdAt: Date.now(), lastLoginIp: await getIpAddress(),
                   currentPlan: 'free', displayName: '', photoURL: ''
               };
               await userDocRef.set(newUser, { merge: true });
               setAppUser(newUser);
               setIsTourOpen(true);
            }

            try {
                const plansSnapshot = await db.collection('plans').get();
                setPlans(plansSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Plan)));
            } catch (error) { console.error("Failed to fetch plans:", error); }

        } else {
            setUser(null); setAppUser(null); setApiKey(null);
            setStabilityApiKey(null); setTargets([]); setBusinesses([]);
            setSelectedTarget(null); setFavoriteTargetIds(new Set());
            setAllUsers([]); setIsTourOpen(false); setPlans([]);
            setAuthError(null);
        }
        setLoadingUser(false);
    });
    return () => unsubscribe();
  }, []);
  
  useEffect(() => {
    if (appUser) {
        setApiKey(appUser.geminiApiKey || null);
        setStabilityApiKey(appUser.stabilityApiKey || null);
        setFavoriteTargetIds(new Set(appUser.favoriteTargetIds || []));
        if (!appUser.onboardingCompleted) setIsTourOpen(true);
        
        if (appUser.isAdmin) {
            db.collection('users').get()
                .then(snapshot => setAllUsers(snapshot.docs.map(doc => doc.data() as AppUser)))
                .catch(err => console.error("Failed to fetch all users:", err));
        }
        
        if (appUser.fbAccessToken) {
            fetchFacebookData();
        } else {
            setTargets(appUser.targets || []);
            setTargetsLoading(false);
        }
    }
  }, [appUser, fetchFacebookData]);


  useEffect(() => {
    const loadHistory = async () => {
        if (user && selectedTarget) {
            const history = await getStrategyHistory(user.uid, selectedTarget.id);
            setStrategyHistory(history as StrategyHistoryItem[]);
        } else {
            setStrategyHistory([]);
        }
    };
    loadHistory();
  }, [selectedTarget, user]);

  const handleSaveContentPlan = async (pageId: string, plan: ContentPlanItem[], request: StrategyRequest) => {
    if (!user) return;
    try {
        await saveContentPlan(user.uid, pageId, plan, request);
        const history = await getStrategyHistory(user.uid, pageId);
        setStrategyHistory(history as StrategyHistoryItem[]);
    } catch (error) {
        console.error("Error saving plan in App.tsx", error);
    }
  };

  const handleDeleteStrategy = async (pageId: string, strategyId: string) => {
      if (!user) return;
      try {
          await deleteStrategy(user.uid, pageId, strategyId);
          setStrategyHistory(prev => prev.filter(s => s.id !== strategyId));
      } catch (error) {
          console.error("Error deleting strategy in App.tsx", error);
      }
  };

  const handleCompleteTour = async () => {
      setIsTourOpen(false);
      if (user) await db.collection('users').doc(user.uid).set({ onboardingCompleted: true }, { merge: true });
  };

  const handleToggleFavorite = async (targetId: string) => {
    if (!user) return;
    const newFavorites = new Set(favoriteTargetIds);
    newFavorites.has(targetId) ? newFavorites.delete(targetId) : newFavorites.add(targetId);
    setFavoriteTargetIds(newFavorites);
    await db.collection('users').doc(user.uid).set({ favoriteTargetIds: Array.from(newFavorites) }, { merge: true });
  };

  const handleToggleTheme = useCallback(() => setTheme(prev => prev === 'light' ? 'dark' : 'light'), []);

  useEffect(() => {
    setAiClient(apiKey ? initializeGoogleGenAI(apiKey) : null);
  }, [apiKey]);

  const handleSaveKeys = useCallback(async (keys: { gemini: string; stability: string; }) => {
    if (!user) return;
    setApiKey(keys.gemini);
    setStabilityApiKey(keys.stability);
    await db.collection('users').doc(user.uid).set({
      geminiApiKey: keys.gemini,
      stabilityApiKey: keys.stability
    }, { merge: true });
  }, [user]);
  
  const handleLoadPagesFromBusiness = useCallback(async (businessId: string) => {
    setLoadingBusinessId(businessId);
    try {
      const ownedPages = await fetchWithPagination(`/${businessId}/owned_pages?fields=id,name,access_token,picture{url}&limit=100`);
      const igAccounts = await fetchInstagramAccounts(ownedPages);
      const newTargetsMap = new Map<string, Target>();
      ownedPages.forEach(p => newTargetsMap.set(p.id, { ...p, type: 'facebook' }));
      igAccounts.forEach(ig => newTargetsMap.set(ig.id, ig));
      
      setTargets(prevTargets => {
        const existingTargetsMap = new Map(prevTargets.map(t => [t.id, t]));
        newTargetsMap.forEach((value, key) => existingTargetsMap.set(key, value));
        return Array.from(existingTargetsMap.values());
      });
      setLoadedBusinessIds(prev => new Set(prev).add(businessId));
    } catch(error: any) {
        if (error instanceof FacebookTokenError) {
            handleFacebookTokenError();
        } else {
            alert(`فشل تحميل الصفحات: ${error.message}`);
        }
    } finally {
      setLoadingBusinessId(null);
    }
  }, [fetchWithPagination, fetchInstagramAccounts, handleFacebookTokenError]);

  const handleEmailSignUp = useCallback(async (email: string, password: string) => {
    setAuthError(null);
    try {
        await auth.createUserWithEmailAndPassword(email, password);
    } catch (error: any) {
        setAuthError(error.code === 'auth/email-already-in-use' ? 'هذا البريد الإلكتروني مسجل بالفعل.' : 'حدث خطأ أثناء إنشاء الحساب.');
    }
  }, []);

  const handleEmailSignIn = useCallback(async (email: string, password: string) => {
    setAuthError(null);
    try {
        const cred = await auth.signInWithEmailAndPassword(email, password);
        if(cred.user) await db.collection('users').doc(cred.user.uid).set({ lastLoginIp: await getIpAddress() }, { merge: true });
    } catch (error: any) {
        setAuthError('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
    }
  }, []);
  
  const handleFacebookConnect = useCallback(async (isReauth = false) => {
    if (!user) return;
    const facebookProvider = new firebase.auth.FacebookAuthProvider();
    facebookProvider.addScope('email,public_profile,business_management,pages_show_list,read_insights,pages_manage_posts,pages_read_engagement,pages_manage_engagement,pages_messaging,instagram_basic,instagram_manage_comments,instagram_manage_messages,ads_management,ads_read');
    
    if (isReauth) {
        facebookProvider.setCustomParameters({ auth_type: 'reauthenticate' });
    }

    try {
        const result = isReauth 
            ? await auth.currentUser?.reauthenticateWithPopup(facebookProvider)
            : await auth.currentUser?.linkWithPopup(facebookProvider);
            
        const credential = result?.credential as firebase.auth.OAuthCredential;
        if (credential?.accessToken) {
          await exchangeAndStoreLongLivedToken(user.uid, credential.accessToken);
          alert("تم ربط حساب فيسبوك بنجاح! جاري جلب صفحاتك...");
          const userDoc = await db.collection('users').doc(user.uid).get();
          setAppUser(userDoc.data() as AppUser);
        }
    } catch (error: any) {
        if (error.code === 'auth/credential-already-in-use') {
            alert("هذا الحساب الفيسبوك مرتبط بالفعل بحساب آخر. سنحاول تسجيل دخولك باستخدامه.");
            const credential = error.credential;
            try {
                const result = await auth.signInWithCredential(credential);
                // After sign-in, the onAuthStateChanged listener will handle fetching the correct user data.
                if (result.user) {
                     alert("تم تسجيل الدخول بنجاح. سيتم تحديث الصفحة.");
                }
            } catch (signInError: any) {
                 alert(`فشل تسجيل الدخول باستخدام حساب فيسبوك. السبب: ${signInError.message}`);
            }
        } else {
            alert(`فشل الاتصال بفيسبوك. السبب: ${error.message}`);
        }
    }
  }, [user]);

  const handleLogout = useCallback(async () => { await auth.signOut(); }, []);

  const renderContent = () => {
      if (currentPath.startsWith('/privacy-policy')) return <PrivacyPolicyPage />;
      if (loadingUser) return <div className="flex items-center justify-center min-h-screen">جاري التحميل...</div>;
      
      if (!user || !appUser) return <HomePage onSignIn={handleEmailSignIn} onSignUp={handleEmailSignUp} authError={authError} />;
      
      let userPlan = plans.find(p => p.id === appUser.planId) || plans.find(p => p.id === 'free') || null;

      if (appUser.isAdmin) {
          userPlan = {
            id: 'admin', name: 'Admin Plan', priceMonthly: 0, priceAnnual: 0,
            description: "Admin", features: ['All features for admin'],
            limits: {
              maxPages: -1, maxTeamMembers: -1, aiFeatures: true,
              maxScheduledPostsPerMonth: -1, imageGenerationQuota: -1, pages: -1, 
              aiText: true, aiImage: true, scheduledPosts: -1, drafts: -1, 
              bulkScheduling: true, contentPlanner: true, deepAnalytics: true,
              autoResponder: true, contentApprovalWorkflow: false, 
            },
            adminOnly: true, price: 0, pricePeriod: 'monthly',
          } as Plan; 
      }

      if (selectedTarget) {
        return (
          <DashboardPage
            user={user}
            isAdmin={appUser.isAdmin || false}
            userPlan={userPlan}
            allUsers={allUsers}
            managedTarget={selectedTarget}
            allTargets={targets}
            onChangePage={() => setSelectedTarget(null)}
            onLogout={handleLogout}
            isSimulationMode={isSimulation}
            aiClient={aiClient}
            stabilityApiKey={stabilityApiKey}
            onSettingsClick={() => setIsSettingsModalOpen(true)}
            fetchWithPagination={fetchWithPagination}
            theme={theme}
            onToggleTheme={handleToggleTheme}
            fbAccessToken={appUser.fbAccessToken || null} 
            strategyHistory={strategyHistory}
            onSavePlan={handleSaveContentPlan}
            onDeleteStrategy={handleDeleteStrategy}
            onTokenError={handleFacebookTokenError}
          />
        );
      }
      
      if (appUser.isAdmin) {
          return <AdminPage appUser={appUser} allUsers={allUsers} onLogout={handleLogout} onSettingsClick={() => setIsSettingsModalOpen(true)} theme={theme} onToggleTheme={handleToggleTheme} plans={plans} onSelectTarget={setSelectedTarget} />;
      }

      return (
        <PageSelectorPage
          targets={targets}
          businesses={businesses}
          onLoadPagesFromBusiness={handleLoadPagesFromBusiness}
          loadingBusinessId={loadingBusinessId}
          loadedBusinessIds={loadedBusinessIds}
          isLoading={targetsLoading}
          error={targetsError}
          onSelectTarget={setSelectedTarget}
          onLogout={handleLogout}
          onSettingsClick={() => setIsSettingsModalOpen(true)}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          favoriteTargetIds={favoriteTargetIds}
          onToggleFavorite={handleToggleFavorite}
          isFacebookConnected={!!appUser.fbAccessToken}
          onConnectFacebook={handleFacebookConnect}
          onRefreshPages={fetchFacebookData}
          userPlan={userPlan}
        />
      );
  };
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <OnboardingTour isOpen={isTourOpen} onComplete={handleCompleteTour} hasConnectedFacebook={!!appUser?.fbAccessToken} hasSelectedTarget={!!selectedTarget} />
      <SettingsModal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} onSave={handleSaveKeys} currentApiKey={apiKey} currentStabilityApiKey={stabilityApiKey} />
      {renderContent()}
    </div>
  );
};

export default App;

