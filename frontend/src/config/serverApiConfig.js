export const API_BASE_URL = 'http://localhost:8888/api/';
export const BASE_URL = 'http://localhost:8888/';
export const WEBSITE_URL = 'http://localhost:8888/';
export const DOWNLOAD_BASE_URL =
  import.meta.env.PROD || import.meta.env.VITE_DEV_REMOTE
    ? import.meta.env.VITE_BACKEND_SERVER + 'download/'
    : '/download/';
export const ACCESS_TOKEN_NAME = 'x-auth-token';

export const FILE_BASE_URL = import.meta.env.VITE_FILE_BASE_URL;

//  console.log(
//    '🚀 Welcome to BRICKFLOW ERP CRM! Did you know that we also offer commercial customization services? Contact us at hello@brickflowapp.com for more information.'
//  );
