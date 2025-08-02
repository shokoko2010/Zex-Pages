import React, { useState, useCallback, useEffect, ChangeEvent } from 'react';
import PageSelectorPage from './components/PageSelectorPage';
import DashboardLayout from './components/DashboardLayout';
import HomePage from './components/HomePage';
import SettingsModal from './components/SettingsModal';
import PrivacyPolicyPage from './components/PrivacyPolicyPage';
import OnboardingTour from './components/OnboardingTour';
import { initializeGoogleGenAI } from './services/geminiService';
import { Target, Business, Plan, AppUser, StrategyHistoryItem, ContentPlanItem, StrategyRequest, PublishedPost, ScheduledPost, Draft, PageProfile, Role, PostType, InboxItem, AudienceGrowthData, HeatmapDataPoint, ContentTypePerformanceData, PerformanceSummaryData } from './types';
import { auth, db, User, saveContentPlan, getStrategyHistory, deleteStrategy, exchangeAndStoreLongLivedToken } from './services/firebaseService';
import firebase from 'firebase/compat/app';
import { validateEnvironment, getEnvironmentInfo } from './utils';

const isSimulation = window.location.protocol === 'http:';

class FacebookTokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FacebookTokenError';
  }
}

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

const facebookSDKLoader = new Promise<void>(resolve => {
    if (window.FB) {
        window.FB.init({
            appId      : import.meta.env.VITE_FACEBOOK_APP_ID,
            cookie     : true,
            xfbml      : true,
            version    : 'v19.0'
        });
        window.FB.AppEvents.logPageView();
        resolve();
    } else {
        (window as any).fbAsyncInit = function() {
            window.FB.init({
                appId      : import.meta.env.VITE_FACEBOOK_APP_ID,
                cookie     : true,
                xfbml      : true,
                version    : 'v19.0'
            });
            window.FB.AppEvents.logPageView();
            resolve();
        };
    }
});


const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [currentView, setCurrentView] = useState<import('./types').DashboardView>('dashboard');
  const [loadingUser, setLoadingUser] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [sdkLoaded, setSdkLoaded] = useState(false);

  const [plans, setPlans] = useState<Plan[]>([]);
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);

  const [apiKey, setApiKey] = useState<string | null>(null); 
  const [stabilityApiKey, setStabilityApiKey] = useState<string | null>(null); 
  const [aiClient, setAiClient] = useState<any | null>(null);

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const savedTheme = localStorage.getItem('theme');
    return (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) ? 'dark' : 'light';
  });

  const [targets, setTargets] = useState<Target[]>([]);
  const [targetsLoading, setTargetsLoading] = useState(true);
  const [targetsError, setTargetsError] = useState<string | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<Target | null>(null);
  const [favoriteTargetIds, setFavoriteTargetIds] = useState<Set<string>>(new Set());

  // Dashboard state
  const [publishedPosts, setPublishedPosts] = useState<PublishedPost[]>([]);
  const [publishedPostsLoading, setPublishedPostsLoading] = useState(false);
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [inboxItems, setInboxItems] = useState<InboxItem[]>([]);
  const [performanceSummaryData, setPerformanceSummaryData] = useState<PerformanceSummaryData | null>(null);
  const [performanceSummaryText, setPerformanceSummaryText] = useState('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [pageProfile, setPageProfile] = useState<PageProfile>({} as PageProfile);
  const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);
  
  const [adCampaigns, setAdCampaigns] = useState<any[]>([]);
  const [isUpdatingCampaign, setIsUpdatingCampaign] = useState(false);
  const [audienceGrowthData, setAudienceGrowthData] = useState<AudienceGrowthData[]>([]);
  const [heatmapData, setHeatmapData] = useState<HeatmapDataPoint[]>([]);
  const [contentTypeData, setContentTypeData] = useState<ContentTypePerformanceData[]>([]);
  const [isGeneratingDeepAnalytics, setIsGeneratingDeepAnalytics] = useState(false);
  const [audienceCityData, setAudienceCityData] = useState<{ [key: string]: number }>({});
  const [audienceCountryData, setAudienceCountryData] = useState<{ [key: string]: number }>({});
  const [isFetchingProfile, setIsFetchingProfile] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'partial', message: string } | null>(null);

  useEffect(() => {
    facebookSDKLoader.then(() => setSdkLoaded(true));
  }, []);

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
    alert("Session expired. Please reconnect.");
    if (user) {
 await db.collection('users').doc(user.uid).set({ fbAccessToken: null, targets: [] }, { merge: true }); // Still setting null in Firebase
        setAppUser(prev => prev ? { ...prev, fbAccessToken: null, targets: [] } : null); // Set to null instead of undefined
        setTargets([]);
    }
  }, [user]);

  const fetchWithPagination = useCallback(async (initialPath: string, accessToken?: string): Promise<any[]> => {
    if (!sdkLoaded) return [];
    let allData: any[] = [];
    const tokenToUse = accessToken || appUser?.fbAccessToken;
    if (!tokenToUse) throw new Error("Facebook Access Token is missing.");
    
    const [basePath, queryParams] = initialPath.split('?');
    const params = new URLSearchParams(queryParams || '');
    params.set('access_token', tokenToUse);
    
    let nextPath: string | null = `${basePath}?${params.toString()}`;

    while (nextPath) {
        const response: any = await new Promise(resolve => window.FB.api(nextPath, (res: any) => resolve(res)));
        if (response?.data?.length) allData = allData.concat(response.data);
        if (response?.error) {
            if (response.error.code === 190) throw new FacebookTokenError(response.error.message);
            throw new Error(response.error.message);
        }
        nextPath = response?.paging?.next?.replace('https://graph.facebook.com', '') || null;
    }
    return allData;
  }, [appUser?.fbAccessToken, sdkLoaded]);

  const fetchFacebookData = useCallback(async () => {
    if (!user || isSimulation || !appUser?.fbAccessToken || !sdkLoaded) return;
    setTargetsLoading(true);
    setTargetsError(null);
    try {
        const allPagesData = await fetchWithPagination('/me/accounts?fields=id,name,access_token,picture{url}&limit=100');
        setTargets(allPagesData.map(p => ({ ...p, type: 'facebook' })));
    } catch (error: any) {
        if (error instanceof FacebookTokenError) handleFacebookTokenError();
        else setTargetsError(error.message);
    } finally {
        setTargetsLoading(false);
    }
  }, [user, appUser?.fbAccessToken, isSimulation, fetchWithPagination, handleFacebookTokenError, sdkLoaded]);

  useEffect(() => {
 if (!sdkLoaded || user) return; // Prevent re-running if user is already set
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
        setLoadingUser(true);
        if (currentUser) {
            setUser(currentUser);
            const userDoc = await db.collection('users').doc(currentUser.uid).get();
            if (userDoc.exists) setAppUser(userDoc.data() as AppUser);
            else {
               const newUser: AppUser = { // Explicitly type newUser
 email: currentUser.email!, id: currentUser.uid, isAdmin: false, targets: [], uid: currentUser.uid, // Ensure uid is included
 planId: 'free', createdAt: new Date().toISOString(), lastLoginIp: await getIpAddress(), // Ensure createdAt is string
                   fbAccessToken: null, geminiApiKey: null, stabilityApiKey: null, onboardingCompleted: false, // Explicitly null for access tokens
               };
 await db.collection('users').doc(currentUser.uid).set({ ...newUser, uid: currentUser.uid }, { merge: true }); // Add uid explicitly if needed by Firebase
               setAppUser(newUser);
               setIsTourOpen(true);
            }
            const plansSnapshot = await db.collection('plans').get();
            setPlans(plansSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Plan)));
        } else {
            setUser(null); setAppUser(null);
        }
        setLoadingUser(false);
    });
    return () => unsubscribe();
  }, [sdkLoaded]);
  
  useEffect(() => {
    if (appUser && sdkLoaded) {
 setApiKey(appUser?.geminiApiKey || null);
 setStabilityApiKey(appUser?.stabilityApiKey || null);
 if (!appUser?.onboardingCompleted) setIsTourOpen(true);
        if (appUser?.fbAccessToken) fetchFacebookData();
        else {
            setTargets(appUser?.targets || []);
            setTargetsLoading(false);
        }
    }
  }, [appUser, fetchFacebookData, sdkLoaded]);

  useEffect(() => {
    setAiClient(apiKey ? initializeGoogleGenAI(apiKey) : null); // Now uses GoogleGenerativeAI type from geminiService
  }, [apiKey]);
  
    // Dummy handlers, replace with actual implementation
    const handlePublish = async (targetId: string, postType: PostType, options: any) => { console.log('Publishing:', { targetId, postType, options }); };
    const handleSaveDraft = async (targetId: string, draftData: any) => { console.log('Saving draft:', { targetId, draftData }); };
    const handleDeleteScheduledPost = async (postId: string) => { console.log('Deleting post:', postId); };
    const handleUpdateScheduledPost = async (targetId: string, postType: PostType, options: any) => { console.log('Updating post:', { targetId, postType, options }); };
    const handleSyncCalendar = () => { console.log('Syncing calendar'); };
    const handleApprovePost = (postId: string) => { console.log('Approving post:', postId); };
    const handleRejectPost = (postId: string) => { console.log('Rejecting post:', postId); };
    const handleGeneratePerformanceSummary = () => { console.log('Generating summary'); };
    const handleFetchPostInsights = async (postId: string) => { console.log('Fetching insights for:', postId); return {}; };
    const handleLoadDrafts = () => { console.log('Loading drafts'); };
    const handleDeleteDraft = async (draftId: string) => { console.log('Deleting draft:', draftId); };
    const handleSyncHistory = (target: Target) => { console.log('Syncing history for:', target.name); };
    const handleUpdateCampaignStatus = async (campaignId: string, newStatus: "ACTIVE" | "PAUSED") => { console.log('Updating campaign:', campaignId, newStatus); return true; };
    const fetchCampaignSubEntities = async (campaignId: string) => { console.log('Fetching sub-entities for:', campaignId); return { adSets: [], ads: [] }; };
    const handleSyncAdCampaigns = async (target: Target) => { console.log('Syncing ad campaigns for:', target.name); };
    const handleGenerateDeepAnalytics = () => { console.log('Generating deep analytics'); };
    const handleFetchPageProfile = async () => { console.log('Fetching page profile'); };
    const handleProfileChange = (newProfile: PageProfile) => { console.log('Updating profile:', newProfile); };
    const handleLogout = useCallback(async () => { await auth.signOut(); }, []);
    const handleToggleTheme = useCallback(() => setTheme(prev => prev === 'light' ? 'dark' : 'light'), []);
    const handleSaveKeys = useCallback(async (keys: { gemini: string; stability: string; }) => {
        if (!user) return;
        setApiKey(keys.gemini);
        setStabilityApiKey(keys.stability);
        await db.collection('users').doc(user.uid).set({ geminiApiKey: keys.gemini, stabilityApiKey: keys.stability }, { merge: true });
    }, [user]);
    const handleFacebookConnect = useCallback(async () => {
        if (!user || !sdkLoaded) return;
        const provider = new firebase.auth.FacebookAuthProvider();
        provider.addScope('email,public_profile,pages_show_list,pages_manage_posts');
        try {
            const result = await auth.currentUser?.linkWithPopup(provider);
            const credential = result?.credential as firebase.auth.OAuthCredential;
            if (credential?.accessToken) {
              await exchangeAndStoreLongLivedToken(user.uid, credential.accessToken);
              const userDoc = await db.collection('users').doc(user.uid).get();
              setAppUser(userDoc.data() as AppUser);
            }
        } catch (error) {
            console.error("Error connecting Facebook", error);
        }
    }, [user, sdkLoaded]);

  const handleSignIn = async (email: string, password: string) => {
    try {
      await auth.signInWithEmailAndPassword(email, password); // Signature matches (string, string) => Promise<void>
      setAuthError(null);
    } catch (error: any) {
      setAuthError(error.message);
    }
  };

  const handleSignUp = async (email: string, password: string) => {
    try {
      await auth.createUserWithEmailAndPassword(email, password); // Signature matches (string, string) => Promise<void>
      setAuthError(null);
    } catch (error: any) {
      setAuthError(error.message);
    }
  };


  const renderContent = () => {
    if (loadingUser || (appUser && !sdkLoaded)) return <div>Loading...</div>;
    if (currentPath.startsWith('/privacy-policy')) return <PrivacyPolicyPage/>;
    if (!user || !appUser) return <HomePage onSignIn={handleSignIn} onSignUp={handleSignUp} authError={authError} />;
    
    let userPlan = plans.find(p => p.id === appUser.planId) || plans.find(p => p.id === 'free') || null;

    if (selectedTarget) {
 return (
        <DashboardLayout
            pageName={selectedTarget.name}
            onChangePage={() => setSelectedTarget(null)}
            onLogout={handleLogout}
            onSettingsClick={() => setIsSettingsModalOpen(true)}
            theme={theme}
            onToggleTheme={handleToggleTheme}
            currentView={currentView}
            onViewChange={setCurrentView}
            managedTarget={selectedTarget}
            currentUserRole={'owner'} // Replace with actual role
            inboxItems={inboxItems}
            isSyncing={publishedPostsLoading || isSyncingCalendar}
            onSync={() => handleSyncHistory(selectedTarget)}
            user={appUser}
            userPlan={userPlan}
            pageProfile={pageProfile}
            notification={notification}
            showNotification={(type, message) => setNotification({ type, message })}
            publishedPosts={publishedPosts}
            publishedPostsLoading={publishedPostsLoading}
            scheduledPosts={scheduledPosts}
            drafts={drafts}
            performanceSummaryData={performanceSummaryData}
            performanceSummaryText={performanceSummaryText}
            isGeneratingSummary={isGeneratingSummary}
            onGeneratePerformanceSummary={handleGeneratePerformanceSummary}
            onFetchPostInsights={handleFetchPostInsights}
            onLoadDrafts={handleLoadDrafts}
            onDeleteDraft={handleDeleteDraft}
            onPublish={handlePublish}
            onSaveDraft={handleSaveDraft}
            onDeleteScheduledPost={handleDeleteScheduledPost}
            onUpdateScheduledPost={handleUpdateScheduledPost}
            onSyncCalendar={handleSyncCalendar}
            isSyncingCalendar={isSyncingCalendar}
            onApprovePost={handleApprovePost}
            onRejectPost={handleRejectPost}
            adCampaigns={adCampaigns}
            isUpdatingCampaign={isUpdatingCampaign}
            handleUpdateCampaignStatus={handleUpdateCampaignStatus}
            fetchCampaignSubEntities={fetchCampaignSubEntities}
            onSyncAdCampaigns={handleSyncAdCampaigns}
            audienceGrowthData={audienceGrowthData}
            heatmapData={heatmapData}
            contentTypeData={contentTypeData}
            isGeneratingDeepAnalytics={isGeneratingDeepAnalytics}
            audienceCityData={audienceCityData}
            audienceCountryData={audienceCountryData}
            onGenerateDeepAnalytics={handleGenerateDeepAnalytics}
 onFetchPageProfile={handleFetchPageProfile}
            isFetchingProfile={isFetchingProfile}
            onProfileChange={handleProfileChange}
            allUsers={allUsers}
            plans={plans}
            aiClient={aiClient}
            stabilityApiKey={stabilityApiKey}
            linkedInstagramTarget={null}
            // These props are for other views and need to be implemented
            contentPlan={null}
            isGeneratingPlan={false}
            planError={null}
            isSchedulingStrategy={false}
            strategyHistory={[]}
            onGeneratePlan={async () => {}}
            onScheduleStrategy={async () => {}}
            onStartPost={() => {}}
            onLoadFromHistory={() => {}}
            onDeleteFromHistory={async () => {}}
        />
      );
    }

    return (
      <PageSelectorPage
        targets={targets}
        businesses={[]}
        onLoadPagesFromBusiness={() => {}}
        loadingBusinessId={null}
        loadedBusinessIds={new Set()}
        isLoading={targetsLoading}
        error={targetsError}
        onSelectTarget={setSelectedTarget}
        onLogout={handleLogout}
        onSettingsClick={() => setIsSettingsModalOpen(true)}
        onAdminClick={() => setCurrentPath('/admin')}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        favoriteTargetIds={favoriteTargetIds}
        onToggleFavorite={() => {}}
        isFacebookConnected={!!appUser?.fbAccessToken}
        onConnectFacebook={handleFacebookConnect}
        onRefreshPages={fetchFacebookData}
        userPlan={userPlan}
      />
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <OnboardingTour isOpen={isTourOpen} onComplete={() => setIsTourOpen(false)} hasConnectedFacebook={!!appUser?.fbAccessToken} hasSelectedTarget={!!selectedTarget}/>
      <SettingsModal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} onSave={handleSaveKeys} currentApiKey={apiKey} currentStabilityApiKey={stabilityApiKey}/>
      {renderContent()}
    </div>
  );
};

export default App;

