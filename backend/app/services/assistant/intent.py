from .text import _contains_any, _normalize_text


def _is_count_question(question: str) -> bool:
    q = _normalize_text(question)
    return _contains_any(q, [
        "how many", "combien", "number of", "nombre de", "count", "total ",
        "how much", "combien de",
    ])


def _is_unpaid_invoice_question(question: str) -> bool:
    q = _normalize_text(question)
    return _contains_any(q, [
        "unpaid invoice", "unpaid invoices", "outstanding invoice", "outstanding invoices",
        "facture impayee", "factures impayees", "facture en attente", "factures en attente",
        "facture non payee", "factures non payees", "overdue invoice", "overdue invoices",
        "facture en retard", "factures en retard", "impaye", "impayes",
        "invoice pending", "pending invoice",
    ])


def _is_best_salesperson_question(question: str) -> bool:
    q = _normalize_text(question)
    return _contains_any(q, [
        "best salesperson", "top salesperson", "best seller", "top seller",
        "meilleur vendeur", "meilleur commercial", "top vendeur", "top commercial",
        "best performing", "meilleure performance", "highest sales", "plus de ventes",
        "leading sales", "sales champion", "number one salesperson",
    ])


def _is_top_product_question(question: str) -> bool:
    q = _normalize_text(question)
    return _contains_any(q, [
        "top product", "best product", "best selling product", "bestseller",
        "most sold", "most popular", "produit le plus vendu", "meilleur produit",
        "top produit", "article le plus vendu", "produit populaire",
    ])


def _is_top_client_question(question: str) -> bool:
    q = _normalize_text(question)
    return _contains_any(q, [
        "top client", "best client", "biggest client", "meilleur client",
        "top customer", "best customer", "highest spending", "most orders",
        "client le plus", "plus gros client", "client fidele",
    ])


def _is_sales_summary_question(question: str) -> bool:
    q = _normalize_text(question)
    return _contains_any(q, [
        "total sales", "total revenue", "chiffre d affaire", "ca total",
        "revenue total", "ventes totales", "sales total", "how much did we sell",
        "combien on a vendu", "montant total des ventes",
    ])


def _is_forecast_question(question: str) -> bool:
    q = _normalize_text(question)
    return _contains_any(q, [
        "forecast", "prevision", "prediction", "predict", "next month",
        "mois prochain", "future", "futur", "trend", "tendance",
        "projection", "projeter",
    ])


def _is_order_status_question(question: str) -> bool:
    q = _normalize_text(question)
    return _contains_any(q, [
        "order status", "statut commande", "commande statut",
        "pending order", "commande en attente", "delivered order",
        "commande livree", "confirmed order", "commande confirmee",
        "cancelled order", "commande annulee",
    ])


def _is_invoice_status_question(question: str) -> bool:
    q = _normalize_text(question)
    return _contains_any(q, [
        "invoice status", "statut facture", "paid invoice", "facture payee",
        "unpaid invoice", "invoice breakdown", "factures par statut",
    ])


def _is_stock_question(question: str) -> bool:
    q = _normalize_text(question)
    return _contains_any(q, [
        "stock", "inventory", "inventaire", "available", "disponible",
        "out of stock", "rupture de stock", "low stock", "stock faible",
        "in stock", "en stock",
    ])


# ---------------------------------------------------------------------------
# LLM call (Groq)
# ---------------------------------------------------------------------------
