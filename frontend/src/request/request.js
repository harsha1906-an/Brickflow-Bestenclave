import React from 'react';
import axios from 'axios';
import { Button } from 'antd';
import { notification } from '@/utils/antdGlobal';
import { API_BASE_URL } from '@/config/serverApiConfig';

import errorHandler from './errorHandler';
import successHandler from './successHandler';
import storePersist from '@/redux/storePersist';

const pendingDeletes = new Set();
const activeDeleteTimers = {};

const DeleteNotificationContent = () => {
  const [percent, setPercent] = React.useState(100);

  React.useEffect(() => {
    const startTime = Date.now();
    const duration = 10000;
    const interval = 50;

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remainingPercent = Math.max(0, 100 - (elapsed / duration) * 100);
      setPercent(remainingPercent);
      if (elapsed >= duration) {
        clearInterval(timer);
      }
    }, interval);

    return () => clearInterval(timer);
  }, []);

  return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
    React.createElement('span', null, 'The item has been deleted. You can undo this action within 10 seconds.'),
    React.createElement('div', {
      style: {
        width: '100%',
        height: '3px',
        backgroundColor: '#f0f0f0',
        borderRadius: '2px',
        overflow: 'hidden'
      }
    },
      React.createElement('div', {
        style: {
          width: `${percent}%`,
          height: '100%',
          backgroundColor: '#1890ff',
          transition: 'width 50ms linear'
        }
      })
    )
  );
};

function filterPendingDeletes(data) {
  if (!data) return data;
  if (Array.isArray(data)) {
    return data.filter(item => !item || !pendingDeletes.has(item._id));
  }
  if (data.result) {
    data.result = filterPendingDeletes(data.result);
  }
  return data;
}

// Create a custom axios instance
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'ngrok-skip-browser-warning': 'true',
  },
});

// Add a request interceptor to inject the token
axiosInstance.interceptors.request.use(
  (config) => {
    const auth = storePersist.get('auth');
    if (auth && auth.current && auth.current.token) {
      config.headers['Authorization'] = `Bearer ${auth.current.token}`;
    }
    
    const currentCompany = window.localStorage.getItem('currentCompany');
    if (currentCompany) {
      config.headers['x-tenant-id'] = currentCompany;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

const request = {
  create: async ({ entity, jsonData }) => {
    try {
      const response = await axiosInstance.post(entity + '/create', jsonData);
      successHandler(response, {
        notifyOnSuccess: true,
        notifyOnFailed: true,
      });
      return response.data;
    } catch (error) {
      return errorHandler(error);
    }
  },
  createAndUpload: async ({ entity, jsonData }) => {
    try {
      const response = await axiosInstance.post(entity + '/create', jsonData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      successHandler(response, {
        notifyOnSuccess: true,
        notifyOnFailed: true,
      });
      return response.data;
    } catch (error) {
      return errorHandler(error);
    }
  },
  read: async ({ entity, id }) => {
    try {
      const response = await axiosInstance.get(entity + '/read/' + id);
      successHandler(response, {
        notifyOnSuccess: false,
        notifyOnFailed: true,
      });
      return filterPendingDeletes(response.data);
    } catch (error) {
      return errorHandler(error);
    }
  },
  update: async ({ entity, id, jsonData }) => {
    try {
      const response = await axiosInstance.patch(entity + '/update/' + id, jsonData);
      successHandler(response, {
        notifyOnSuccess: true,
        notifyOnFailed: true,
      });
      return response.data;
    } catch (error) {
      return errorHandler(error);
    }
  },
  updateAndUpload: async ({ entity, id, jsonData }) => {
    try {
      const response = await axiosInstance.patch(entity + '/update/' + id, jsonData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      successHandler(response, {
        notifyOnSuccess: true,
        notifyOnFailed: true,
      });
      return response.data;
    } catch (error) {
      return errorHandler(error);
    }
  },

  delete: async ({ entity, id }) => {
    // 1. Add to pending deletes so it is hidden in lists
    pendingDeletes.add(id);

    // 2. Setup the deferred deletion
    const deletePromise = new Promise((resolve) => {
      const timer = setTimeout(async () => {
        // Clear active timer record
        delete activeDeleteTimers[id];
        
        try {
          // Perform the actual API call
          const response = await axiosInstance.delete(entity + '/delete/' + id);
          
          // Remove from pending deletes after database deletion
          pendingDeletes.delete(id);
          
          successHandler(response, {
            notifyOnSuccess: true,
            notifyOnFailed: true,
          });
          resolve(response.data);
        } catch (error) {
          pendingDeletes.delete(id);
          resolve(errorHandler(error));
        }
      }, 10000); // 10 seconds

      activeDeleteTimers[id] = {
        timer,
        cancel: () => {
          clearTimeout(timer);
          pendingDeletes.delete(id);
          delete activeDeleteTimers[id];
          resolve({ success: false, cancelled: true });
        }
      };
    });

    // 3. Show notification with Undo button (using React.createElement to avoid JSX in .js)
    const key = `delete-${id}`;
    notification.open({
      key,
      message: 'Item Deleted',
      description: React.createElement(DeleteNotificationContent),
      duration: 10,
      btn: React.createElement(Button, {
        type: 'primary',
        size: 'small',
        onClick: () => {
          if (activeDeleteTimers[id]) {
            activeDeleteTimers[id].cancel();
          }
          notification.destroy(key);
          window.dispatchEvent(new CustomEvent('undo-delete-refresh'));
        }
      }, 'Undo'),
      onClose: () => {
        // Closed naturally
      }
    });

    // 4. Resolve immediately so the frontend UI re-fetches and hides the item
    return { success: true, result: { _id: id } };
  },

  filter: async ({ entity, options = {} }) => {
    try {
      let filter = options.filter ? 'filter=' + options.filter : '';
      let equal = options.equal ? '&equal=' + options.equal : '';
      let query = `?${filter}${equal}`;

      const response = await axiosInstance.get(entity + '/filter' + query);
      successHandler(response, {
        notifyOnSuccess: false,
        notifyOnFailed: false,
      });
      return filterPendingDeletes(response.data);
    } catch (error) {
      return errorHandler(error);
    }
  },

  search: async ({ entity, options = {} }) => {
    try {
      let query = '?';
      for (var key in options) {
        query += key + '=' + options[key] + '&';
      }
      query = query.slice(0, -1);
      // headersInstance.cancelToken = source.token;
      const response = await axiosInstance.get(entity + '/search' + query);

      successHandler(response, {
        notifyOnSuccess: false,
        notifyOnFailed: false,
      });
      return filterPendingDeletes(response.data);
    } catch (error) {
      return errorHandler(error);
    }
  },

  list: async ({ entity, options = {} }) => {
    try {
      let query = '?';
      for (var key in options) {
        query += key + '=' + options[key] + '&';
      }
      query = query.slice(0, -1);

      const response = await axiosInstance.get(entity + '/list' + query);

      successHandler(response, {
        notifyOnSuccess: false,
        notifyOnFailed: false,
      });
      return filterPendingDeletes(response.data);
    } catch (error) {
      return errorHandler(error);
    }
  },
  listAll: async ({ entity, options = {} }) => {
    try {
      let query = '?';
      for (var key in options) {
        query += key + '=' + options[key] + '&';
      }
      query = query.slice(0, -1);

      const response = await axiosInstance.get(entity + '/listAll' + query);

      successHandler(response, {
        notifyOnSuccess: false,
        notifyOnFailed: false,
      });
      return filterPendingDeletes(response.data);
    } catch (error) {
      return errorHandler(error);
    }
  },

  post: async ({ entity, jsonData }) => {
    try {
      const response = await axiosInstance.post(entity, jsonData);

      return response.data;
    } catch (error) {
      return errorHandler(error);
    }
  },
  get: async ({ entity }) => {
    try {
      const response = await axiosInstance.get(entity);
      return filterPendingDeletes(response.data);
    } catch (error) {
      return errorHandler(error);
    }
  },
  patch: async ({ entity, jsonData }) => {
    try {
      const response = await axiosInstance.patch(entity, jsonData);
      successHandler(response, {
        notifyOnSuccess: true,
        notifyOnFailed: true,
      });
      return response.data;
    } catch (error) {
      return errorHandler(error);
    }
  },

  upload: async ({ entity, id, jsonData }) => {
    try {
      const response = await axiosInstance.patch(entity + '/upload/' + id, jsonData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      successHandler(response, {
        notifyOnSuccess: true,
        notifyOnFailed: true,
      });
      return response.data;
    } catch (error) {
      return errorHandler(error);
    }
  },

  source: () => {
    const CancelToken = axios.CancelToken;
    const source = CancelToken.source();
    return source;
  },

  summary: async ({ entity, options = {} }) => {
    try {
      let query = '?';
      for (var key in options) {
        query += key + '=' + options[key] + '&';
      }
      query = query.slice(0, -1);
      const response = await axiosInstance.get(entity + '/summary' + query);

      successHandler(response, {
        notifyOnSuccess: false,
        notifyOnFailed: false,
      });

      return response.data;
    } catch (error) {
      return errorHandler(error);
    }
  },

  mail: async ({ entity, jsonData }) => {
    try {
      const response = await axiosInstance.post(entity + '/mail/', jsonData);
      successHandler(response, {
        notifyOnSuccess: true,
        notifyOnFailed: true,
      });
      return response.data;
    } catch (error) {
      return errorHandler(error);
    }
  },

  convert: async ({ entity, id, jsonData }) => {
    try {
      let response;
      if (jsonData) {
        response = await axiosInstance.post(`${entity}/convert/${id}`, jsonData);
      } else {
        response = await axiosInstance.get(`${entity}/convert/${id}`);
      }
      successHandler(response, {
        notifyOnSuccess: true,
        notifyOnFailed: true,
      });
      return response.data;
    } catch (error) {
      return errorHandler(error);
    }
  },

  download: async ({ entity, options = {} }) => {
    try {
      let query = '?';
      for (var key in options) {
        query += key + '=' + options[key] + '&';
      }
      query = query.slice(0, -1);

      const response = await axiosInstance.get(entity + '/downloadReport' + query, {
        responseType: 'blob',
      });
      return response;
    } catch (error) {
      errorHandler(error);
      throw error;
    }
  },
  pdf: async ({ entity, options = {} }) => {
    try {
      let query = '?';
      for (var key in options) {
        query += key + '=' + options[key] + '&';
      }
      query = query.slice(0, -1);

      const response = await axiosInstance.get(entity + query, {
        responseType: 'blob',
      });
      return response;
    } catch (error) {
      errorHandler(error);
      throw error;
    }
  },
};
export default request;
