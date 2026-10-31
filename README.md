# 🛒 Agora — Collaborative Shopping List & MCP Agent Backend

> **Agora** est une liste de courses collaborative temps-réel, ultra-légère et résiliente, conçue pour être partagée entre humains et connectée à un agent IA autonome tel que **Hermes** via le protocole standard **MCP (Model Context Protocol)**.

---

## 🏛️ Architecture & Philosophie

```
                     ┌──────────────────────────────────────────────┐
                     │          Hermes Agent (ou Claude)            │
                     └──────────────────────┬───────────────────────┘
                                            │ MCP over SSE (Remote)
                                            │ Bearer Token: <MCP_API_KEY>
                                            ▼
┌──────────────────────────┐  REST / SSE      ┌────────────────────────────────────────────────────────┐
│  Frontend (Vite + React) ├─────────────────►│                   Agora Backend (Go)                   │
│  - Mobile-first PWA      │                  │  • HTTP Router (net/http Go 1.22+)                     │
│  - Live sync via SSE     │                  │  • /api/items & /api/stream (live updates front)       │
│  - Catégorisation auto   │                  │  • /sse & /messages (MCP Server mark3labs/mcp-go)      │
└──────────────────────────┘                  └────────────────────────────┬───────────────────────────┘
                                                                           │ SQLite (Zero-CGO WAL mode)
                                                                           ▼
                                                             [ agora.db sur PVC K8s ]
```

### Points forts
- **Backend Go ultra-performant** : binaire statique compilé sans CGO (`modernc.org/sqlite`), consommant moins de **15 Mo de RAM**.
- **Serveur MCP SSE natif** : propulsé par `github.com/mark3labs/mcp-go`. Hermes peut invoquer les tools à distance via HTTP/SSE.
- **Synchronisation temps-réel instantanée** : quand Hermes ou un humain ajoute un article, tous les smartphones connectés reçoivent la mise à jour via `/api/stream` (Server-Sent Events) sans recharger la page.
- **Frontend mobile-first (PWA)** : Interface soignée type checklist, tactile, avec retour haptique (vibration mobile) et regroupement automatique par rayons (Fruits & Légumes, Produits Frais, Épicerie, etc.).
- **GitOps K8s & ArgoCD** : aligné avec Traefik Ingress, cert-manager Cloudflare et le pipeline GitHub Actions GHCR.

---

## 🤖 Intégration MCP pour Hermes & LLMs

L'API expose un serveur MCP conforme au standard Model Context Protocol sur :
- **Endpoint SSE** : `https://api-agora.cyrus-ag.com/sse`
- **Messages** : `https://api-agora.cyrus-ag.com/messages`
- **Authentification** : `Authorization: Bearer <MCP_API_KEY>` (ou query param `?token=<MCP_API_KEY>`)

### Configuration Client MCP (ex: Hermes, Claude Desktop, Cursor)

```json
{
  "mcpServers": {
    "agora": {
      "url": "https://api-agora.cyrus-ag.com/sse",
      "headers": {
        "Authorization": "Bearer VOTRE_CLE_SECRETE_MCP"
      }
    }
  }
}
```

### Tools MCP disponibles :

| Tool | Description | Arguments |
|---|---|---|
| `add_shopping_items` | Ajoute un ou plusieurs articles avec nom, quantité, catégorie et notes | `items: [{ name, quantity?, category?, notes? }]` |
| `get_shopping_list` | Récupère la liste actuelle (filtrable par pending, completed, all) | `status?: "pending" \| "completed" \| "all"` |
| `mark_as_bought` | Marque un ou plusieurs articles comme achetés via leurs IDs | `ids: [number]` |
| `clear_completed` | Supprime tous les articles déjà achetés de la liste | `{}` |

---

## 📡 API REST

| Méthode | Route | Description |
|---|---|---|
| `GET` | `/healthz` | Probe de disponibilité K8s |
| `GET` | `/api/items` | Liste les articles (`?include_completed=true`) |
| `POST` | `/api/items` | Ajoute un article `{ name, quantity?, category?, notes? }` |
| `PATCH` | `/api/items/{id}/toggle` | Coche / décoche un article |
| `PATCH` | `/api/items/{id}` | Mise à jour partielle d'un article |
| `DELETE` | `/api/items/{id}` | Supprime un article |
| `POST` | `/api/items/clear-completed` | Supprime les articles cochés |
| `GET` | `/api/stream` | Flux SSE pour les notifications de mise à jour en direct |

---

## 🚀 Lancement Local (Docker Compose)

Pour tester l'ensemble en local d'une seule commande :

```bash
docker compose up --build
```

- **Frontend** : [http://localhost:3000](http://localhost:3000)
- **Backend API & MCP** : [http://localhost:8080](http://localhost:8080)
- **Healthcheck** : [http://localhost:8080/healthz](http://localhost:8080/healthz)

---

## ☸️ Déploiement Kubernetes & ArgoCD

1. **Créer le namespace & le secret MCP** :
```bash
kubectl create namespace agora-prod
kubectl create secret generic agora-backend-secret \
  --namespace agora-prod \
  --from-literal=mcp-api-key="VOTRE_CLE_SECRETE_MCP"
```

2. **Ajouter l'Application ArgoCD** :
Le manifest `k8s/argocd/agora-application.yaml` est prêt à être appliqué :
```bash
kubectl apply -f k8s/argocd/agora-application.yaml
```

ArgoCD synchronisera automatiquement les deux services :
- `agora.cyrus-ag.com` (Frontend React PWA)
- `api-agora.cyrus-ag.com` (API REST + MCP Server)

---

## 🔄 Pipeline CI/CD GitHub Actions

Les workflows `.github/workflows/backend.yml` et `.github/workflows/frontend.yml` s'exécutent automatiquement à chaque push sur `main` :
1. Tests unitaires et compilation de contrôle.
2. Build et push des conteneurs multi-stage sur GitHub Container Registry (`ghcr.io/victoragahi/agora-*`).
3. Mise à jour automatique du commit SHA dans les manifests `deployment.yaml` (`[skip ci]`).
4. ArgoCD détecte la mise à jour et déploie sans intervention.
