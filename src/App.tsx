
import React, { useState, useCallback, useEffect } from 'react';
import PageSelectorPage from './components/PageSelectorPage';
import DashboardPage from './components/DashboardPage';
import HomePage from './components/HomePage';
import SettingsModal from './components/SettingsModal';
import PrivacyPolicyPage from './components/PrivacyPolicyPage';
import OnboardingTour from './components/OnboardingTour';
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [userPlanId, setUserPlanId] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [fbAccessToken, setFbAccessToken] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [stabilityApiKey, setStabilityApiKey] = useState<string | null>(null);
  const [aiClient, setAiClient] = useState<GoogleGenAI | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);

  const [targets, setTargets] = useState<Target[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [targetsLoading, setTargetsLoading] = useState(true);
  const [targetsError, setTargetsError] = useState<string | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<Target | null>(null);
  const [favoriteTargetIds, setFavoriteTargetIds] = useState<Set<string>>(new Set());
  
  const [loadingBusinessId, setLoadingBusinessId] = useState<string | null>(null);
  const [loadedBusinessIds, setLoadedBusinessIds] = useState<Set<string>>(new Set());
  const [syncingTargetId, setSyncingTargetId] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        return 'dark';
    }
    return 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
    } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
    }
  }, [theme]);
  
  useEffect(() => {
    const handlePopState = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  
  // Firebase Auth Listener
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
        setLoadingUser(true);

        if (currentUser) {
            // Fetch plans only when the user is logged in
            try {
                const plansCollection = db.collection('plans');
                const plansSnapshot = await plansCollection.get();
                const plansList = plansSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Plan));
                setPlans(plansList);
            } catch (error) {
                console.error("Failed to fetch plans:", error);
                setAuthError("فشل تحميل بيانات الاشتراك. قد تكون هناك مشكلة في الأذونات.");
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
               };
               await userDocRef.set(newUserDoc, { merge: true });
               setIsAdmin(false);
               setUserPlanId('free');
               setIsTourOpen(true);
               userData = newUserDoc;
            }
            if (userData && userData.isAdmin) {
                try {
                    const usersSnapshot = await db.collection('users').get();
                    const usersList = usersSnapshot.docs.map(doc => doc.data() as AppUser);
                    setAllUsers(usersList);
                } catch (error) {
                    console.error("Failed to fetch all users:", error);
                }
            }
        } else {
            setUser(null);
            setIsAdmin(false);
            setUserPlanId(null);
            setApiKey(null);
            setStabilityApiKey(null);
            setTargets([]);
            setBusinesses([]);
            setSelectedTarget(null);
            setFavoriteTargetIds(new Set());
            setFbAccessToken(null);
            setAllUsers([]);
            setIsTourOpen(false);
            setPlans([]); // Clear plans on logout
        }
        setLoadingUser(false);
    });
    return () => unsubscribe();
  }, []);

  const handleCompleteTour = async () => {
      setIsTourOpen(false);
      if (user) {
          const userDocRef = db.collection('users').doc(user.uid);
          await userDocRef.set({ onboardingCompleted: true }, { merge: true });
      }
  };


  const handleToggleFavorite = async (targetId: string) => {
    if (!user) return;
    const newFavorites = new Set(favoriteTargetIds);
    if (newFavorites.has(targetId)) {
        newFavorites.delete(targetId);
    } else {
        newFavorites.add(targetId);
    }
    setFavoriteTargetIds(newFavorites);
    const userDocRef = db.collection('users').doc(user.uid);
    await userDocRef.set({ favoriteTargetIds: Array.from(newFavorites) }, { merge: true });
  };

  const handleToggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  useEffect(() => {
    if (apiKey) {
      setAiClient(initializeGoogleGenAI(apiKey));
    } else {
      setAiClient(null);
    }
  }, [apiKey]);

  const handleSaveKeys = async (keys: { gemini: string; stability: string; }) => {
    if (!user) return;
    setApiKey(keys.gemini);
    setStabilityApiKey(keys.stability);
    
    const userDocRef = db.collection('users').doc(user.uid);
    await userDocRef.set({
      geminiApiKey: keys.gemini,
      stabilityApiKey: keys.stability
    }, { merge: true });
  };

  const isSimulationMode = isSimulation;
  
  const fetchWithPagination = useCallback(async (initialPath: string, accessToken?: string): Promise<any[]> => {
      let allData: any[] = [];
      let path: string | null = initialPath;
      
      const tokenToUse = accessToken || fbAccessToken;
      if (!tokenToUse) {
        throw new Error("Facebook Access Token is missing.");
      }

      if (!path.includes('access_token=')) {
          path = path.includes('?') ? `${path}&access_token=${tokenToUse}` : `${path}?access_token=${tokenToUse}`;
      }

      let counter = 0; // safety break to avoid infinite loops
      while (path && counter < 50) {
          const response: any = await new Promise(resolve => window.FB.api(path, (res: any) => resolve(res)));
          if (response && response.data) {
              if (response.data.length > 0) {
                allData = allData.concat(response.data);
              }
              path = response.paging?.next ? response.paging.next.replace('https://graph.facebook.com', '') : null;
          } else {
              if (response.error) {
                console.error(`Error fetching paginated data for path ${path}:`, response.error);
                if (response.error.code === 190) { // OAuthException
                  alert("انتهت صلاحية جلسة فيسبوك. يرجى تسجيل الخروج والدخول مرة أخرى.");
                  await handleLogout();
                }
                throw new Error(`خطأ في واجهة فيسبوك عند جلب البيانات: ${response.error.message} (رمز: ${response.error.code})`);
              }
              path = null;
          }
          counter++;
      }
      return allData;
  }, [fbAccessToken]);

  const fetchInstagramAccounts = useCallback(async (pages: Target[]): Promise<Target[]> => {
    if (pages.length === 0) return [];
    const BATCH_SIZE = 50;
    const pageChunks: Target[][] = [];
    for (let i = 0; i < pages.length; i += BATCH_SIZE) {
        pageChunks.push(pages.slice(i, i + BATCH_SIZE));
    }
    const igPromises = pageChunks.map(chunk => {
        const batchRequest = chunk.map(page => ({
            method: 'GET',
            relative_url: `${page.id}?fields=instagram_business_account{id,name,username,profile_picture_url}`
        }));
        return new Promise<any[] | {error: any}>(resolve => {
            window.FB.api('/', 'POST', { batch: JSON.stringify(batchRequest), access_token: fbAccessToken }, (response: any) => resolve(response));
        });
    });
    const allIgChunkedResponses = await Promise.all(igPromises);
    const igAccounts: Target[] = [];
    allIgChunkedResponses.forEach((igResponses: any, chunkIndex: number) => {
        if (igResponses && !igResponses.error && Array.isArray(igResponses)) {
            igResponses.forEach((res: any, indexInChunk: number) => {
                if (res && res.code === 200) {
                    try {
                        const body = JSON.parse(res.body);
                        if (body && body.instagram_business_account) {
                            const igAccount = body.instagram_business_account;
                            const parentPage = pageChunks[chunkIndex][indexInChunk];
                            if (parentPage) {
                                igAccounts.push({
                                    id: igAccount.id,
                                    name: igAccount.name ? `${igAccount.name} (@${igAccount.username})` : `@${igAccount.username}`,
                                    type: 'instagram',
                                    parentPageId: parentPage.id,
                                    access_token: parentPage.access_token,
                                    picture: { data: { url: igAccount.profile_picture_url || 'https://via.placeholder.com/150/833AB4/FFFFFF?text=IG' } }
                                });
                            }
                        }
                    } catch (e) {
                        console.error("Error parsing IG account response body:", e, res.body);
                    }
                }
            });
        } else if (igResponses && igResponses.error) {
            console.warn(`A batch request for Instagram accounts failed and was skipped. Error:`, igResponses.error);
        }
    });
    return igAccounts;
  }, [fbAccessToken]);

  const fetchFacebookData = useCallback(async () => {
    if (!user || isSimulationMode || !fbAccessToken) {
      if (isSimulationMode) {
        setTargets(MOCK_TARGETS);
        setBusinesses(MOCK_BUSINESSES);
        setTargetsLoading(false);
      } else {
        setTargets([]);
        setBusinesses([]);
        setTargetsLoading(false); // Not loading if no token
      }
      return;
    }
    
    setTargetsLoading(true);
    setTargetsError(null);
    try {
        const pagesPromise = fetchWithPagination('/me/accounts?fields=id,name,access_token,picture{url}&limit=100');
        const businessesPromise = fetchWithPagination('/me/businesses?fields=id,name');
        
        const sharedPagesQuery = db.collection('targets_data').where('members', 'array-contains', user.uid);
        const sharedPagesPromise = sharedPagesQuery.get();
        
        const [allPagesData, allBusinessesData, sharedPagesSnapshot] = await Promise.all([pagesPromise, businessesPromise, sharedPagesPromise]);
        
        const allTargetsMap = new Map<string, Target>();
        
        // Add user's own pages
        if (allPagesData) allPagesData.forEach(p => allTargetsMap.set(p.id, { ...p, type: 'page' }));
        
        // Add shared pages
        sharedPagesSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.ownerUid !== user.uid) { // Ensure it's actually a shared page, not their own
                allTargetsMap.set(data.id, {
                    id: data.id,
                    name: data.name,
                    type: 'page', // Assume shared targets are pages for now
                    access_token: data.accessToken,
                    picture: { data: { url: data.pictureUrl } }
                });
            }
        });
        
        const allPagesArray = Array.from(allTargetsMap.values()).filter(t => t.type === 'page');

        const igAccounts = await fetchInstagramAccounts(allPagesArray);
        igAccounts.forEach(ig => allTargetsMap.set(ig.id, ig));
        
        setTargets(Array.from(allTargetsMap.values()));
        setBusinesses(allBusinessesData);

    } catch (error: any) {
        console.error("Error fetching data from Facebook:", error);
        setTargetsError(`فشل تحميل بياناتك من فيسبوك. قد يكون السبب مشكلة في الشبكة أو في صلاحيات الوصول. الخطأ: ${error.message}`);
    } finally {
        setTargetsLoading(false);
    }
  }, [user, isSimulationMode, fetchInstagramAccounts, fetchWithPagination, fbAccessToken]);

  useEffect(() => {
    fetchFacebookData();
  }, [fetchFacebookData]);
  
  const handleLoadPagesFromBusiness = useCallback(async (businessId: string) => {
    setLoadingBusinessId(businessId);
    try {
      const ownedPagesPromise = fetchWithPagination(`/${businessId}/owned_pages?fields=id,name,access_token,picture{url}&limit=100`);
      const clientPagesPromise = fetchWithPagination(`/${businessId}/client_pages?fields=id,name,access_token,picture{url}&limit=100`);
      
      const [ownedPages, clientPages] = await Promise.all([ownedPagesPromise, clientPagesPromise]);
      const allBusinessPages = [...ownedPages, ...clientPages];
      
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
      console.error(`Error loading pages for business ${businessId}:`, error);
      alert(`فشل تحميل الصفحات من حافظة الأعمال.
السبب: ${error.message}`);
    } finally {
      setLoadingBusinessId(null);
    }
  }, [fetchWithPagination, fetchInstagramAccounts]);


  const handleFullHistorySync = useCallback(async (pageTarget: Target) => {
    if (!user || isSimulationMode) {
        alert("لا يمكن مزامنة السجل في وضع المحاكاة أو بدون تسجيل الدخول.");
        return;
    }
    if (pageTarget.type !== 'page') {
        alert("المزامنة الكاملة متاحة فقط لصفحات فيسبوك.");
        return;
    }

    const pageAccessToken = pageTarget.access_token;
    if (!pageAccessToken) {
        alert(`لم يتم العثور على صلاحية الوصول (Access Token) للصفحة ${pageTarget.name}.`);
        return;
    }
    
    setSyncingTargetId(pageTarget.id);
    try {
        const linkedIgTarget = targets.find(t => t.type === 'instagram' && t.parentPageId === pageTarget.id);

        let fetchedPosts: PublishedPost[] = [];
        let combinedInboxItems: InboxItem[] = [];
        const defaultPicture = 'https://via.placeholder.com/40/cccccc/ffffff?text=?';

        const fbPostFields = 'id,message,full_picture,created_time,from,likes.summary(true),shares,comments.summary(true),insights.metric(post_impressions_unique){values}';
        const fbPostsPath = `/${pageTarget.id}/published_posts?fields=${fbPostFields}&limit=25`;
        const fbAllPostsData = await fetchWithPagination(fbPostsPath, pageAccessToken);
        
        fetchedPosts.push(...fbAllPostsData.map((post: any): PublishedPost => ({
            id: post.id, pageId: pageTarget.id, pageName: pageTarget.name, pageAvatarUrl: pageTarget.picture.data.url,
            text: post.message || '', imagePreview: post.full_picture || null, publishedAt: new Date(post.created_time),
            analytics: { likes: post.likes?.summary?.total_count ?? 0, comments: post.comments?.summary?.total_count ?? 0, shares: post.shares?.count ?? 0, reach: post.insights?.data?.[0]?.values?.[0]?.value ?? 0, loading: false, lastUpdated: new Date(), isGeneratingInsights: false }
        })));

        const targetDataRef = db.collection('targets_data').doc(pageTarget.id);
        const docSnap = await targetDataRef.get();
        const data = docSnap.exists ? docSnap.data() : { userId: user.uid };
        
        const existingInbox = data?.inboxItems || [];
        const combinedInboxMap = new Map<string, InboxItem>();
        existingInbox.forEach((item: InboxItem) => combinedInboxMap.set(item.id, item));
        combinedInboxItems.forEach((item: InboxItem) => combinedInboxMap.set(item.id, item));
        const sortedInboxItems = Array.from(combinedInboxMap.values()).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        
        const existingPosts = data?.publishedPosts || [];
        const combinedPostsMap = new Map<string, PublishedPost>();
        existingPosts.forEach((post: PublishedPost) => combinedPostsMap.set(post.id, post));
        fetchedPosts.forEach((post: PublishedPost) => combinedPostsMap.set(post.id, post));
        const sortedPosts = Array.from(combinedPostsMap.values()).sort((a,b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

        const updatedData = {
          ...data,
          publishedPosts: sortedPosts.slice(0, MAX_PUBLISHED_POSTS_TO_STORE_SYNC),
          inboxItems: sortedInboxItems.slice(0, MAX_INBOX_ITEMS_TO_STORE_SYNC),
          syncedAt: new Date().toISOString()
        };

        await targetDataRef.set(updatedData);
        alert(`تمت مزامنة ${fetchedPosts.length} منشورًا و ${combinedInboxItems.length} عنصرًا في البريد الوارد بنجاح للهدف ${pageTarget.name}${linkedIgTarget ? ` و ${linkedIgTarget.name}`: ''}.`);

    } catch(error: any) {
      console.error("Error during full history sync:", error);
      const errorMessage = error instanceof Error ? error.message : "حدث خطأ غير متوقع أثناء المزامنة.";
      alert(`فشلت المزامنة الكاملة للهدف ${pageTarget.name}.
السبب: ${errorMessage}

قد تحتاج إلى تحديث صلاحيات الوصول وإعادة المحاولة.`);
    } finally {
      setSyncingTargetId(null);
    }
  }, [fetchWithPagination, isSimulationMode, targets, user]);


  const handleEmailSignUp = async (email: string, password: string) => {
    setAuthError(null);
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        if (user) {
            const ip = await getIpAddress();
            const userDocRef = db.collection('users').doc(user.uid);
            await userDocRef.set({
                email: user.email,
                uid: user.uid,
                isAdmin: false,
                planId: 'free',
                createdAt: new Date().toISOString(),
                onboardingCompleted: false,
                lastLoginIp: ip,
            });
        }
    } catch (error: any) {
        if (error.code === 'auth/email-already-in-use') {
            setAuthError('هذا البريد الإلكتروني مسجل بالفعل.');
        } else {
            setAuthError('حدث خطأ أثناء إنشاء الحساب.');
        }
        console.error("Firebase sign up error:", error);
    }
  };

  const handleEmailSignIn = async (email: string, password: string) => {
    setAuthError(null);
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        if (user) {
            const ip = await getIpAddress();
            const userDocRef = db.collection('users').doc(user.uid);
            await userDocRef.set({ lastLoginIp: ip }, { merge: true });
        }
    } catch (error: any) {
        if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
            setAuthError('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
        } else {
            setAuthError('حدث خطأ أثناء تسجيل الدخول.');
        }
        console.error("Firebase sign in error:", error);
    }
  };
  
  const handleFacebookConnect = async () => {
    if (!user) return;
    const facebookProvider = new firebase.auth.FacebookAuthProvider();
    // Add all required Facebook API scopes
    facebookProvider.addScope('email');
    facebookProvider.addScope('public_profile');
    facebookProvider.addScope('business_management');
    facebookProvider.addScope('pages_show_list');
    facebookProvider.addScope('read_insights');
    facebookProvider.addScope('pages_manage_posts');
    facebookProvider.addScope('pages_read_engagement');
    facebookProvider.addScope('pages_manage_engagement');
    facebookProvider.addScope('pages_messaging');
    facebookProvider.addScope('instagram_basic');
    facebookProvider.addScope('instagram_manage_comments');
    facebookProvider.addScope('instagram_manage_messages');
    
    try {
        const result = await auth.signInWithPopup(facebookProvider);
        const credential = result.credential as firebase.auth.OAuthCredential;
        if (credential?.accessToken) {
          setFbAccessToken(credential.accessToken);
          // Save the token to Firestore for persistence
          const userDocRef = db.collection('users').doc(user.uid);
          await userDocRef.set({ fbAccessToken: credential.accessToken }, { merge: true });
        }
    } catch (error: any) {
        console.error("Facebook connect error:", error);
        
        // Handle account exists with different credential error
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
                    try {
                        // TODO: Replace this prompt with your actual UI component
                        // You should create a modal or form to collect the user's password
                        const password = prompt('يرجى إدخال كلمة المرور لحسابك الأصلي:');
                        
                        if (password) {
                            // Sign in with the original email/password method
                            const originalUserCredential = await auth.signInWithEmailAndPassword(email, password);
                            
                            // Link the Facebook credential to the existing account
                            const linkedResult = await originalUserCredential.user!.linkWithCredential(pendingCred);
                            
                            // Extract the Facebook access token from the linked result
                            const linkedCredential = linkedResult.credential as firebase.auth.OAuthCredential;
                            if (linkedCredential?.accessToken) {
                                setFbAccessToken(linkedCredential.accessToken);
                                // Save the token to Firestore for persistence
                                const userDocRef = db.collection('users').doc(originalUserCredential.user!.uid);
                                await userDocRef.set({ fbAccessToken: linkedCredential.accessToken }, { merge: true });
                                
                                alert('تم ربط حساب فيسبوك بنجاح!');
                            }
                        } else {
                            alert('تم إلغاء العملية. لم يتم ربط حساب فيسبوك.');
                        }
                    } catch (linkError: any) {
                        console.error("Error linking accounts:", linkError);
                        let errorMessage = 'فشل في ربط الحسابات.';
                        
                        if (linkError.code === 'auth/wrong-password') {
                            errorMessage = 'كلمة المرور غير صحيحة.';
                        } else if (linkError.code === 'auth/user-not-found') {
                            errorMessage = 'لم يتم العثور على حساب بهذا البريد الإلكتروني.';
                        } else if (linkError.code === 'auth/provider-already-linked') {
                            errorMessage = 'حساب فيسبوك مرتبط بالفعل بهذا الحساب.';
                        } else if (linkError.code === 'auth/credential-already-in-use') {
                            errorMessage = 'بيانات اعتماد فيسبوك مستخدمة بالفعل مع حساب آخر.';
                        }
                        
                        alert(`${errorMessage} السبب: ${linkError.message}`);
                    }
                } else {
                    alert('تم إلغاء ربط حساب فيسبوك.');
                }
            } else {
                alert('فشل في الحصول على معلومات الحساب المطلوبة للربط.');
            }
        } else {
            // Handle other Facebook connection errors
            let errorMessage = 'فشل الاتصال بفيسبوك.';
            
            if (error.code === 'auth/popup-closed-by-user') {
                errorMessage = 'تم إغلاق نافذة تسجيل الدخول بواسطة المستخدم.';
            } else if (error.code === 'auth/popup-blocked') {
                errorMessage = 'تم حظر النافذة المنبثقة. يرجى السماح بالنوافذ المنبثقة وإعادة المحاولة.';
            } else if (error.code === 'auth/cancelled-popup-request') {
                errorMessage = 'تم إلغاء طلب تسجيل الدخول.';
            }
            
            alert(`${errorMessage} السبب: ${error.message || error}`);
        }
    }
};


  const handleLogout = useCallback(async () => {
    await auth.signOut();
  }, []);

  const handleSelectTarget = (target: Target) => setSelectedTarget(target);
  const handleChangePage = () => setSelectedTarget(null);

  const renderContent = () => {
      if (currentPath === '/privacy-policy.html') {
        return <PrivacyPolicyPage />;
      }
      if (loadingUser) {
        return <div className="flex items-center justify-center min-h-screen">جاري التحميل...</div>;
      }
      if (!user) {
        return <HomePage onSignIn={handleEmailSignIn} onSignUp={handleEmailSignUp} authError={authError} />;
      }

      const userPlan = plans.find(p => p.id === userPlanId) || plans.find(p => p.id === 'free') || null;

      if (selectedTarget) {
        return (
          <DashboardPage
            user={user}
            isAdmin={isAdmin}
            userPlan={userPlan}
            plans={plans}
            allUsers={allUsers}
            managedTarget={selectedTarget}
            allTargets={targets}
            onChangePage={handleChangePage}
            onLogout={handleLogout}
            isSimulationMode={isSimulationMode}
            aiClient={aiClient}
            stabilityApiKey={stabilityApiKey}
            onSettingsClick={() => setIsSettingsModalOpen(true)}
            fetchWithPagination={fetchWithPagination}
            onSyncHistory={handleFullHistorySync}
            syncingTargetId={syncingTargetId}
            theme={theme}
            onToggleTheme={handleToggleTheme}
            fbAccessToken={fbAccessToken}
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
          onSelectTarget={handleSelectTarget}
          onLogout={handleLogout}
          onSettingsClick={() => setIsSettingsModalOpen(true)}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          favoriteTargetIds={favoriteTargetIds}
          onToggleFavorite={handleToggleFavorite}
          isFacebookConnected={!!fbAccessToken}
          onConnectFacebook={handleFacebookConnect}
        />
      );
  };
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <OnboardingTour
        isOpen={isTourOpen}
        onComplete={handleCompleteTour}
        hasConnectedFacebook={!!fbAccessToken}
        hasSelectedTarget={!!selectedTarget}
      />
      <SettingsModal 
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onSave={handleSaveKeys}
        currentApiKey={apiKey}
        currentStabilityApiKey={stabilityApiKey}
      />
      {renderContent()}
    </div>
  );
};

export default App;
