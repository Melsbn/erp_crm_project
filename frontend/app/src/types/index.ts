// Enums as const objects for compatibility
export const StatutCommande = {
  BROUILLON: 'BROUILLON',
  CONFIRMEE: 'CONFIRMEE',
  LIVREE: 'LIVREE',
  ANNULEE: 'ANNULEE',
} as const;
export type StatutCommande = typeof StatutCommande[keyof typeof StatutCommande];

export const StatutPaiement = {
  EN_ATTENTE: 'EN_ATTENTE',
  PAYEE: 'PAYEE',
  PARTIELLE: 'PARTIELLE',
} as const;
export type StatutPaiement = typeof StatutPaiement[keyof typeof StatutPaiement];

export const MethodePaiement = {
  CARTE: 'CARTE',
  VIREMENT: 'VIREMENT',
  ESPECES: 'ESPECES',
} as const;
export type MethodePaiement = typeof MethodePaiement[keyof typeof MethodePaiement];

export const ProspectStatut = {
  NOUVEAU: 'NOUVEAU',
  CONTACTE: 'CONTACTE',
  QUALIFIE: 'QUALIFIE',
  PERDU: 'PERDU',
} as const;
export type ProspectStatut = typeof ProspectStatut[keyof typeof ProspectStatut];

export const InteractionType = {
  APPEL: 'APPEL',
  EMAIL: 'EMAIL',
  REUNION: 'REUNION',
} as const;
export type InteractionType = typeof InteractionType[keyof typeof InteractionType];

export const ClientType = {
  PARTICULIER: 'PARTICULIER',
  ENTREPRISE: 'ENTREPRISE',
} as const;
export type ClientType = typeof ClientType[keyof typeof ClientType];

export const TypeRapport = {
  VENTES: 'VENTES',
  CLIENTS: 'CLIENTS',
  PERFORMANCE: 'PERFORMANCE',
} as const;
export type TypeRapport = typeof TypeRapport[keyof typeof TypeRapport];




export const UserRole = {
  ADMIN: 'ADMIN',
  SUPERVISEUR: 'SUPERVISEUR',
  EMPLOYE: 'EMPLOYE',
} as const;
export type UserRole = typeof UserRole[keyof typeof UserRole];



// Base Entity
export interface BaseEntity {
  id: string;
  dateCreation: string;
}

// User & Auth
export interface User extends BaseEntity {
  nom: string;
  prenom: string;
  email: string;
  passwordHash: string;
  actif: boolean;
  role: UserRole;
  is_primary_supervisor?: boolean;
}

export interface Role {
  id: string;
  nom: string;
  description: string;
  permissions: Permission[];
}

export interface Permission {
  id: string;
  module: string;
  action: string;
}

export interface Session {
  id: string;
  token: string;
  dateDebut: string;
  dateExpiration: string;
  actif: boolean;
  userId: string;
}

// Contact & Client
export interface Contact extends BaseEntity {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  entreprise: string;
}

export interface Prospec extends Contact {
  statut: ProspectStatut;
}

export interface Client extends Contact {
  adresse: string;
  type: ClientType;
}

export interface Interaction extends BaseEntity {
  type: InteractionType;
  description: string;
  date: string;
  userId: string;
  clientId?: string;
  prospecId?: string;
}

// Product
export interface Categorie extends BaseEntity {
  nom: string;
  description: string;
}

export interface Produit extends BaseEntity {
  nom: string;
  description: string;
  prix: number;
  stock: number;
  disponible: boolean;
  categorieId: string;
}

// Sales & Orders
export interface Commande extends BaseEntity {
  dateCommande: string;
  statut: StatutCommande;
  montantTotal: number;
  notes: string;
  clientId: string;
  userId: string;
}

export interface LigneCommande extends BaseEntity {
  quantite: number;
  prixUnitaire: number;
  sousTotal: number;
  commandeId: string;
  produitId: string;
}

// Invoicing
export interface Facture extends BaseEntity {
  numeroFacture: string;
  dateEmission: string;
  montantTotal: number;
  statutPaiement: StatutPaiement;
  datePaiement?: string;
  commandeId: string;
  clientId: string;
}

export interface Paiement extends BaseEntity {
  montant: number;
  methode: MethodePaiement;
  datePaiement: string;
  reference: string;
  factureId: string;
}

// Reporting
export interface Rapport extends BaseEntity {
  type: TypeRapport;
  dateGeneration: string;
  periode: { dateDebut: string; dateFin: string };
  userId: string;
}

// Dashboard KPIs
export interface KPIs {
  totalVentes: number;
  totalClients: number;
  totalProspects: number;
  totalCommandes: number;
  commandesEnCours: number;
  revenuMois: number;
  revenuAnnee: number;
  panierMoyen: number;
}

export interface VenteMensuelle {
  mois: string;
  montant: number;
  nombre: number;
}

export interface ProduitPopulaire {
  produit: Produit;
  quantiteVendue: number;
  revenu: number;
}

export interface PerformanceEmploye {
  employe: User;
  nombreVentes: number;
  montantTotal: number;
  nombreClients: number;
}

export interface AssistantResponse {
  answer: string;
  chart: string | null;
  predictions: unknown[];
  top_products: unknown[];
  top_clients: unknown[];
}
