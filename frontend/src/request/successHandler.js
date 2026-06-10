import { notification } from '@/utils/antdGlobal';

import codeMessage from './codeMessage';

const successHandler = (response, options = { notifyOnSuccess: false, notifyOnFailed: true }) => {
  const { data } = response;
  if (data && data.success === true) {
    const rawMessage = response.data && data.message;
    let successText = rawMessage || codeMessage[response.status];
    
    if (rawMessage) {
      const lowerMsg = rawMessage.toLowerCase();
      if (lowerMsg.includes('success')) {
        successText = 'Your changes have been saved successfully!';
      }
    }

    if (options.notifyOnSuccess) {
      notification.success({
        message: `Success`,
        description: successText,
        duration: 3,
      });
    }
  } else {
    const rawMessage = response.data && data.message;
    const { status } = response;
    
    let errorText = rawMessage || codeMessage[status];
    let title = 'Action Failed';

    if (rawMessage) {
      const lowerMsg = rawMessage.toLowerCase();
      if (lowerMsg.includes('e11000') || lowerMsg.includes('duplicate')) {
        errorText = 'This record already exists. Please use a unique value.';
      } else if (lowerMsg.includes('validation')) {
        errorText = 'Please ensure all required fields are correctly filled.';
      } else if (status === 202) {
        errorText = 'Unable to save your changes at this time.';
        title = 'Could Not Save';
      }
    }

    if (options.notifyOnFailed) {
      notification.error({
        message: title,
        description: errorText,
        duration: 5,
      });
    }
  }
};

export default successHandler;
