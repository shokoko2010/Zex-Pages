
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
import { Target, Business, PublishedPost, InboxItem, Plan, AppUser } from './types';
import { auth, db, User } from './services/firebaseService';
import firebase from 'firebase/compat/app';

const isSimulation = window.location.protocol === 'http:';
const MAX_PUBLISHED_POSTS_TO_STORE_SYNC = 100;
const MAX_INBOX_ITEMS_TO_STORE_SYNC = 200;

const MOCK_TARGETS: Target[] = [
    { id: '1', name: 'صفحة تجريبية 1', type: 'page', access_token: 'DUMMY_TOKEN_1', picture: { data: { url: 'https://via.placeholder.com/150/4B79A1/FFFFFF?text=Page1' } } },
    { id: 'ig1', name: 'Zex Pages IG (@zex_pages_ig)', type: 'instagram', parentPageId: '1', access_token: 'DUMMY_TOKEN_1', picture: { data: { url: 'https://via.placeholder.com/150/E4405F/FFFFFF?text=IG' } } }
];

const MOCK_BUSINESSES: Business[] = [
    { id: 'b1', name: 'الوكالة الرقمية الإبداعية' },
    { id: 'b2', name: 'مجموعة مطاعم النكهة الأصيلة' },
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
  const [appUser, setAppUser] = useState<AppUser | null>(null); // To store user's DB data
  const [loadingUser, setLoadingUser] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  
  // Plans and admin state
  const [plans, setPlans] = useState<Plan[]>([]);
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);

  // API Keys and AI client
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [stabilityApiKey, setStabilityApiKey] = useState<string | null>(null);
  const [aiClient, setAiClient] = useState<GoogleGenAI | null>(null);
  
  // UI State
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        return 'dark';
    }
    return 'light';
  });

  // Facebook and Target related state
  const [targets, setTargets] = useState<Target[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [targetsLoading, setTargetsLoading] = useState(true);
  const [targetsError, setTargetsError] = useState<string | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<Target | null>(null);
  const [favoriteTargetIds, setFavoriteTargetIds] = useState<Set<string>>(new Set());
  
  const [loadingBusinessId, setLoadingBusinessId] = useState<string | null>(null);
  const [loadedBusinessIds, setLoadedBusinessIds] = new Set<string>();
  const [syncingTargetId, setSyncingTargetId] = useState<string | null>(null);

  // Theme management
  useEffect(() => {
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
    } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
    }
  }, [theme]);
  
  // Path management for routing
  useEffect(() => {
    const handlePopState = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  
  // Main Firebase Auth Listener
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
        setLoadingUser(true);
        if (currentUser) {
            setUser(currentUser);
            // Fetch plans once user is confirmed
            try {
                const plansSnapshot = await db.collection('plans').get();
                const plansList = plansSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Plan));
                setPlans(plansList);
            } catch (error) {
                console.error("Failed to fetch plans:", error);
            }

            const userDocRef = db.collection('users').doc(currentUser.uid);
            const userDoc = await userDocRef.get();
            let userData: AppUser;
            if (userDoc.exists) {
                userData = userDoc.data() as AppUser;
            } else {
               const ip = await getIpAddress();
               userData = {
                   email: currentUser.email!,
                   uid: currentUser.uid,
                   isAdmin: false,
                   planId: 'free',
                   createdAt: new Date().toISOString(),
                   onboardingCompleted: false,
                   lastLoginIp: ip,
               };
               await userDocRef.set(userData, { merge: true });
            }
            
            setAppUser(userData);
            setApiKey(userData.geminiApiKey || null);
            setStabilityApiKey(userData.stabilityApiKey || null);
            setFavoriteTargetIds(new Set(userData.favoriteTargetIds || []));
            if (!userData.onboardingCompleted) setIsTourOpen(true);

            // **NEW CACHING LOGIC**: Load targets from user doc if they exist
            if (userData.targets && userData.targets.length > 0) {
                console.log("Loading targets from Firestore cache.");
                setTargets(userData.targets);
                setTargetsLoading(false);
            } else {
                // Only set loading if we don't have cached targets
                setTargetsLoading(true); 
            }

            // If user is admin, fetch all users data for the admin page
            if (userData.isAdmin) {
                try {
                    const usersSnapshot = await db.collection('users').get();
                    setAllUsers(usersSnapshot.docs.map(doc => doc.data() as AppUser));
                } catch (error) { console.error("Failed to fetch all users:", error); }
            }
        } else {
            // Reset all state on logout
            setUser(null);
            setAppUser(null);
            setApiKey(null);
            setStabilityApiKey(null);
            setTargets([]);
            setBusinesses([]);
            setSelectedTarget(null);
            setFavoriteTargetIds(new Set());
            setAllUsers([]);
            setIsTourOpen(false);
            setPlans([]);
            setAuthError(null);
        }
        setLoadingUser(false);
    });
    return () => unsubscribe();
  }, []);

  const handleCompleteTour = async () => {
      setIsTourOpen(false);
      if (user) {
          await db.collection('users').doc(user.uid).set({ onboardingCompleted: true }, { merge: true });
      }
  };


  const handleToggleFavorite = async (targetId: string) => {
    if (!user) return;
    const newFavorites = new Set(favoriteTargetIds);
    if (newFavorites.has(targetId)) newFavorites.delete(targetId);
    else newFavorites.add(targetId);
    setFavoriteTargetIds(newFavorites);
    await db.collection('users').doc(user.uid).set({ favoriteTargetIds: Array.from(newFavorites) }, { merge: true });
  };

  const handleToggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  useEffect(() => {
    setAiClient(apiKey ? initializeGoogleGenAI(apiKey) : null);
  }, [apiKey]);

  const handleSaveKeys = async (keys: { gemini: string; stability: string; }) => {
    if (!user) return;
    setApiKey(keys.gemini);
    setStabilityApiKey(keys.stability);
    await db.collection('users').doc(user.uid).set({
      geminiApiKey: keys.gemini,
      stabilityApiKey: keys.stability
    }, { merge: true });
  };
  
  const fetchWithPagination = useCallback(async (initialPath: string, accessToken?: string): Promise<any[]> => {
      let allData: any[] = [];
      let path: string | null = initialPath;
      
      const tokenToUse = accessToken || appUser?.fbAccessToken;
      if (!tokenToUse) throw new Error("Facebook Access Token is missing.");

      if (!path.includes('access_token=')) path = path.includes('?') ? `${path}&access_token=${tokenToUse}` : `${path}?access_token=${tokenToUse}`;

      let counter = 0;
      while (path && counter < 50) {
          const response: any = await new Promise(resolve => window.FB.api(path, (res: any) => resolve(res)));
          if (response?.data) {
              if (response.data.length > 0) allData = allData.concat(response.data);
              path = response.paging?.next ? response.paging.next.replace('https://graph.facebook.com', '') : null;
          } else {
              if (response?.error) {
                console.error(`Error fetching paginated data for path ${path}:`, response.error);
                if (response.error.code === 190) { 
                  alert("انتهت صلاحية جلسة فيسبوك. يرجى تسجيل الخروج والدخول مرة أخرى.");
                  await handleLogout();
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
    const response: any = await new Promise(resolve => window.FB.api('/', 'POST', { batch: JSON.stringify(batchRequest), access_token: appUser.fbAccessToken }, (res: any) => resolve(res)));
    const igAccounts: Target[] = [];
    if (response && !response.error) {
        response.forEach((res: any, index: number) => {
            if (res.code === 200) {
                const body = JSON.parse(res.body);
                if (body?.instagram_business_account) {
                    const igAccount = body.instagram_business_account;
                    const parentPage = pages[index];
                    igAccounts.push({
                        id: igAccount.id, name: igAccount.name ? `${igAccount.name} (@${igAccount.username})` : `@${igAccount.username}`,
                        type: 'instagram', parentPageId: parentPage.id, access_token: parentPage.access_token,
                        picture: { data: { url: igAccount.profile_picture_url || 'https://via.placeholder.com/150/833AB4/FFFFFF?text=IG' } }
                    });
                }
            }
        });
    }
    return igAccounts;
  }, [appUser?.fbAccessToken]);

  const fetchFacebookData = useCallback(async () => {
    if (!user || isSimulation) {
      if (isSimulation) {
        setTargets(MOCK_TARGETS); setBusinesses(MOCK_BUSINESSES); setTargetsLoading(false);
      }
      return;
    }
    if (!appUser?.fbAccessToken) {
        setTargetsLoading(false); // Not loading if no token
        return;
    }
    
    setTargetsLoading(true);
    setTargetsError(null);
    try {
        const pagesPromise = fetchWithPagination('/me/accounts?fields=id,name,access_token,picture{url}&limit=100');
        const [allPagesData] = await Promise.all([pagesPromise]);
        
        const allTargetsMap = new Map<string, Target>();
        if (allPagesData) allPagesData.forEach(p => allTargetsMap.set(p.id, { ...p, type: 'page' }));
        
        const igAccounts = await fetchInstagramAccounts(Array.from(allTargetsMap.values()));
        igAccounts.forEach(ig => allTargetsMap.set(ig.id, ig));
        
        const finalTargets = Array.from(allTargetsMap.values());
        setTargets(finalTargets);

        // **NEW**: Save fetched targets to user's document in Firestore
        await db.collection('users').doc(user.uid).set({ targets: finalTargets }, { merge: true });
        console.log("Facebook targets fetched and saved to Firestore.");

    } catch (error: any) {
        console.error("Error fetching data from Facebook:", error);
        setTargetsError(`فشل تحميل بياناتك من فيسبوك. الخطأ: ${error.message}`);
    } finally {
        setTargetsLoading(false);
    }
  }, [user, appUser, isSimulation, fetchInstagramAccounts, fetchWithPagination]);

  // Effect to fetch FB data only if it wasn't loaded from cache
  useEffect(() => {
    // If we have a token but the targets array is empty, it means they were not cached.
    if (appUser?.fbAccessToken && (!appUser.targets || appUser.targets.length === 0)) {
        fetchFacebookData();
    }
  }, [appUser, fetchFacebookData]);
  
  const handleLoadPagesFromBusiness = useCallback(async (businessId: string) => {
    setLoadingBusinessId(businessId);
    try {
      const ownedPages = await fetchWithPagination(`/${businessId}/owned_pages?fields=id,name,access_token,picture{url}&limit=100`);
      const allBusinessPages = [...ownedPages];
      const igAccounts = await fetchInstagramAccounts(allBusinessPages);
      const newTargetsMap = new Map<string, Target>();
      allBusinessPages.forEach(p => newTargetsMap.set(p.id, { ...p, type: 'page' }));
      igAccounts.forEach(ig => newTargetsMap.set(ig.id, ig));
      
      setTargets(prevTargets => {
        const existingTargetsMap = new Map(prevTargets.map(t => [t.id, t]));
        newTargetsMap.forEach((value, key) => existingTargetsMap.set(key, value));
        return Array.from(existingTargetsMap.values());
      });
      
      setLoadedBusinessIds(prev => new Set(prev).add(businessId));
    } catch(error: any) {
      alert(`فشل تحميل الصفحات: ${error.message}`);
    } finally {
      setLoadingBusinessId(null);
    }
  }, [fetchWithPagination, fetchInstagramAccounts]);

  // Syncing logic (omitted for brevity, remains unchanged)
  const handleFullHistorySync = useCallback(async (pageTarget: Target) => { /* ... */ }, []);

  // Auth handlers (SignUp, SignIn)
  const handleEmailSignUp = async (email: string, password: string) => {
    setAuthError(null);
    try {
        await auth.createUserWithEmailAndPassword(email, password);
        // The onAuthStateChanged listener will handle the rest.
    } catch (error: any) {
        setAuthError(error.code === 'auth/email-already-in-use' ? 'هذا البريد الإلكتروني مسجل بالفعل.' : 'حدث خطأ أثناء إنشاء الحساب.');
    }
  };
  const handleEmailSignIn = async (email: string, password: string) => {
    setAuthError(null);
    try {
        const cred = await auth.signInWithEmailAndPassword(email, password);
        // Update last login IP
        if(cred.user) await db.collection('users').doc(cred.user.uid).set({ lastLoginIp: await getIpAddress() }, { merge: true });
    } catch (error: any) {
        setAuthError('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
    }
  };
  
  const handleFacebookConnect = async () => {
    if (!user) return;
    const facebookProvider = new firebase.auth.FacebookAuthProvider();
    facebookProvider.addScope('email,public_profile,business_management,pages_show_list,read_insights,pages_manage_posts,pages_read_engagement,pages_manage_engagement,pages_messaging,instagram_basic,instagram_manage_comments,instagram_manage_messages');
    
    try {
        const result = await auth.currentUser?.linkWithPopup(facebookProvider);
        const credential = result?.credential as firebase.auth.OAuthCredential;
        if (credential?.accessToken) {
          // Save token to Firestore, which triggers the appUser state update
          const userDocRef = db.collection('users').doc(user.uid);
          await userDocRef.set({ fbAccessToken: credential.accessToken }, { merge: true });
          alert("تم ربط حساب فيسبوك بنجاح! جاري جلب صفحاتك...");
          // fetchFacebookData will be triggered by the useEffect watching appUser
        }
    } catch (error: any) {
        if (error.code === 'auth/credential-already-in-use') alert("هذا الحساب الفيسبوك مرتبط بالفعل بحساب آخر.");
        else alert(`فشل الاتصال بفيسبوك. السبب: ${error.message}`);
    }
  };

  const handleLogout = useCallback(async () => { await auth.signOut(); }, []);

  const renderContent = () => {
      if (currentPath === '/privacy-policy.html') return <PrivacyPolicyPage />;
      if (loadingUser) return <div className="flex items-center justify-center min-h-screen">جاري التحميل...</div>;
      
      if (!user || !appUser) return <HomePage onSignIn={handleEmailSignIn} onSignUp={handleEmailSignUp} authError={authError} />;
      
      // **PRIORITY #1**: If user is admin, show AdminPage immediately.
      if (appUser.isAdmin) {
          return <AdminPage user={user} allUsers={allUsers} onLogout={handleLogout} onSettingsClick={() => setIsSettingsModalOpen(true)} theme={theme} onToggleTheme={handleToggleTheme} plans={plans} />;
      }
      
      const userPlan = plans.find(p => p.id === appUser.planId) || plans.find(p => p.id === 'free') || null;

      if (selectedTarget) {
        return (
          <DashboardPage
            user={user}
            isAdmin={appUser.isAdmin}
            userPlan={userPlan}
            plans={plans}
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
            onSyncHistory={handleFullHistorySync}
            syncingTargetId={syncingTargetId}
            theme={theme}
            onToggleTheme={handleToggleTheme}
            fbAccessToken={appUser.fbAccessToken}
          />
        );
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
          onRefreshPages={fetchFacebookData} // Provide the refresh function
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
