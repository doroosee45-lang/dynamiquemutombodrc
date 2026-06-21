# 🛡️ Dynamique Israël Mutombo — Plateforme Citoyenne RDC

> **Informer · Dénoncer · Mobiliser · Protéger · Innover · Soutenir**
>
> *Unité · Résistance · Discipline · Loyauté · Engagement*

Plateforme citoyenne numérique couvrant les **26 provinces** et les **4 districts de Kinshasa** de la République Démocratique du Congo.

---

## 🏗️ Architecture

```
dynamique-platform/
├── backend/          # API REST + WebSocket (Node.js + Express + TypeScript)
├── frontend/         # Interface web (React 18 + TypeScript + Tailwind CSS)
├── ai-service/       # Service IA (Python FastAPI)
├── nginx/            # Reverse proxy
└── docker-compose.yml
```

### Stack technique
| Couche | Technologie |
|--------|------------|
| Frontend | React 18 · TypeScript · Tailwind CSS · Vite |
| State | Zustand · TanStack Query |
| Backend | Node.js · Express · TypeScript |
| ORM | Prisma + PostgreSQL 15 (PostGIS) |
| Temps réel | Socket.io (WebSockets) |
| IA/ML | Python FastAPI (NLP, scoring, sentiment) |
| Cartographie | Leaflet.js · OpenStreetMap |
| Auth | JWT (15min) + Refresh token (7j) + 2FA TOTP |
| Cache | Redis |
| Médias | AWS S3 / stockage local |
| Notifications | Email (Nodemailer) · SMS (Twilio) |
| Charts | Recharts |
| Infra | Docker · Nginx · CI/CD ready |

---

## 🚀 Démarrage rapide

### Prérequis
- Docker & Docker Compose
- Node.js 20+
- Python 3.11+ (pour le service IA en local)

### 1. Configuration
```bash
cp .env.example .env
# Éditez .env avec vos variables (JWT_SECRET, email, SMS, AWS...)
```

### 2. Lancement avec Docker (recommandé)
```bash
docker-compose up -d
```

L'application sera disponible sur :
- **Frontend** → http://localhost:3000
- **API Backend** → http://localhost:4000/api
- **Service IA** → http://localhost:8000
- **API Docs** → http://localhost:4000/health

### 3. Lancement en développement (sans Docker)

**Base de données PostgreSQL requise** (avec extension PostGIS)

```bash
# Backend
cd backend
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev

# Frontend (dans un autre terminal)
cd frontend
npm install
npm run dev

# Service IA (dans un autre terminal)
cd ai-service
pip install fastapi uvicorn pydantic numpy scikit-learn
python main.py
```

---

## 🔐 Comptes de démonstration

| Rôle | Email | Mot de passe |
|------|-------|-------------|
| SuperAdmin | admin@dynamique-rdc.cd | Admin@Dynamique2026! |
| Éditeur (Sango) | sango@dynamique-rdc.cd | Sango@Dynamique2026! |
| Citoyen | citoyen@example.com | Citoyen@2026! |

---

## 📋 Fonctionnalités implémentées

### ✅ Authentification & Sécurité
- [x] Inscription / Connexion sécurisée
- [x] Vérification email obligatoire
- [x] JWT (15min) + Refresh token (7j) auto-renouvellement
- [x] Authentification 2FA (TOTP / QR Code)
- [x] RBAC : citizen · moderator · editor · admin · superadmin
- [x] Rate limiting anti-brute force
- [x] Protection CORS · Helmet · bcrypt

### ✅ Signalement Citoyen
- [x] Formulaire complet avec validation
- [x] 7 catégories : insécurité · banditisme · transport · corruption · tribalisme · admin · autre
- [x] Upload médias (photos/vidéos) jusqu'à 50 Mo
- [x] Géolocalisation automatique (GPS navigateur)
- [x] Cycle de vie : EN ATTENTE → VÉRIFIÉ → EN COURS → RÉSOLU → REJETÉ
- [x] Score de confiance IA affiché
- [x] Mode anonyme
- [x] Système de votes citoyens
- [x] Commentaires modérés avec réponses
- [x] Historique des changements de statut

### ✅ Carte Interactive Nationale
- [x] OpenStreetMap avec tous les signalements géolocalisés
- [x] Marqueurs colorés par catégorie
- [x] Popups avec détail du signalement
- [x] Filtres : catégorie · statut · province
- [x] Navigation par province (centre automatique)

### ✅ Fil d'Actualité & Publications
- [x] Articles d'investigation, alertes, communiqués
- [x] Alertes urgentes (bandeau rouge)
- [x] Publications épinglées
- [x] Filtres par type et recherche textuelle
- [x] Commentaires et compteur de vues

### ✅ Mobilisation Citoyenne
- [x] Création de campagnes avec objectifs
- [x] Système de participation (compteur temps réel)
- [x] Pétitions digitales avec barre de progression
- [x] Filtres par province

### ✅ Communauté & Chat
- [x] Chat global temps réel (WebSocket)
- [x] Groupes thématiques : sécurité · transport · corruption · actualité · innovation · social
- [x] Messagerie directe modérée
- [x] Indicateur membres en ligne

### ✅ Innovation Jeunes
- [x] Soumission de projets innovants
- [x] Système de votes communautaires
- [x] Validation par les admins → badge Innovateur + 200pts
- [x] Catégories : app · outil · data · communautaire · sécurité

### ✅ Tableau de Bord Admin
- [x] Vue nationale : stats globales · tendances 30 jours · top provinces
- [x] Vue provinciale : métriques par province (26 vues)
- [x] Vue district Kinshasa : métriques par district (4 vues)
- [x] Gestion utilisateurs : rôles · suspension · recherche
- [x] Export CSV des signalements
- [x] Notification broadcast vers membres

### ✅ Réputation & Gamification
| Action | Points |
|--------|--------|
| Signalement validé | +50 pts |
| Commentaire approuvé | +10 pts |
| Vote | +5 pts |
| Signalement résolu | +100 pts |
| Innovation validée | +200 pts |
| Signer une pétition | +2 pts |
| Rejoindre une campagne | +10 pts |

**Badges automatiques :**
- 👁️ Observateur (500 pts)
- ✊ Activiste (2 000 pts)
- ⭐ Leader Citoyen (5 000 pts)
- 💡 Innovateur (innovation validée)

### ✅ Intelligence Artificielle
- [x] Score de confiance (0→1) pour chaque signalement
- [x] Détection spam et faux signalements (règles + NLP)
- [x] Analyse de sentiment (POSITIF · NEUTRE · NÉGATIF · ALARMANT)
- [x] Détection de doublons (similarité sémantique)
- [x] Modération automatique contenus toxiques
- [x] Prédiction zones à risque par province
- [x] Extraction automatique de tags

### ✅ Couverture Territoriale
- [x] 26 bureaux provinciaux numériques
- [x] 4 districts de Kinshasa (Lukunga · Funa · Mont-Amba · Tshangu)
- [x] Dashboards distincts par province et district
- [x] Routing automatique des signalements vers le bureau compétent

---

## 📡 API Endpoints

### Auth
```
POST /api/auth/register        Inscription
GET  /api/auth/verify-email    Vérification email
POST /api/auth/login           Connexion
POST /api/auth/refresh         Renouvellement token
POST /api/auth/logout          Déconnexion
GET  /api/auth/me              Profil connecté
PUT  /api/auth/profile         Mise à jour profil
POST /api/auth/forgot-password Mot de passe oublié
POST /api/auth/reset-password  Réinitialisation
POST /api/auth/2fa/setup       Configuration 2FA
POST /api/auth/2fa/verify      Activation 2FA
POST /api/auth/2fa/disable     Désactivation 2FA
```

### Reports
```
GET    /api/reports             Liste (filtres + pagination)
POST   /api/reports             Créer signalement
GET    /api/reports/map         Données carte
GET    /api/reports/heatmap     Données heatmap
GET    /api/reports/stats       Statistiques globales
GET    /api/reports/:id         Détail signalement
PATCH  /api/reports/:id/status  Changer statut
POST   /api/reports/:id/vote    Voter
POST   /api/reports/:id/comments Commenter
```

### Publications, Campaigns, Innovations, Notifications, Admin
→ Documentation complète disponible sur `/api/docs` (Swagger)

---

## 🔌 WebSocket Events

```javascript
// Connexion
socket.auth = { token: 'JWT_TOKEN' };

// Envoyer
socket.emit('chat:global', { content: 'Message...' });
socket.emit('chat:group', { content: '...', groupId: 'security' });
socket.emit('chat:direct', { content: '...', receiverId: 'user-id' });
socket.emit('typing', { room: 'global', isTyping: true });

// Recevoir
socket.on('chat:message', (msg) => {...});
socket.on('notification:new', (notif) => {...});
socket.on('alert:province', (alert) => {...});
socket.on('alert:global', (alert) => {...});
socket.on('online_count', (count) => {...});
```

---

## 🤖 Service IA (Python FastAPI)

```
POST /analyze            Analyse complète d'un signalement
POST /sentiment          Analyse de sentiment d'un texte
POST /check-duplicate    Vérification doublons
POST /moderate-content   Modération de contenu
POST /predict-risk       Prédiction risque provincial
GET  /provinces/risk-map Carte des risques nationale
GET  /health             Santé du service
```

---

## 🔒 Sécurité

- **Authentification** : JWT HS256 + Refresh token Redis
- **Mots de passe** : bcrypt (12 rounds)
- **2FA** : TOTP (RFC 6238) compatible Google Authenticator
- **Headers** : Helmet.js (XSS, CSRF, CSP, HSTS)
- **CORS** : Domaines autorisés uniquement
- **Rate limiting** : 200 req/15min global · 10 req/15min auth
- **Données** : Chiffrement AES-256 au repos, TLS 1.3 en transit
- **IP** : Hash SHA-256 (confidentialité préservée)
- **Logs** : Audit log de toutes les actions sensibles

---

## 📊 Performance cible (DOE)

| Critère | Objectif | Technologie |
|---------|----------|-------------|
| Signalement complet | < 2 min | UX optimisée |
| Chargement carte (500 pts) | < 1s | Clustering + cache |
| Détection faux signalements | > 80% | Score IA multi-critères |
| Délai notification | < 3s | WebSocket |
| Disponibilité | > 99.5% | Docker + healthcheck |
| API P95 | < 200ms | Redis cache + index DB |
| Utilisateurs simultanés | 10 000 | Socket.io + Redis |

---

## 🗂️ Structure base de données

**Tables principales :**
- `User` — Membres avec RBAC complet
- `Report` — Signalements citoyens avec géolocalisation
- `ReportStatusHistory` — Traçabilité des changements
- `ReportVote` — Votes citoyens
- `Comment` + `CommentVote` — Commentaires hiérarchiques
- `Publication` — Articles, alertes, communiqués
- `Campaign` + `Petition` + `PetitionSignature` — Mobilisation
- `Innovation` + `InnovationVote` — Espace jeunes
- `Message` — Chat (global, groupe, direct)
- `Notification` — Système de notifications
- `UserBadge` — Badges de réputation
- `AuditLog` — Journal d'audit
- `Province_Stats` — Statistiques provinciales

---

## 🌍 Déploiement production

```bash
# 1. Configurer l'environnement
cp .env.example .env
nano .env  # Remplir toutes les variables

# 2. Lancer tous les services
docker-compose up -d --build

# 3. Initialiser la base de données
docker exec dynamique_backend npx prisma migrate deploy
docker exec dynamique_backend npx ts-node prisma/seed.ts

# 4. Vérifier la santé des services
curl http://localhost:4000/health
curl http://localhost:8000/health
```

---

## 📱 Support navigateurs
Chrome 90+ · Firefox 88+ · Safari 14+ · Edge 90+
Mobile : iOS Safari 14+ · Chrome Android 90+

---

## 🤝 Équipe technique

Développé par **Omedev Services** pour soutenir la **Dynamique Israël Mutombo** · RDC · 2026

---

**VIVE ISRAËL MUTOMBO — AUTORITÉ DE RÉFÉRENCE**
**VIVE LA DYNAMIQUE — VIVE LE COMITÉ NATIONAL**

*Unité · Résistance · Discipline · Loyauté · Engagement*
