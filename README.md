# ⚡ Hydrogen Pipeline Monitoring System

> **A Real-Time Industrial IoT Telemetry, Anomaly Detection & Pipeline Health Platform**  
> Built with React (TypeScript), Express.js, Recharts, and a Fault-Tolerant Hybrid Data Engine.

---

## 📌 Project Overview

The **Hydrogen Pipeline Monitoring System** is a full-stack Web Application designed for real-time monitoring and safety management of hydrogen gas distribution trunk lines and municipal ring mains. 

It provides continuous **1-second telemetry streaming**, automated anomaly detection for pressure/flow/temperature/vibration anomalies, role-based security, maintenance scheduling, and automated regulatory compliance report generation.

---

## ✨ Key Features

- **⚡ 1-Second Real-Time Telemetry**: Real-time sensor reading generation with natural random-walk drift and anomaly simulation.
- **🎨 Minimalist Light Glass UI**: Clean 80/20 light-dark theme with HSL color-coded status badges, tabular numbers, and Recharts pressure trends.
- **🚨 Automated Anomaly & Alert Engine**: Auto-detects critical pressure spikes and drops with a 30-second smart cooldown per sensor to prevent alert fatigue.
- **🔐 Role-Based Access Control (RBAC)**: JWT authentication with 3 distinct access tiers:
  - **Admin**: Complete system control, user management, pipeline configuration.
  - **Manager**: Maintenance task management, compliance reporting.
  - **Operator**: Live dashboard monitoring, anomaly resolution.
- **🛠️ Pipeline Maintenance Tracker**: Priority-based scheduling for pipeline segment repairs and inspections.
- **📋 Regulatory Compliance Engine**: Automated pressure compliance report generator with historical statistics.
- **🔄 Zero-Downtime Hybrid Engine**: Self-healing data store that operates seamlessly with PostgreSQL & Redis or automatically falls back to a pre-populated in-memory database engine when offline.

---

## 🔑 Quick Access — Demo Credentials

You can use the built-in **Quick Fill** buttons on the login screen or enter the credentials below:

| Role | Email | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **👑 Admin** | `admin@h2pipeline.in` | `Admin@H2#2024` | Full System Access + User Management |
| **💼 Manager** | `manager@h2pipeline.in` | `Mgr@H2#2024` | Maintenance & Compliance Management |
| **🛠️ Operator** | `operator@h2pipeline.in` | `Ops@H2#2024` | Live Dashboard & Alert Resolution |

---

## 🛠️ Technology Stack

- **Frontend**: React 18, Vite, TypeScript, Recharts, Inter & JetBrains Mono Fonts, Custom Vanilla CSS
- **Backend**: Node.js, Express, TypeScript, JWT (JSON Web Tokens), Bcrypt.js
- **Database & Caching**: PostgreSQL, Redis, In-Memory Store Fallback Engine
- **Containerization**: Docker, Docker Compose

---

## 🚀 Quick Start (Local Setup)

### Prerequisites
- Node.js (v18+)
- npm (v9+)

### 1. Clone Repository
```bash
git clone https://github.com/sumithroshan0907/hydrogen-pipeline-monitor.git
cd hydrogen-pipeline-monitor
```

### 2. Start Backend Server
```bash
cd backend
npm install
npm run dev
```
*The backend API will run on `http://localhost:5000`.*

### 3. Start Frontend Dashboard
Open a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
*The frontend application will be live at `http://localhost:5173`.*

---

## 🌐 How to Share with Faculty / View on Other PCs

If you want your faculty to view and interact with the application on their own computer, choose one of the following methods:

### Option 1: Instant Local Sharing (No Deployment Required)
Run a local tunnel tool in your terminal while your project is running locally:

```bash
# Share Frontend (Port 5173)
npx localtunnel --port 5173
```
*Localtunnel will output a public URL (e.g. `https://cool-pipe-42.loca.lt`) which you can send directly to your faculty!*

---

### Option 2: Free Cloud Hosting Setup (Vercel + Render + MongoDB Atlas / Render PostgreSQL)

1. **Frontend Hosting (Vercel)**:
   - Connect your GitHub repo to [Vercel.com](https://vercel.com).
   - Set Root Directory to `frontend`.
   - Add Environment Variable: `VITE_API_URL` = `<your-backend-render-url>`.
   - Click **Deploy**.

2. **Backend Hosting (Render / Railway)**:
   - Connect your GitHub repo to [Render.com](https://render.com).
   - Choose **Web Service**, set Root Directory to `backend`.
   - Build Command: `npm install && npm run build` (or `npx tsx src/server.ts`).
   - Start Command: `npm run dev` (or `node dist/server.js`).

3. **Cloud Database (MongoDB Atlas / Render PostgreSQL)**:
   - The backend contains a self-contained in-memory database fallback so it will run online out-of-the-box even without external DB configuration!
   - For persistent cloud database, connect a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) or [Render PostgreSQL](https://render.com/docs/databases) instance and set environment variables in Render.

---

## 📂 Project Structure

```
hydrogen-pipeline-monitor/
├── backend/
│   ├── src/
│   │   ├── config/       # Database, Redis, JWT & 1s Simulator
│   │   ├── middleware/   # JWT Auth & Role Authorization
│   │   ├── routes/       # API Endpoints (Pipelines, Sensors, Alerts, Users)
│   │   └── server.ts     # Express Server Entrypoint
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── context/      # Auth & Session Context
│   │   ├── pages/        # Login Page & Admin User Management
│   │   ├── App.tsx       # Main Monitoring Dashboard & Recharts UI
│   │   ├── App.css       # Light Minimalist Design System
│   │   └── index.css     # Base Typography & Color Tokens
│   ├── package.json
│   └── vite.config.ts
├── docker-compose.yml
└── README.md
```

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).