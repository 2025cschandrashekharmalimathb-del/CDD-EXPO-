# Campus Commons — Campus Resource & Lab Equipment Tracker

Campus Commons is a mobile friendly campus resource application with separate student and lecturer accounts. Students can discover resources and manage their own reservations. Lecturers get a distinct faculty dashboard for adding shared resources and reviewing availability. Account and resource records are stored in MySQL/MariaDB, including the database bundled with XAMPP.

## Start with XAMPP (Windows)

1. Install XAMPP and open the XAMPP Control Panel.
2. Start **MySQL**. Apache is optional; use it only if you want phpMyAdmin at `http://localhost/phpmyadmin`.
3. In phpMyAdmin, open **Import**, select `database/schema.sql`, and import it. The script creates the `campus_tracker` database and adds the starter resources.
4. From the project root, copy `.env.example` to `.env`. Update `DB_USER`, `DB_PASSWORD`, and set a private `JWT_SECRET` if your XAMPP MySQL uses a password.
5. Start the application:

   ```powershell
   docker compose up --build
   ```

6. Open **http://localhost:3000**. The API health page is **http://localhost:5000/api/health**.

Docker Compose runs the app and API while connecting to the MySQL server provided by XAMPP at `host.docker.internal:3306`. Start XAMPP MySQL before starting the API. To stop, press `Ctrl+C`; to stop detached containers use `docker compose down`. Your data remains in XAMPP's MySQL database.

If Docker cannot connect to XAMPP, verify MySQL is listening on port 3306 and that the Windows firewall allows Docker Desktop to reach it. If your XAMPP service uses a different port, update `DB_PORT` in `docker-compose.yml`.

## Run the API and web app without Docker

Requirements: Node.js 20+, npm, XAMPP MySQL, and the imported schema.

In PowerShell, open one terminal and run:

```powershell
cd backend
npm install
$env:DB_HOST = "127.0.0.1"
$env:DB_PORT = "3306"
$env:DB_USER = "root"
$env:DB_PASSWORD = ""
$env:DB_NAME = "campus_tracker"
$env:JWT_SECRET = "replace-with-a-long-random-secret"
npm start
```

Open a second terminal and start the web app:

```powershell
cd frontend
npm install
npm run dev
```

Then visit **http://localhost:3000**. On macOS/Linux, export the same `DB_*` and `JWT_SECRET` variables before running `npm start`.

## Student and lecturer accounts

1. On the welcome screen, choose **Student** or **Lecturer**. Each has its own sign-in style and dashboard.
2. Choose **Create an account** and provide your name, campus email, password, and student/staff ID. Lecturers also enter their department.
3. Sign in with the same account type and email. Passwords are stored as bcrypt hashes; the app never stores the plain password.
4. Students can reserve available items and return their own reservations. They cannot release another student's reservation.
5. Lecturers can view the shared catalog and add resources. They cannot make student reservations.
6. Use **Sign out** in the top bar to end the session in this browser.

The registration form currently allows either account type to self-register. For an institution deployment, restrict lecturer registration to approved staff (for example, invite codes or administrator approval) and use HTTPS with a secure production JWT secret.

## API quick reference

- `GET /api/health` — API and database type status.
- `POST /api/auth/register` — create a student or lecturer account.
- `POST /api/auth/login` — sign in and receive a bearer token.
- `GET /api/auth/me` — get the current signed-in account.
- `GET /api/resources` — list resources (requires sign-in).
- `POST /api/resources` — add a resource (lecturer account required).
- `POST /api/resources/:id/book` — reserve or return own item (student account required).

## Architecture

```text
Student or Lecturer browser :3000 (React + Vite)
                       │ JSON API + signed session
                       ▼
                Express API :5000
                       │ MySQL protocol
                       ▼
           XAMPP MySQL/MariaDB :3306
              campus_tracker database
```

The API creates the account and resource tables on startup. The importable `database/schema.sql` creates the same schema and loads starter resource entries. MySQL transactions and row locks serialize booking changes.

## CI and team workflow

The GitHub Actions pipeline runs the backend API tests and verifies the Docker Compose build for pushes and pull requests to `main`. Suggested team workflow: work on feature branches, open pull requests into `main`, review changes, and confirm CI passes before merging.

## Design notes

See [docs/design/ux-research-summary.md](docs/design/ux-research-summary.md) for provisional user needs and [docs/design/figma-prototype-link.md](docs/design/figma-prototype-link.md) for the team's prototype link. The UX report identifies interview themes as assumptions to validate; no interviews or Figma link were supplied with the project.
