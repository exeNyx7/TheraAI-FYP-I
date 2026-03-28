# TheraAI Docker Setup Guide

This guide provides step-by-step instructions on how to install Docker, set up your containerized environment, and easily manage the TheraAI Full-Stack Architecture locally.

---

## 1. Prerequisites (Installation)
If you see an error like `The term 'docker' is not recognized...`, you need to install Docker first.

1. **Download Docker Desktop for Windows:** [Official Installation Link](https://docs.docker.com/desktop/install/windows-install/)
2. **Install:** Run the downloaded installer. Make sure the option to "Use WSL 2 instead of Hyper-V" is checked, as it dramatically improves speed and performance on Windows machines.
3. **Restart your Computer:** This allows Windows to apply all the virtual subsystem network changes.
4. **Boot the Engine:** Open the "Docker Desktop" application from your Start Menu. Wait a couple of minutes until the engine indicator (bottom left) is green or the whale icon in the system tray stops animating.
5. **Verify:** Open a completely *new* PowerShell window to load fresh Environment Variables, and type:
   ```bash
   docker --version
   ```
   If it outputs the version number, your machine is officially Docker-ready!

---

## 2. Setting Up TheraAI Automatically (Docker Compose)
Docker Compose uses the `docker-compose.yml` file located in this directory to orchestrate all containers (MongoDB, Redis, FastAPI Backend, and Vite Frontend) simultaneously.

### The Essential Commands

#### 1. Build the Images
Before you can run the code, Docker needs to package your frontend and backend code into isolated Linux "Images".
```bash
docker compose build
```
- **What it does:** Reads the `Dockerfile` inside the `backend/` and `web/` folders, downloads the necessary Python and Node Linux base sizes, and creates the pristine image caches.
- **When to use it:** Use this the *very first time* you start the project, or whenever you install a new pip package (`requirements.txt`) or a new npm library (`package.json`).

#### 2. Start the Stack (Detached)
```bash
docker compose up -d
```
- **What it does:** Boots up MongoDB, Redis, the Backend, and the Frontend. The `-d` flag stands for "detached", meaning it runs quietly in the background, giving you your terminal prompt back instead of locking it up.
- **When to use it:** Whenever you want to start working on the project. Once it's up, just open your browser to `http://localhost:3000`.

#### 3. View Live Logs
Because the containers are running in the background (detached), you won't see print statements or crash errors unless you check the logs.
```bash
docker compose logs -f
```
- **What it does:** Streams the live console output of *all* containers. The `-f` flag means "follow", so it will update live. Press `Ctrl + C` to stop watching (this doesn't kill the servers).
- **Pro-Tip:** If you only care about the backend crashing or want to see the AI models downloading, you can specify the container name:
  ```bash
  docker compose logs -f backend
  ```

#### 4. Stop the Stack
```bash
docker compose down
```
- **What it does:** Gracefully shuts down all 4 running containers and removes their active network bridges.
- **When to use it:** When you are done working for the day. (Note: Your data in MongoDB, Redis, and your downloaded AI Models are safely preserved in persistent storage Volumes, so they will be there when you boot back up tomorrow).

#### 5. Stop the Stack & Wipe All Data (Danger)
```bash
docker compose down -v
```
- **What it does:** Shuts down the containers AND deletes the persistent Volumes (the `-v` flag).
- **When to use it:** If your database ever gets corrupted, or if you want to completely wipe the existing users/journals and start with a totally fresh machine. Note: This will also wipe the `hf_models_cache`, meaning the AI models will have to redownload the next time you boot.

---

## 3. How the TheraAI Docker Stack is Wired

1. **Storage Volumes:** HuggingFace AI Models are huge (1GB+). Because we mapped `hf_models_cache:/root/.cache/huggingface`, your gigabytes of AI models download exactly once and stay permanently on your hard drive, surviving container reboots. `mongodb_data` does the exact same thing for your active database rows.
2. **Healthchecks:** The backend server refuses to connect to the database until Docker's internal ping module verifies that MongoDB and Redis are 100% fully booted. This prevents "connection refused" race condition bugs.
3. **Localhost Routing:** In `docker-compose.yml`, `VITE_API_URL` uses `localhost:8000` because the Vite Frontend is executed by Chrome (your browser outside the container), so the browser still hits localhost to reach the FastAPI exposed port.
