// API Service for connecting frontend to backend
import type {
  User,
  Client,
  Prospec,
  Produit,
  Categorie,
  Commande,
  Facture,
  Paiement,
  Interaction,
  Rapport,
  AssistantResponse,
} from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('authToken') ?? sessionStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options?.headers,
      },
    });

    // Handle 401 Unauthorized - redirect to login
    if (response.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      sessionStorage.removeItem('authToken');
      sessionStorage.removeItem('user');
      window.location.href = '/#/login';
      throw new Error('Session expired. Please login again.');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'An error occurred' }));
      throw new Error(error.detail || `HTTP error! status: ${response.status}`);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return null as T;
    }

    return response.json();
  }

  // Users
  async getUsers(): Promise<User[]> {
    return this.request<User[]>('/users');
  }

  async createUser(user: any): Promise<User> {
    return this.request<User>('/users', {
      method: 'POST',
      body: JSON.stringify(user),
    });
  }

  async updateUser(id: string, user: any): Promise<User> {
    return this.request<User>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(user),
    });
  }

  async deleteUser(id: string): Promise<void> {
    return this.request<void>(`/users/${id}`, {
      method: 'DELETE',
    });
  }

  // Clients
  async getClients(): Promise<Client[]> {
    return this.request<Client[]>('/clients');
  }

  async getClient(id: string): Promise<Client> {
    return this.request<Client>(`/clients/${id}`);
  }

  async createClient(client: any): Promise<Client> {
    return this.request<Client>('/clients', {
      method: 'POST',
      body: JSON.stringify(client),
    });
  }

  async updateClient(id: string, client: any): Promise<Client> {
    return this.request<Client>(`/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(client),
    });
  }

  async deleteClient(id: string): Promise<void> {
    return this.request<void>(`/clients/${id}`, {
      method: 'DELETE',
    });
  }

  // Prospects
  async getProspects(): Promise<Prospec[]> {
    return this.request<Prospec[]>('/prospects');
  }

  async createProspect(prospect: any): Promise<Prospec> {
    return this.request<Prospec>('/prospects', {
      method: 'POST',
      body: JSON.stringify(prospect),
    });
  }

  async updateProspect(id: string, prospect: any): Promise<Prospec> {
    return this.request<Prospec>(`/prospects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(prospect),
    });
  }

  async deleteProspect(id: string): Promise<void> {
    return this.request<void>(`/prospects/${id}`, {
      method: 'DELETE',
    });
  }

  async convertProspectToClient(id: string, clientData: any): Promise<Client> {
    return this.request<Client>(`/prospects/${id}/convert`, {
      method: 'POST',
      body: JSON.stringify(clientData),
    });
  }

  // Products
  async getProducts(): Promise<Produit[]> {
    return this.request<Produit[]>('/products');
  }

  async createProduct(product: any): Promise<Produit> {
    return this.request<Produit>('/products', {
      method: 'POST',
      body: JSON.stringify(product),
    });
  }

  async updateProduct(id: string, product: any): Promise<Produit> {
    return this.request<Produit>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(product),
    });
  }

  async deleteProduct(id: string): Promise<void> {
    return this.request<void>(`/products/${id}`, {
      method: 'DELETE',
    });
  }

  // Categories
  async getCategories(): Promise<Categorie[]> {
    return this.request<Categorie[]>('/products/categories');
  }

  async createCategory(category: any): Promise<Categorie> {
    return this.request<Categorie>('/products/categories', {
      method: 'POST',
      body: JSON.stringify(category),
    });
  }

  async updateCategory(id: string, category: any): Promise<Categorie> {
    return this.request<Categorie>(`/products/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(category),
    });
  }

  async deleteCategory(id: string): Promise<void> {
    return this.request<void>(`/products/categories/${id}`, {
      method: 'DELETE',
    });
  }

  // Orders
  async getOrders(): Promise<Commande[]> {
    return this.request<Commande[]>('/orders');
  }

  async createOrder(order: any): Promise<Commande> {
    return this.request<Commande>('/orders', {
      method: 'POST',
      body: JSON.stringify(order),
    });
  }

  async updateOrder(id: string, order: any): Promise<Commande> {
    return this.request<Commande>(`/orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(order),
    });
  }

  async deleteOrder(id: string): Promise<void> {
    return this.request<void>(`/orders/${id}`, {
      method: 'DELETE',
    });
  }

  // Invoices
  async getInvoices(): Promise<Facture[]> {
    return this.request<Facture[]>('/invoices');
  }

  async createInvoice(invoice: any): Promise<Facture> {
    return this.request<Facture>('/invoices', {
      method: 'POST',
      body: JSON.stringify(invoice),
    });
  }

  async updateInvoice(id: string, invoice: any): Promise<Facture> {
    return this.request<Facture>(`/invoices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(invoice),
    });
  }

  async deleteInvoice(id: string): Promise<void> {
    return this.request<void>(`/invoices/${id}`, {
      method: 'DELETE',
    });
  }

  async sendInvoiceReminder(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/invoices/${id}/send-reminder`, {
      method: 'POST',
    });
  }

  async getPayments(): Promise<Paiement[]> {
    return this.request<Paiement[]>('/invoices/payments');
  }

  async createPayment(payment: any): Promise<Paiement> {
    return this.request<Paiement>('/invoices/payments', {
      method: 'POST',
      body: JSON.stringify(payment),
    });
  }

  // Interactions
  async getInteractions(): Promise<Interaction[]> {
    return this.request<Interaction[]>('/interactions');
  }

  async createInteraction(interaction: any): Promise<Interaction> {
    return this.request<Interaction>('/interactions', {
      method: 'POST',
      body: JSON.stringify(interaction),
    });
  }

  async updateInteraction(id: string, interaction: any): Promise<Interaction> {
    return this.request<Interaction>(`/interactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(interaction),
    });
  }

  async deleteInteraction(id: string): Promise<void> {
    return this.request<void>(`/interactions/${id}`, {
      method: 'DELETE',
    });
  }

  // Reports
  async getReports(): Promise<Rapport[]> {
    return this.request<Rapport[]>('/reports');
  }

  async createReport(report: any): Promise<Rapport> {
    return this.request<Rapport>('/reports', {
      method: 'POST',
      body: JSON.stringify(report),
    });
  }

  // Dashboard
  async getDashboardStats() {
    return this.request('/dashboard/stats');
  }

  async getDashboardCharts() {
    return this.request('/dashboard/charts');
  }

  async getRecentActivities() {
    return this.request('/dashboard/recent-activities');
  }

  async getTopProducts() {
    return this.request('/dashboard/top-products');
  }

  // Assistant — fixed endpoint from /assistant/ask to /assistant/sales_forecast
  async askAssistant(question: string, history?: { role: string; content: string }[]): Promise<AssistantResponse> {
    return this.request<AssistantResponse>('/assistant/sales_forecast', {
      method: 'POST',
      body: JSON.stringify({ question, history: history ?? [] }),
    });
  }
}

export const api = new ApiService(API_BASE_URL);