import { notification } from '@/utils/antdGlobal';
import codeMessage from './codeMessage';

const errorHandler = (error) => {
  if (!navigator.onLine) {
    // Code to execute when there is internet connection
    notification.error({
      message: 'No internet connection',
      description: 'Cannot connect to the Internet, Check your internet network',
      duration: 15,
    });
    return {
      success: false,
      result: null,
      message: 'Cannot connect to the server, Check your internet network',
    };
  }

  const { response } = error;

  if (!response) {
    // Code to execute when there is no internet connection
    // notification.error({
    //   message: 'Problem connecting to server',
    //   description: 'Cannot connect to the server, Try again later',
    //   duration: 20,
    // });
    return {
      success: false,
      result: null,
      message: 'Cannot connect to the server, Contact your Account administrator',
    };
  }

  if (response && response.data && response.data.jwtExpired) {
    const result = window.localStorage.getItem('auth');
    const jsonFile = window.localStorage.getItem('isLogout');
    const { isLogout } = (jsonFile && JSON.parse(jsonFile)) || false;
    window.localStorage.removeItem('auth');
    window.localStorage.removeItem('isLogout');
    if (result || isLogout) {
      window.location.href = '/logout';
    }
  }

  if (response && response.status) {
    const rawMessage = response.data && response.data.message;
    const { status } = response;
    
    // Message Abstraction Logic
    let errorText = rawMessage || codeMessage[status];
    let title = 'Action Failed';

    if (rawMessage) {
      const lowerMsg = rawMessage.toLowerCase();
      if (lowerMsg.includes('e11000') || lowerMsg.includes('duplicate')) {
        errorText = 'This record already exists. Please use a unique value.';
      } else if (lowerMsg.includes('validation')) {
        errorText = 'Please ensure all required fields are correctly filled.';
      } else if (lowerMsg.includes('cast to objectid failed')) {
        errorText = 'The requested item could not be found or is invalid.';
      } else if (lowerMsg.includes('jwt') || lowerMsg.includes('token')) {
        errorText = 'Your session has expired. Please log in again.';
        title = 'Session Expired';
      } else if (status === 202) {
        errorText = 'Unable to save your changes at this time.';
        title = 'Could Not Save';
      } else if (status >= 500) {
        errorText = 'Oops! Something went wrong on our end. Please try again later.';
      }
    }

    notification.error({
      message: title,
      description: errorText,
      duration: 8,
    });

    if (response?.data?.error?.name === 'JsonWebTokenError') {
      window.localStorage.removeItem('auth');
      window.localStorage.removeItem('isLogout');
      window.location.href = '/logout';
    } else return response.data;
  } else {
    if (navigator.onLine) {
      // Code to execute when there is internet connection
      notification.error({
        message: 'Problem connecting to server',
        description: 'Cannot connect to the server, Try again later',
        duration: 15,
      });
      return {
        success: false,
        result: null,
        message: 'Cannot connect to the server, Contact your Account administrator',
      };
    } else {
      // Code to execute when there is no internet connection
      notification.error({
        message: 'No internet connection',
        description: 'Cannot connect to the Internet, Check your internet network',
        duration: 15,
      });
      return {
        success: false,
        result: null,
        message: 'Cannot connect to the server, Check your internet network',
      };
    }
  }
};

export default errorHandler;
