const API_BASE_URL = '/api/v1';

class ApiClient {
  constructor() {
    this.tokenGetter = null;
  }

  setTokenGetter(getter) {
    this.tokenGetter = getter;
  }

  async getToken() {
    if (this.tokenGetter) {
      try {
        const token = await this.tokenGetter();
        if (token) return token;
      } catch (e) {
        // Fall through to localStorage
      }
    }
    return localStorage.getItem('royal_wedding_token');
  }

  async request(endpoint, options = {}) {
    const token = await this.getToken();
    const headers = {
      ...(options.headers || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const config = {
      ...options,
      headers,
    };

    const url = endpoint.startsWith('http')
      ? endpoint
      : endpoint.startsWith(API_BASE_URL)
        ? endpoint
        : `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, config);

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMessage = data?.error || data?.message || `Request failed with status ${response.status}`;
      const err = new Error(errorMessage);
      err.status = response.status;
      err.data = data;
      throw err;
    }

    return data;
  }

  get(endpoint, params = {}) {
    const cleanEndpoint = endpoint.startsWith(API_BASE_URL) ? endpoint.slice(API_BASE_URL.length) : endpoint;
    const url = new URL(cleanEndpoint.startsWith('http') ? cleanEndpoint : `${window.location.origin}${API_BASE_URL}${cleanEndpoint}`);
    Object.keys(params).forEach((key) => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        url.searchParams.append(key, params[key]);
      }
    });
    return this.request(url.pathname + url.search, { method: 'GET' });
  }

  post(endpoint, body = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  }

  put(endpoint, body = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  patch(endpoint, body = {}) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  // Upload with progress simulation / callback
  async uploadPhotos(weddingId, formData, onProgress) {
    const token = await this.getToken();
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE_URL}/weddings/${weddingId}/photos/upload`);

      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent);
          }
        };
      }

      xhr.onload = () => {
        try {
          const res = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(res);
          } else {
            reject(new Error(res.error || 'Upload failed'));
          }
        } catch (e) {
          reject(new Error('Invalid response from server'));
        }
      };

      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.send(formData);
    });
  }
}

export const api = new ApiClient();
