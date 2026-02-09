export const API_BASE_URL = 'https://brickflow.dev/api/';
export const BASE_URL = 'https://brickflow.dev/';
export const WEBSITE_URL = 'https://brickflow.dev/';
export const DOWNLOAD_BASE_URL =
  import.meta.env.PROD || import.meta.env.VITE_DEV_REMOTE
    ? import.meta.env.VITE_BACKEND_SERVER + 'download/'
    : '/download/';
export const ACCESS_TOKEN_NAME = 'x-auth-token';

export const FILE_BASE_URL = import.meta.env.VITE_FILE_BASE_URL;

//  console.log(
//    '🚀 Welcome to BRICKFLOW ERP CRM! Did you know that we also offer commercial customization services? Contact us at hello@brickflowapp.com for more information.'
//  );
