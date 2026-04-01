import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  User, Client, Prospec, Produit, Categorie,
  Commande, LigneCommande, Facture, Paiement, Interaction,
  Rapport
} from '@/types';
import { api } from '@/services/api';

// Data State
interface DataState {
  users: User[];
  clients: Client[];
  prospects: Prospec[];
  produits: Produit[];
  categories: Categorie[];
  commandes: Commande[];
  lignesCommande: LigneCommande[];
  factures: Facture[];
  paiements: Paiement[];
  interactions: Interaction[];
  rapports: Rapport[];
  loading: boolean;
  error: string | null;
}

// Actions
interface DataActions {
  // Loading/Error
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Fetch data from backend
  fetchUsers: () => Promise<void>;
  fetchClients: () => Promise<void>;
  fetchProspects: () => Promise<void>;
  fetchProducts: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchOrders: () => Promise<void>;
  fetchOrderLines: () => Promise<void>;
  fetchInvoices: () => Promise<void>;
  fetchInteractions: () => Promise<void>;
  fetchReports: () => Promise<void>;
  
  // Users
  addUser: (user: any) => Promise<void>;
  updateUser: (id: string, user: any) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  
  // Clients
  addClient: (client: any) => Promise<void>;
  updateClient: (id: string, client: any) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  
  // Prospects
  addProspect: (prospect: any) => Promise<void>;
  updateProspect: (id: string, prospect: any) => Promise<void>;
  deleteProspect: (id: string) => Promise<void>;
  convertProspectToClient: (id: string, data: { adresse: string; type: any }) => Promise<void>;
  
  // Products
  addProduit: (produit: any) => Promise<void>;
  updateProduit: (id: string, produit: any) => Promise<void>;
  deleteProduit: (id: string) => Promise<void>;
  
  // Categories
  addCategorie: (categorie: any) => Promise<void>;
  updateCategorie: (id: string, categorie: any) => Promise<void>;
  deleteCategorie: (id: string) => Promise<void>;
  
  // Commandes
  addCommande: (commande: any) => Promise<void>;
  updateCommande: (id: string, commande: any) => Promise<void>;
  deleteCommande: (id: string) => Promise<void>;
  
  // Factures
  addFacture: (facture: any) => Promise<void>;
  updateFacture: (id: string, facture: any) => Promise<void>;
  deleteFacture: (id: string) => Promise<void>;
  addPaiement: (paiement: any) => Promise<void>;
  sendInvoiceReminder: (id: string) => Promise<void>;
  
  // Interactions
  addInteraction: (interaction: any) => Promise<void>;
  updateInteraction: (id: string, interaction: any) => Promise<void>;
  deleteInteraction: (id: string) => Promise<void>;
  
  // Rapports
  addRapport: (rapport: any) => Promise<void>;
}

// Combined Store
export const useStore = create<DataState & DataActions>()(
  persist(
    (set) => ({
      // Initial State
      users: [],
      clients: [],
      prospects: [],
      produits: [],
      categories: [],
      commandes: [],
      lignesCommande: [],
      factures: [],
      paiements: [],
      interactions: [],
      rapports: [],
      loading: false,
      error: null,

      // Loading/Error
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),

      // Fetch data from backend
      fetchUsers: async () => {
        try {
          set({ loading: true, error: null });
          const users = await api.getUsers();
          set({ users, loading: false });
        } catch (error: any) {
          set({ error: error.message, loading: false });
        }
      },

      fetchClients: async () => {
        try {
          set({ loading: true, error: null });
          const clients = await api.getClients();
          set({ clients, loading: false });
        } catch (error: any) {
          set({ error: error.message, loading: false });
        }
      },

      fetchProspects: async () => {
        try {
          set({ loading: true, error: null });
          const prospects = await api.getProspects();
          set({ prospects, loading: false });
        } catch (error: any) {
          set({ error: error.message, loading: false });
        }
      },

      fetchProducts: async () => {
        try {
          set({ loading: true, error: null });
          const produits = await api.getProducts();
          set({ produits, loading: false });
        } catch (error: any) {
          set({ error: error.message, loading: false });
        }
      },

      fetchCategories: async () => {
        try {
          set({ loading: true, error: null });
          const categories = await api.getCategories();
          set({ categories, loading: false });
        } catch (error: any) {
          set({ error: error.message, loading: false });
        }
      },

      fetchOrders: async () => {
        try {
          set({ loading: true, error: null });
          const commandes = await api.getOrders();
          const lignesCommande = (
            await Promise.all(commandes.map((commande) => api.getOrderLines(commande.id)))
          ).flat();
          set({ commandes, lignesCommande, loading: false });
        } catch (error: any) {
          set({ error: error.message, loading: false });
        }
      },

      fetchOrderLines: async () => {
        try {
          set({ loading: true, error: null });
          const commandes = useStore.getState().commandes;
          const lignesCommande = (
            await Promise.all(commandes.map((commande) => api.getOrderLines(commande.id)))
          ).flat();
          set({ lignesCommande, loading: false });
        } catch (error: any) {
          set({ error: error.message, loading: false });
        }
      },

      fetchInvoices: async () => {
        try {
          set({ loading: true, error: null });
          const factures = await api.getInvoices();
          set({ factures, loading: false });
        } catch (error: any) {
          set({ error: error.message, loading: false });
        }
      },

      fetchInteractions: async () => {
        try {
          set({ loading: true, error: null });
          const interactions = await api.getInteractions();
          set({ interactions, loading: false });
        } catch (error: any) {
          set({ error: error.message, loading: false });
        }
      },

      fetchReports: async () => {
        try {
          set({ loading: true, error: null });
          const rapports = await api.getReports();
          set({ rapports, loading: false });
        } catch (error: any) {
          set({ error: error.message, loading: false });
        }
      },

      // User Actions
      addUser: async (user) => {
        try {
          set({ loading: true, error: null });
          const newUser = await api.createUser(user);
          set((state) => ({ users: [...state.users, newUser], loading: false }));
        } catch (error: any) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      updateUser: async (id, user) => {
        try {
          set({ loading: true, error: null });
          const updatedUser = await api.updateUser(id, user);
          set((state) => ({
            users: state.users.map((u) => (u.id === id ? updatedUser : u)),
            loading: false,
          }));
        } catch (error: any) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      deleteUser: async (id) => {
        try {
          set({ loading: true, error: null });
          await api.deleteUser(id);
          set((state) => ({ users: state.users.filter((u) => u.id !== id), loading: false }));
        } catch (error: any) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      // Client Actions
      addClient: async (client) => {
        try {
          set({ loading: true, error: null });
          const newClient = await api.createClient(client);
          set((state) => ({ clients: [...state.clients, newClient], loading: false }));
        } catch (error: any) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      updateClient: async (id, client) => {
        try {
          set({ loading: true, error: null });
          const updatedClient = await api.updateClient(id, client);
          set((state) => ({
            clients: state.clients.map((c) => (c.id === id ? updatedClient : c)),
            loading: false,
          }));
        } catch (error: any) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      deleteClient: async (id) => {
        try {
          set({ loading: true, error: null });
          await api.deleteClient(id);
          set((state) => ({ clients: state.clients.filter((c) => c.id !== id), loading: false }));
        } catch (error: any) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      // Prospect Actions
      addProspect: async (prospect) => {
        try {
          set({ loading: true, error: null });
          const newProspect = await api.createProspect(prospect);
          set((state) => ({ prospects: [...state.prospects, newProspect], loading: false }));
        } catch (error: any) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      updateProspect: async (id, prospect) => {
        try {
          set({ loading: true, error: null });
          const updatedProspect = await api.updateProspect(id, prospect);
          set((state) => ({
            prospects: state.prospects.map((p) => (p.id === id ? updatedProspect : p)),
            loading: false,
          }));
        } catch (error: any) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      deleteProspect: async (id) => {
        try {
          set({ loading: true, error: null });
          await api.deleteProspect(id);
          set((state) => ({ prospects: state.prospects.filter((p) => p.id !== id), loading: false }));
        } catch (error: any) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      convertProspectToClient: async (id, data) => {
        try {
          set({ loading: true, error: null });
          const state = useStore.getState();
          const prospect = state.prospects.find((p) => p.id === id);
          if (!prospect) {
            throw new Error('Prospect introuvable');
          }

          const newClient = await api.convertProspectToClient(id, {
            nom: prospect.nom,
            prenom: prospect.prenom,
            email: prospect.email,
            telephone: prospect.telephone,
            entreprise: prospect.entreprise || '',
            adresse: data.adresse,
            type: data.type,
          });

          set((s) => ({
            clients: [...s.clients, newClient],
            prospects: s.prospects.filter((p) => p.id !== id),
            loading: false,
          }));
        } catch (error: any) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      // Product Actions
      addProduit: async (produit) => {
        try {
          set({ loading: true, error: null });
          const newProduit = await api.createProduct(produit);
          set((state) => ({ produits: [...state.produits, newProduit], loading: false }));
        } catch (error: any) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      updateProduit: async (id, produit) => {
        try {
          set({ loading: true, error: null });
          const updatedProduit = await api.updateProduct(id, produit);
          set((state) => ({
            produits: state.produits.map((p) => (p.id === id ? updatedProduit : p)),
            loading: false,
          }));
        } catch (error: any) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      deleteProduit: async (id) => {
        try {
          set({ loading: true, error: null });
          await api.deleteProduct(id);
          set((state) => ({ produits: state.produits.filter((p) => p.id !== id), loading: false }));
        } catch (error: any) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      // Category Actions
      addCategorie: async (categorie) => {
        try {
          set({ loading: true, error: null });
          const newCategorie = await api.createCategory(categorie);
          set((state) => ({ categories: [...state.categories, newCategorie], loading: false }));
        } catch (error: any) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      updateCategorie: async (id, categorie) => {
        try {
          set({ loading: true, error: null });
          const updatedCategorie = await api.updateCategory(id, categorie);
          set((state) => ({
            categories: state.categories.map((c) => (c.id === id ? updatedCategorie : c)),
            loading: false,
          }));
        } catch (error: any) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      deleteCategorie: async (id) => {
        try {
          set({ loading: true, error: null });
          await api.deleteCategory(id);
          set((state) => ({ categories: state.categories.filter((c) => c.id !== id), loading: false }));
        } catch (error: any) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      // Commande Actions
      addCommande: async (commande) => {
        try {
          set({ loading: true, error: null });
          const newCommande = await api.createOrder(commande);
          const lignesCommande = await api.getOrderLines(newCommande.id);
          set((state) => ({
            commandes: [...state.commandes, newCommande],
            lignesCommande: [...state.lignesCommande, ...lignesCommande],
            loading: false,
          }));
        } catch (error: any) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      updateCommande: async (id, commande) => {
        try {
          set({ loading: true, error: null });
          const updatedCommande = await api.updateOrder(id, commande);
          set((state) => ({
            commandes: state.commandes.map((c) => (c.id === id ? updatedCommande : c)),
            loading: false,
          }));
        } catch (error: any) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      deleteCommande: async (id) => {
        try {
          set({ loading: true, error: null });
          await api.deleteOrder(id);
          set((state) => ({
            commandes: state.commandes.filter((c) => c.id !== id),
            lignesCommande: state.lignesCommande.filter((ligne) => ligne.commandeId !== id),
            loading: false,
          }));
        } catch (error: any) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      // Facture Actions
      addFacture: async (facture) => {
        try {
          set({ loading: true, error: null });
          const newFacture = await api.createInvoice(facture);
          set((state) => ({ factures: [...state.factures, newFacture], loading: false }));
        } catch (error: any) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      updateFacture: async (id, facture) => {
        try {
          set({ loading: true, error: null });
          const updatedFacture = await api.updateInvoice(id, facture);
          set((state) => ({
            factures: state.factures.map((f) => (f.id === id ? updatedFacture : f)),
            loading: false,
          }));
        } catch (error: any) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      deleteFacture: async (id) => {
        try {
          set({ loading: true, error: null });
          await api.deleteInvoice(id);
          set((state) => ({ factures: state.factures.filter((f) => f.id !== id), loading: false }));
        } catch (error: any) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      addPaiement: async (paiement) => {
        try {
          set({ loading: true, error: null });
          const newPaiement = await api.createPayment(paiement);
          set((state) => ({ paiements: [...state.paiements, newPaiement], loading: false }));
        } catch (error: any) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      sendInvoiceReminder: async (id) => {
        try {
          set({ loading: true, error: null });
          await api.sendInvoiceReminder(id);
          set({ loading: false });
        } catch (error: any) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      // Interaction Actions
      addInteraction: async (interaction) => {
        try {
          set({ loading: true, error: null });
          const newInteraction = await api.createInteraction(interaction);
          set((state) => ({ interactions: [...state.interactions, newInteraction], loading: false }));
        } catch (error: any) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      updateInteraction: async (id, interaction) => {
        try {
          set({ loading: true, error: null });
          const updatedInteraction = await api.updateInteraction(id, interaction);
          set((state) => ({
            interactions: state.interactions.map((i) => (i.id === id ? updatedInteraction : i)),
            loading: false,
          }));
        } catch (error: any) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      deleteInteraction: async (id) => {
        try {
          set({ loading: true, error: null });
          await api.deleteInteraction(id);
          set((state) => ({ interactions: state.interactions.filter((i) => i.id !== id), loading: false }));
        } catch (error: any) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      // Rapport Actions
      addRapport: async (rapport) => {
        try {
          set({ loading: true, error: null });
          const newRapport = await api.createReport(rapport);
          set((state) => ({ rapports: [...state.rapports, newRapport], loading: false }));
        } catch (error: any) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },
    }),
    {
      name: 'erp-crm-storage',
    }
  )
);
