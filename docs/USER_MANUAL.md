# Campus Commons application manual

## Start the app with XAMPP

1. Install and open XAMPP Control Panel.
2. Start **MySQL**. Apache is optional; if started, phpMyAdmin is usually at `http://localhost/phpmyadmin`.
3. In phpMyAdmin, import `database/schema.sql`. This creates the `campus_tracker` database, tables, and starter resource records.
4. In the project root, copy `.env.example` to `.env`. Set the database user/password to match XAMPP. Set a long random `JWT_SECRET` before sharing the app.
5. Start Docker Desktop.
6. In the project folder run `docker compose up --build`.
7. Open `http://localhost:3000`.

The app connects through the API at `http://localhost:5000`, which connects to the XAMPP database on port 3306. Keep XAMPP MySQL running while using the app. Stop the app with `Ctrl+C` in the compose terminal. Application records stay in the XAMPP database.

## Register and sign in

1. On the welcome page select **Student** or **Lecturer**. The page changes its design and registration fields for the selected account.
2. Select **Create an account**.
3. Enter your name, campus email, and a password of at least 8 characters. Enter a student ID or staff ID. Lecturer registration also asks for a department.
4. Select **Create account**. The app signs you in and opens your role dashboard.
5. Later, choose the same account type, enter your email and password, and select **Sign in**.
6. Select **Sign out** from the header to end the session in the current browser.

## Student dashboard

- Browse resources and filter by Lab Equipment, Study Room, or Study Material.
- Search by resource name.
- Select **Reserve this** on an available resource.
- Your reservation shows your name. Only you can return it with **Return resource**.
- A resource already reserved by another student is marked unavailable.

## Lecturer dashboard

- Review total, available, and in-use resources.
- Filter/search the same shared catalog.
- Select **Add a resource**, enter its name and category, then submit it to the campus board.
- Lecturer accounts cannot reserve resources as students.

## Database and troubleshooting

- Account details and resource/booking data are stored in the `campus_tracker` database in XAMPP MySQL/MariaDB.
- If the API cannot connect, confirm XAMPP MySQL is running and check the `.env` connection fields. In phpMyAdmin, confirm the `campus_tracker` database exists.
- If using Docker and MySQL connection is refused, confirm port 3306 is open to Docker Desktop and MySQL is listening on the network interface.
- If port 3000 or 5000 is busy, stop the other service or change the port mapping in `docker-compose.yml`.
- The API health endpoint is `http://localhost:5000/api/health`.

## Account security notes

Passwords are hashed before storage. Login sessions expire after 12 hours. This classroom app allows lecturer self-registration; use staff approval or invite codes before deploying for a real institution. Set your own JWT secret and use HTTPS for any shared deployment.
