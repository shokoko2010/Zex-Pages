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


export { auth, db, storage, firebaseConfig, saveContentPlan, getStrategyHistory, deleteStrategy };
export type { User };
