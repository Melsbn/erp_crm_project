GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

MAX_FORECAST_MONTHS = 3

MAX_HISTORY_TURNS = 8

MAX_SAMPLE_DOCS = 20

MAX_TEXT_MATCHES = 15

MAX_FIELD_VALUE_LENGTH = 300

INSTANT_REPLIES = {
    "fr": {
        "merci": "De rien ! N'hésitez pas si vous avez d'autres questions.",
        "super": "Ravi de pouvoir vous aider !",
        "ok": "D'accord ! Autre chose ?",
        "bien": "Tant mieux ! Je suis là si vous avez d'autres questions.",
        "parfait": "Parfait ! N'hésitez pas si vous avez d'autres questions.",
        "au revoir": "Au revoir ! Bonne journée.",
        "bonne journée": "Merci, bonne journée à vous aussi !",
        "bonjour": "Bonjour ! Comment puis-je vous aider ?",
        "bonsoir": "Bonsoir ! Comment puis-je vous aider ?",
        "salut": "Salut ! Comment puis-je vous aider ?",
        "stp": "Bien sûr, je vous écoute.",
        "svp": "Bien sûr, je vous écoute.",
    },
    "en": {
        "thanks": "You're welcome! Let me know if you need anything else.",
        "thank you": "You're welcome! Let me know if you need anything else.",
        "great": "Glad I could help!",
        "ok": "Alright! Anything else?",
        "perfect": "Perfect! Let me know if you need anything else.",
        "goodbye": "Goodbye! Have a great day.",
        "bye": "Goodbye! Have a great day.",
        "hello": "Hello! How can I help you?",
        "hi": "Hi! How can I help you?",
        "please": "Of course, I'm listening.",
    },
}

COLLECTION_HINTS = {
    "users": {
        "label_en": "users/employees",
        "label_fr": "utilisateurs/employés",
        "keywords": [
            "user", "users", "employee", "employees", "employe", "employes",
            "admin", "supervisor", "superviseur", "role", "team", "equipe",
            "vendeur", "commercial", "agent", "staff", "personnel", "collaborateur",
            "account", "compte", "membre",
        ],
        "text_fields": ["nom", "prenom", "email", "role"],
        "sort_field": "dateCreation",
    },
    "clients": {
        "label_en": "clients",
        "label_fr": "clients",
        "keywords": [
            "client", "clients", "customer", "customers", "buyer", "acheteur",
            "email", "phone", "telephone", "address", "adresse", "entreprise", "company",
            "contact", "top client", "meilleur client", "fidele", "loyalty",
        ],
        "text_fields": ["nom", "prenom", "email", "telephone", "adresse", "entreprise", "type"],
        "sort_field": "dateCreation",
    },
    "prospects": {
        "label_en": "prospects",
        "label_fr": "prospects",
        "keywords": [
            "prospect", "prospects", "lead", "leads", "pipeline", "qualified",
            "qualifie", "contacte", "contacted", "conversion", "funnel", "entonnoir",
            "opportunite", "opportunity",
        ],
        "text_fields": ["nom", "prenom", "email", "telephone", "entreprise", "statut", "source"],
        "sort_field": "dateCreation",
    },
    "categories": {
        "label_en": "categories",
        "label_fr": "catégories",
        "keywords": [
            "category", "categories", "categorie", "catalog", "catalogue",
            "famille", "family", "groupe", "group", "type produit",
        ],
        "text_fields": ["nom", "description"],
        "sort_field": "dateCreation",
    },
    "produits": {
        "label_en": "products",
        "label_fr": "produits",
        "keywords": [
            "product", "products", "produit", "produits", "price", "prix",
            "stock", "available", "disponible", "article", "articles",
            "inventory", "inventaire", "item", "sku", "reference", "ref",
            "catalogue produit", "top produit", "best product", "best selling",
        ],
        "text_fields": ["nom", "description", "reference", "sku"],
        "sort_field": "dateCreation",
    },
    "commandes": {
        "label_en": "orders",
        "label_fr": "commandes",
        "keywords": [
            "order", "orders", "commande", "commandes", "sales", "sale",
            "vente", "ventes", "revenue", "revenu", "chiffre affaire", "ca",
            "status", "statut", "delivery", "livraison", "shipped", "expedie",
            "confirmed", "confirmee", "cancelled", "annulee", "pending", "en attente",
            "montant", "amount", "total", "forecast", "prevision", "performance",
            "best salesperson", "meilleur vendeur", "top vendeur", "top commercial",
        ],
        "text_fields": ["statut", "notes", "reference"],
        "sort_field": "dateCommande",
    },
    "lignes_commande": {
        "label_en": "order lines",
        "label_fr": "lignes de commande",
        "keywords": [
            "line", "lines", "ligne", "lignes", "quantity", "quantite",
            "unit price", "prix unitaire", "sous-total", "subtotal",
            "top product", "top produit", "best product", "meilleur produit",
            "best seller", "vendu", "sold",
        ],
        "text_fields": [],
        "sort_field": "dateCreation",
    },
    "factures": {
        "label_en": "invoices",
        "label_fr": "factures",
        "keywords": [
            "invoice", "invoices", "facture", "factures", "payment", "payments",
            "paiement", "paid", "unpaid", "impaye", "pending", "en attente",
            "overdue", "en retard", "echeance", "due", "balance", "solde",
            "numero facture", "invoice number", "billing", "facturation",
            "partially paid", "partielle",
        ],
        "text_fields": ["numeroFacture", "statutPaiement", "notes"],
        "sort_field": "dateEmission",
    },
    "paiements": {
        "label_en": "payments",
        "label_fr": "paiements",
        "keywords": [
            "payment", "payments", "paiement", "paiements", "reference",
            "virement", "carte", "cash", "especes", "cheque", "bank transfer",
            "received", "recu", "transaction",
        ],
        "text_fields": ["reference", "methode", "notes"],
        "sort_field": "datePaiement",
    },
    "interactions": {
        "label_en": "interactions",
        "label_fr": "interactions",
        "keywords": [
            "interaction", "interactions", "call", "appel", "meeting", "reunion",
            "email", "follow-up", "suivi", "history", "historique",
            "activity", "activite", "note", "task", "tache", "reminder", "rappel",
            "contact history", "crm activity",
        ],
        "text_fields": ["type", "description", "notes"],
        "sort_field": "date",
    },
    "rapports": {
        "label_en": "reports",
        "label_fr": "rapports",
        "keywords": [
            "report", "reports", "rapport", "rapports", "performance",
            "analytics", "analyse", "kpi", "dashboard", "summary", "resume",
            "statistique", "statistic", "metric",
        ],
        "text_fields": ["type", "titre", "description"],
        "sort_field": "dateGeneration",
    },
}
