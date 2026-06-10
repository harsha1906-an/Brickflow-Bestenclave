export const API_BASE_URL = (import.meta.env.VITE_BACKEND_SERVER || 'http://localhost:8888/') + 'api/';
export const BASE_URL = import.meta.env.VITE_BACKEND_SERVER || 'http://localhost:8888/';
export const WEBSITE_URL = import.meta.env.VITE_BACKEND_SERVER || 'http://localhost:8888/';
// Download endpoint - Hardcoded to ensure no /api/ prefix
export const DOWNLOAD_BASE_URL = (import.meta.env.VITE_BACKEND_SERVER || 'http://localhost:8888/') + 'download/';
export const ACCESS_TOKEN_NAME = 'x-auth-token';

export const FILE_BASE_URL = import.meta.env.VITE_FILE_BASE_URL;

//  console.log(
//    '🚀 Welcome to BRICKFLOW ERP CRM! Did you know that we also offer commercial customization services? Contact us at hello@brickflowapp.com for more information.'
//  );
