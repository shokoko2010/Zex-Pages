export async function getIpAddress(): Promise<string> {
  // Replace this with your actual implementation to get the user's IP address
  return '127.0.0.1'; // Placeholder IP address
}

export const base64ToFile = (base64: string, filename: string): File => {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: 'image/jpeg' });
  return new File([blob], filename, { type: 'image/jpeg' });
};

// Environment detection utility
export const isProduction = import.meta.env.PROD || import.meta.env.NODE_ENV === 'production';
export const isDevelopment = import.meta.env.DEV || import.meta.env.NODE_ENV === 'development';

// Environment validation
export const validateEnvironment = () => {
  const requiredEnvVars = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID',
    'VITE_FACEBOOK_APP_ID',
    'VITE_FACEBOOK_APP_SECRET'
  ];

  const missingVars = requiredEnvVars.filter(varName => !import.meta.env[varName]);
  
  if (missingVars.length > 0) {
    console.warn('Missing environment variables:', missingVars);
    if (isProduction) {
      console.error('Production environment is missing required configuration. Please check your Vercel environment variables.');
    }
    return false;
  }
  
  return true;
};

// Get environment info
export const getEnvironmentInfo = () => {
  return {
    isProduction,
    isDevelopment,
    nodeEnv: import.meta.env.NODE_ENV,
    baseUrl: import.meta.env.BASE_URL,
    hasRequiredEnvVars: validateEnvironment()
  };
};