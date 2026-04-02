const TENANT_ID = import.meta.env.VITE_AZURE_TENANT_ID || 'a78736a9-b975-4898-ae0e-2f783c0bcf14';
const CLIENT_ID = import.meta.env.VITE_AZURE_CLIENT_ID || '50b0d725-7484-446b-96fc-0e4cae07486c';

export const msalConfig = {
  auth: {
    clientId: CLIENT_ID,
    authority: `https://login.microsoftonline.com/${TENANT_ID}`,
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'sessionStorage', // Clears on tab close — good for shared workstations
    storeAuthStateInCookie: false,
  },
};

// Scopes requested during login
export const loginRequest = {
  scopes: ['User.Read'],
};
