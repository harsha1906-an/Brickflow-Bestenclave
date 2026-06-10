const codeMessage = {
  200: 'Success! Your request was processed.',
  201: 'Successfully created or updated the record.',
  202: 'Your request is being processed in the background.',
  204: 'The record was successfully deleted.',
  400: 'We could not process your request. Please check the information provided.',
  401: 'Your session has expired or you do not have permission. Please log in again.',
  403: 'You do not have the required permissions to perform this action.',
  404: 'The requested record or page could not be found.',
  406: 'The requested format is not supported.',
  410: 'This resource has been permanently deleted and is no longer available.',
  422: 'There was a validation issue. Please ensure all required fields are correctly filled.',
  500: 'Oops! Something went wrong on our end. Please try again later.',
  502: 'We are experiencing a gateway issue. Please try again shortly.',
  503: 'The service is temporarily unavailable for maintenance or overload. Please try again later.',
  504: 'The request took too long. Please check your connection and try again.',
};

export default codeMessage;
