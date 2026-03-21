# Frontend Integration Guide

This guide explains how to connect your React frontend to the FastAPI backend.

## Quick Setup

### 1. Update Frontend API Configuration

Create a new file `app/src/config/api.ts`:

```typescript
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login',
  ME: '/auth/me',
  
  // Users
  USERS: '/users',
  
  // Clients
  CLIENTS: '/clients',
  
  // Prospects
  PROSPECTS: '/prospects',
  CONVERT_PROSPECT: (id: string) => `/prospects/${id}/convert`,
  
  // Products
  PRODUCTS: '/products',
  CATEGORIES: '/products/categories',
  
  // Orders
  ORDERS: '/orders',
  ORDER_LINES: (id: string) => `/orders/${id}/lines`,
  
  // Invoices
  INVOICES: '/invoices',
  INVOICE_PAYMENTS: (id: string) => `/invoices/${id}/payments`,
  PAYMENTS: '/invoices/payments',
  
  // Interactions & Reports
  INTERACTIONS: '/interactions',
  REPORTS: '/reports',
  
  // Dashboard
  KPIS: '/dashboard/kpis',
  MONTHLY_SALES: '/dashboard/ventes-mensuelles',
  POPULAR_PRODUCTS: '/dashboard/produits-populaires',
  EMPLOYEE_PERFORMANCE: '/dashboard/performance-employes',
};
```

### 2. Create API Service

Create `app/src/services/api.ts`:

```typescript
import axios from 'axios';
import { API_BASE_URL } from '@/config/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('access_token');
      window.location.href = '/#/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

### 3. Update Authentication Store

Modify `app/src/store/index.ts` to integrate with backend:

```typescript
import api from '@/services/api';
import { API_ENDPOINTS } from '@/config/api';

// Update login function
login: async (email: string, password: string) => {
  try {
    const response = await api.post(API_ENDPOINTS.LOGIN, { email, password });
    const { access_token } = response.data;
    
    // Store token
    localStorage.setItem('access_token', access_token);
    
    // Get user info
    const userResponse = await api.get(API_ENDPOINTS.ME);
    const user = userResponse.data;
    
    set({ currentUser: user, isAuthenticated: true });
    return true;
  } catch (error) {
    console.error('Login failed:', error);
    return false;
  }
},

logout: () => {
  localStorage.removeItem('access_token');
  set({ currentUser: null, isAuthenticated: false });
},
```

### 4. Update Data Fetching

Replace Zustand state management with API calls. Example for clients:

```typescript
// Instead of storing in Zustand
const clients = useStore((state) => state.clients);

// Fetch from API
import { useEffect, useState } from 'react';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/config/api';

function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await api.get(API_ENDPOINTS.CLIENTS);
      setClients(response.data);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const createClient = async (clientData) => {
    try {
      await api.post(API_ENDPOINTS.CLIENTS, clientData);
      fetchClients(); // Refresh list
      toast.success('Client created successfully');
    } catch (error) {
      toast.error('Error creating client');
    }
  };

  const updateClient = async (id, clientData) => {
    try {
      await api.put(`${API_ENDPOINTS.CLIENTS}/${id}`, clientData);
      fetchClients(); // Refresh list
      toast.success('Client updated successfully');
    } catch (error) {
      toast.error('Error updating client');
    }
  };

  const deleteClient = async (id) => {
    try {
      await api.delete(`${API_ENDPOINTS.CLIENTS}/${id}`);
      fetchClients(); // Refresh list
      toast.success('Client deleted successfully');
    } catch (error) {
      toast.error('Error deleting client');
    }
  };

  // ... rest of component
}
```

### 5. Update Environment Variables

Create `app/.env`:

```env
VITE_API_URL=http://localhost:8000/api
```

### 6. Update ID Fields

The backend uses MongoDB ObjectIDs (strings) instead of numeric IDs. Update your types:

```typescript
// In app/src/types/index.ts
export interface BaseEntity {
  id: string; // Changed from number to string
  dateCreation: string;
}
```

### 7. Handle API Response Format

The backend returns dates as ISO strings. Update your date handling:

```typescript
// Before
dateCreation: new Date().toISOString()

// After - dates are already ISO strings from API
dateCreation: response.data.dateCreation
```

## Migration Strategy

### Option 1: Gradual Migration
1. Keep Zustand store for now
2. Replace mock data with API calls one page at a time
3. Update login/auth first
4. Then update each CRUD page

### Option 2: Complete Rewrite
1. Remove Zustand persistence
2. Use React Query or SWR for data fetching
3. Update all pages at once

## Using React Query (Recommended)

For better data management, consider React Query:

```bash
npm install @tanstack/react-query
```

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/config/api';

// In your component
function ClientsPage() {
  const queryClient = useQueryClient();

  // Fetch clients
  const { data: clients, isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const response = await api.get(API_ENDPOINTS.CLIENTS);
      return response.data;
    },
  });

  // Create client mutation
  const createMutation = useMutation({
    mutationFn: (clientData) => api.post(API_ENDPOINTS.CLIENTS, clientData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Client created');
    },
  });

  // Delete client mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`${API_ENDPOINTS.CLIENTS}/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Client deleted');
    },
  });

  // ... rest of component
}
```

## Testing the Connection

1. Start the backend:
   ```bash
   cd backend
   uvicorn app.main:app --reload
   ```

2. Start the frontend:
   ```bash
   cd app
   npm run dev
   ```

3. Login with test credentials:
   - Email: `admin@ragchat.com`
   - Password: `admin123`

4. Check browser console for API calls
5. Verify data is loading from backend

## Troubleshooting

### CORS Errors
If you see CORS errors, ensure `BACKEND_CORS_ORIGINS` in backend `.env` includes your frontend URL:
```env
BACKEND_CORS_ORIGINS=["http://localhost:5173"]
```

### Authentication Issues
- Check if token is being stored: `localStorage.getItem('access_token')`
- Verify token is being sent in headers
- Check backend logs for authentication errors

### 404 Errors
- Verify API_BASE_URL is correct
- Check endpoint paths match backend routes
- Ensure backend is running

### Data Format Issues
- Backend uses string IDs (MongoDB ObjectIDs), not numbers
- Dates are ISO strings
- Check response format in browser Network tab

## Next Steps

1. Replace Zustand with React Query for better caching
2. Add loading states and error handling
3. Implement optimistic updates
4. Add request cancellation
5. Implement pagination for large datasets

## Additional Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Axios Documentation](https://axios-http.com/)