import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';
import { ContentPlanItem, StrategyRequest } from '../types'; // Assuming types are in '../types'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

type User = firebase.User;

const exchangeAndStoreLongLivedToken = async (userId: string, shortLivedToken: string) => {
    if (!userId || !shortLivedToken) return;
  
    const clientId = import.meta.env.VITE_FACEBOOK_APP_ID;
    const clientSecret = import.meta.env.VITE_FACEBASE_APP_SECRET;
    const url = `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${clientId}&client_secret=${clientSecret}&fb_exchange_token=${shortLivedToken}`;
  
    try {
      const response = await fetch(url);
      const data = await response.json();
      const longLivedToken = data.access_token;
  
      if (longLivedToken) {
        await db.collection('users').doc(userId).update({
          fbAccessToken: longLivedToken,
        });
      }
    } catch (error) {
      console.error('Error exchanging token:', error);
    }
  };

// New functions for content strategy
const saveContentPlan = async (userId: string, pageId: string, plan: ContentPlanItem[], request: StrategyRequest) => {
  if (!userId || !pageId) return;
  try {
    await db.collection('users').doc(userId).collection('pages').doc(pageId).collection('strategies').add({
      plan,
      request,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error("Error saving content plan:", error);
    throw error;
  }
};

const getStrategyHistory = async (userId: string, pageId: string) => {
    if (!userId || !pageId) return [];
    try {
        const snapshot = await db.collection('users').doc(userId).collection('pages').doc(pageId).collection('strategies').orderBy('createdAt', 'desc').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error getting strategy history:", error);
        return [];
    }
};

const deleteStrategy = async (userId: string, pageId: string, strategyId: string) => {
    if (!userId || !pageId || !strategyId) return;
    try {
        await db.collection('users').doc(userId).collection('pages').doc(pageId).collection('strategies').doc(strategyId).delete();
    } catch (error) {
        console.error("Error deleting strategy:", error);
        throw error;
    }
};


export { auth, db, storage, firebaseConfig, saveContentPlan, getStrategyHistory, deleteStrategy, exchangeAndStoreLongLivedToken };
export type { User };
