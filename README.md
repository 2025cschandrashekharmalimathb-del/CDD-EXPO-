# Campus Commons — Connected Learning Platform

Campus Commons now combines a campus resource board with online classes, family/teacher meetings, translation, and a voice-enabled learning assistant. Students, teachers, and parents use the same responsive web app with role-aware actions.

## Technology

- **Frontend:** React, JavaScript/JSX, HTML, custom CSS, Bootstrap 5, Tailwind CSS, Vite.
- **Backend:** Java 17, Spring Boot, Spring Web, JDBC, WebSockets, BCrypt password hashing.
- **Database:** MySQL/MariaDB, using the existing XAMPP MySQL service and `campus_tracker` database.
- **Local infrastructure:** Docker Compose, XAMPP, Node.js/npm for the frontend.
- **Optional services:** Google Cloud Translation or OpenAI API keys can override/extend the defaults. Docker Compose includes a self-hosted LibreTranslate service, and the learning assistant has built-in help when no AI key is configured. Browser speech recognition and speech synthesis power voice input and read-aloud where supported.
- **Visual design:** Google Fonts and Material Symbols, responsive CSS illustrations and motion.

## Run with XAMPP and Docker

1. Start MySQL in the XAMPP Control Panel.
2. Import `database/schema.sql` in phpMyAdmin. It creates `campus_tracker`, the account/resource/class/meeting tables, and starter resources. On an existing v1 database the Java API also upgrades the user role column.
3. If `.env` does not exist, copy `.env.example` to `.env`; otherwise keep your current `.env` and update its settings. Set your XAMPP database password and a private `JWT_SECRET`.
4. Optional: add `GOOGLE_TRANSLATE_API_KEY` and/or `OPENAI_API_KEY` in `.env` to enable the connected providers.
5. Start Docker Desktop and run:

   ```powershell
   docker compose up --build
   ```

6. Open `http://localhost:3000`. The Java API health endpoint is `http://localhost:5000/api/health`.

The containers connect to XAMPP MySQL through `host.docker.internal:3306`. Keep XAMPP MySQL running while the app is in use.

## Run without Docker

Requirements: Java 17, Maven, Node.js 20+, npm, XAMPP MySQL, and the imported schema.

In one terminal, set the database variables and start the API:

```powershell
cd backend
$env:DB_HOST = "127.0.0.1"
$env:DB_PORT = "3306"
$env:DB_USER = "root"
$env:DB_PASSWORD = ""
$env:DB_NAME = "campus_tracker"
$env:JWT_SECRET = "replace-with-a-long-random-secret"
mvn spring-boot:run
```

In another terminal:

```powershell
cd frontend
npm install
npm run dev
```

Visit `http://localhost:3000`. Vite proxies browser requests to `http://localhost:5000` by default.

## Features

- Student, teacher, and parent account portals. Existing lecturer accounts are accepted as teacher accounts.
- Student resource search, category filters, reservation, and return. Teachers can add resources.
- Teacher-scheduled online classes with shareable room codes.
- Faculty call scheduling and video rooms for campus conversations.
- In-browser audio/video calls and screen sharing with WebRTC and WebSocket signaling.
- Text translation through a self-hosted LibreTranslate service, with optional Google Cloud Translation.
- Assistant text chat, optional generated AI responses, speech input, and read-aloud.
- Responsive layouts, animated cards, Google Fonts and Material Symbols.

## Important deployment notes

Set a private JWT secret, serve the app over HTTPS, and configure access to provider APIs before deployment. Browser camera/microphone permissions generally require HTTPS or localhost. Peer-to-peer calls may need a TURN relay on restrictive networks; this local build configures a public STUN server only. Meeting room codes are invitations, so share them with the intended participants. Teacher accounts currently self-register; add school approval before production use.

## Provider keys

`GOOGLE_TRANSLATE_API_KEY` optionally enables Google Cloud Translation on the Translator page. Otherwise Docker Compose uses self-hosted LibreTranslate (initial language-model download can take a few minutes). `OPENAI_API_KEY` enables generated assistant replies; `OPENAI_MODEL` can select the model. Without the OpenAI key, the assistant uses built-in campus help. Put secrets in `.env` or Jenkins Credentials, never in source code. No provider keys are included in this project.

## Jenkins CI/CD

The root `Jenkinsfile` builds both Docker images on every branch and polls the repository every five minutes. Create a Jenkins **Multibranch Pipeline** for this repository and allow a Docker-capable Jenkins agent. For push-triggered runs, configure the matching GitHub webhook in Jenkins. The `Deploy to Docker Compose` stage runs only on `main` when `DEPLOY_TO_COMPOSE` is selected.

Before enabling deployment, add Jenkins credentials: username/password `campus-db`, and secret text credentials `campus-jwt-secret`, `google-translate-api-key`, and `openai-api-key`. The Jenkins agent must run Docker Compose and reach the configured MySQL host. Never put tokens in the Jenkinsfile or source repository.
