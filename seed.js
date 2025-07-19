// seed.js (or seed.ts)

// Replace with the actual path to your downloaded service account key JSON file
const serviceAccount = require('./path/to/your/serviceAccountKey.json');
const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  // Replace with your database URL if needed, though not usually for Firestore
  // databaseURL: 'https://YOUR_PROJECT_ID.firebaseio.com'
});

const db = admin.firestore();

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    pricePeriod: 'one-time',
    features: ["إدارة حتى 5 صفحات فيسبوك/انستجرام", "جدولة المنشورات الأساسية", "تحليلات محدودة"], // Replace with actual features
    limits: {
      pages: 5,
      aiText: false,
      aiImage: false,
      autoResponder: false,
      contentPlanner: false,
      bulkScheduling: false,
      contentApprovalWorkflow: false,
      deepAnalytics: false,
    }
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 50, // Replace with actual monthly price in your currency
    pricePeriod: 'monthly',
    features: ["إدارة غير محدودة للصفحات", "جدولة المنشورات المتقدمة", "تحليلات مفصلة", "الرد الآلي", "مساعد الذكاء الاصطناعي (نص)"], // Replace with actual features
    limits: {
      pages: -1, // Unlimited
      aiText: true,
      aiImage: false, // Adjust if Pro includes AI image
      autoResponder: true,
      contentPlanner: true,
      bulkScheduling: true,
      contentApprovalWorkflow: false, // Adjust if Pro includes this
      deepAnalytics: true,
    }
  },
  // Add more plan objects as needed (e.g., 'super')
];

const seedDatabase = async () => {
  console.log('Seeding plans collection...');
  for (const plan of plans) {
    const docRef = db.collection('plans').doc(plan.id);
    await docRef.set(plan);
    console.log(`Added plan: ${plan.name}`);
  }
  console.log('Plans seeding complete.');

  // You could add seeding for other collections here if necessary
  // For users and targets_data, it's usually best to let the app create them
};

seedDatabase().catch(error => {
  console.error("Database seeding failed:", error);
});