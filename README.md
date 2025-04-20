FRONTEND SERVER:     http://localhost:5174/

📝 Prompt: Build a Real-Time “Watch Together” App with pnpm, Vite, and Tailwind
Create a real-time "Watch Together" web application that allows two users to watch a YouTube video in sync, using WebRTC for peer-to-peer communication.

✅ Requirements
🎥 Video Synchronization
One user (the host) selects a YouTube video.


Both users experience perfectly synchronized video playback: play, pause, seek events must mirror in real-time.


🔌 WebRTC Connection
Establish a peer-to-peer connection using WebRTC.


All video state updates and chat messages should travel directly via WebRTC data channels, with no central server controlling playback.


💬 Real-Time Chat
Add a simple chat interface.


Messages should be exchanged using WebRTC data channels (not WebSockets).


🖼️ Clean, Responsive UI
Use TailwindCSS with Vite for a modern, fast frontend.


UI Layout:


Video player at the top


Chat sidebar on the right (or stacked below on mobile)


🔗 Session Handling
Generate a unique session link for each host.


Only two users should be allowed to join each session.


🛰️ Minimal Backend (for Signaling Only)
Use WebSockets (Express + Socket.IO) or Firebase Realtime Database only for signaling (i.e., exchange offer/answer and ICE candidates).


After signaling, all communication must be handled over WebRTC.



🧱 Technology Stack
Layer
Tech
Frontend
React + Vite + TailwindCSS
Video
YouTube IFrame API
P2P Comm
WebRTC (media + data channels)
Signaling
Express + WebSocket (Socket.IO) or Firebase
Package Manager
pnpm

📁 Folder Structure (pnpm + Vite + Tailwind + Express + WebRTC)
pgsql
CopyEdit
watch-together-app/
├── pnpm-workspace.yaml        # Defines frontend & backend as workspaces
├── .gitignore
├── README.md
├── LICENSE
│
├── backend/                   # Express backend for signaling
│   ├── src/
│   │   ├── index.ts           # Entry point
│   │   ├── signaling.ts       # WebSocket/Firebase signaling logic
│   │   └── types.ts
│   ├── .env
│   ├── package.json
│   ├── tsconfig.json
│   └── pnpm-lock.yaml
│
├── frontend/                  # React + Vite + Tailwind frontend
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── VideoPlayer.tsx
│   │   │   ├── ChatBox.tsx
│   │   │   └── ConnectionStatus.tsx
│   │   ├── pages/
│   │   │   └── Room.tsx
│   │   ├── hooks/
│   │   │   └── useWebRTC.ts
│   │   ├── utils/
│   │   │   └── signaling.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── tailwind.config.ts
│   ├── postcss.config.js
│   ├── vite.config.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── pnpm-lock.yaml
│
├── docs/
│   ├── project-prompt.md      # Original spec / requirements
│   └── architecture.md        # Sequence diagrams, WebRTC flow
📄 README.md
markdown
CopyEdit
# 📺 Watch Together – WebRTC App

A real-time “Watch Together” web application that allows two users to watch a YouTube video in perfect sync with chat and session sharing — powered by **WebRTC**, **React**, **TailwindCSS**, and **Express**.

---

## ✨ Features

- 🔗 **Peer-to-peer (P2P)** video state sync via **WebRTC**
- 🎬 Host selects a YouTube video and shares a session
- ⏯️ Sync play/pause/seek between both users in real time
- 💬 Real-time chat using **WebRTC data channels**
- 🛰️ **Signaling** handled via **WebSocket (Express)** or **Firebase**
- ⚡ Built with **Vite + TailwindCSS + React**
- ✅ Fully responsive UI (desktop & mobile)

---

## 🧱 Tech Stack

| Layer          | Technology                            |
|----------------|----------------------------------------|
| Frontend       | React, Vite, TailwindCSS               |
| Video API      | YouTube IFrame API                    |
| P2P Comm       | WebRTC (media + data channels)        |
| Signaling      | Express + WebSocket (Socket.IO) / Firebase |
| Package Manager| pnpm                                  |
| Deployment     | Firebase Hosting / Railway / Render   |

---

## 📦 Folder Structure

See full structure in [docs/architecture.md](docs/architecture.md) or preview:


watch-together-app/ ├── frontend/ # Vite + Tailwind + React ├── backend/ # Express + WebSocket ├── docs/ # Prompts, architecture └── ...
yaml
CopyEdit

---

## ⚙️ Local Development

### 1. Clone & Install
```bash
git clone https://github.com/yourusername/watch-together-app.git
cd watch-together-app
pnpm install -r

Uses pnpm-workspace.yaml to manage frontend and backend as monorepo workspaces.

2. Run Dev Servers
Backend (Signaling Server)
bash
CopyEdit
cd backend
pnpm dev

Frontend (Vite App)
bash
CopyEdit
cd ../frontend
pnpm dev

App will be available at http://localhost:5173
🚀 Deployment
📡 Frontend → Firebase Hosting
Build the frontend:


bash
CopyEdit
cd frontend
pnpm build

Deploy:


bash
CopyEdit
firebase login
firebase init hosting
firebase deploy


🛰️ Backend → Render / Railway / Fly.io
Add .env:


env
CopyEdit
PORT=5000
SIGNALING_SERVER_URL=http://localhost:5000

Use pnpm start for production server



🧪 TODO / Extensions
Add video queuing


Allow camera/mic + PiP mode


Show connected peer status


Add auth + persistent session metadata



📄 License
MIT © [Your Name]

🤝 Contributing
Pull requests welcome! Please see docs/architecture.md before contributing.
yaml
CopyEdit

---

If you’d like:
- a **starter repo scaffold**, I can generate all the starter files
- a working **Vite + Tailwind + pnpm + Express** template
- a `pnpm-workspace.yaml` preconfigured

Let me know — I can bundle everything as a downloadable ZIP or GitHub starter kit.

4o

