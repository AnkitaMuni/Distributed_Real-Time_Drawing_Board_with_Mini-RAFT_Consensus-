# 🧠 RaftBoard — Distributed Drawing with Leader Election

RaftBoard is a **distributed real-time drawing application** built using the **Raft consensus algorithm**.

Only the **Leader node** is allowed to draw, while Followers stay in **read-only mode**.
If the Leader crashes, a **new leader is automatically elected**, and drawing continues seamlessly.

---

## 🚀 Features

* 🎨 Real-time collaborative drawing
* 🧠 Raft-based leader election
* 🔒 Followers are read-only
* 🔁 Automatic leader failover
* 🌐 WebSocket-based communication
* 📊 Live cluster status visualization

---

## 🏗️ Architecture

Frontend (Browser)
⬇
Gateway (WebSocket + REST)
⬇
Raft Replicas (replica1, replica2, replica3)

---

## 📦 Project Structure

```
project/
├── frontend/
├── gateway/
├── replica1/
├── replica2/
├── replica3/
├── frontend/
└── docker-compose.yml
```

---

## ⚙️ Prerequisites

* Node.js (v18+ recommended)
* npm
* Docker & Docker Compose

---

## ▶️ How to Run the Project

### 1. Install dependencies

Run this in each folder:

```bash
npm install
```

---

### 2. Start docker

### 3. Run in terminal

```
docker-compose up --build
```

### 3. Open Frontend

Open in browser:

```
http://localhost:8081
http://localhost:8082
http://localhost:8083
```

Each tab represents a **different replica POV**.

---

## 🧪 Testing Leader Election

### ✅ Step 1: Identify Leader

* Look at UI → "Leader: replicaX"
* Only that tab can draw

---

### 💥 Step 2: Kill the Leader

In terminal:

```
docker compose stop replicaX
```

(Stop the leader replica process)

---

### 🔄 Step 3: Watch Re-election

* Within ~1–3 seconds:

  * New leader is elected automatically
  * UI updates
  * Another replica becomes writable

---

### 🔁 Step 4: Restart Old Leader

```bash
docker compose start replicaX
```

* It rejoins as a **Follower**
* Does NOT overwrite current leader

---

## 🧠 How It Works

* Gateway exposes `/cluster` API
* Frontend polls cluster every second
* Leader is detected dynamically
* Only leader sends drawing events
* Followers sync via WebSocket

---

## 📸 Demo Flow

1. Open 3 tabs
2. Draw from leader tab
3. Kill leader
4. Watch new leader take over
5. Continue drawing

---
