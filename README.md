# DevOps Website — User Management Dashboard

A full-stack CRUD application for managing user information using **React.js, Node.js, Express.js, and PostgreSQL**.

The application allows users to create, view, update, and delete user records containing names and email addresses.

## 🚀 Tech Stack

- **Frontend:** React.js
- **Backend:** Node.js and Express.js
- **Database:** PostgreSQL
- **Web Server:** Nginx
- **Cloud Platform:** AWS EC2
- **Version Control:** Git and GitHub
- **API Testing:** curl and Postman

## 📁 Project Structure

```text
devops-website/
├── frontend/
│   ├── package.json
│   └── src/
├── backend/
│   ├── index.js
│   ├── database.js
│   └── package.json
└── README.md
```

## 🛠️ Prerequisites

Ensure the following software is installed:

- Git
- Node.js and npm
- PostgreSQL

## 🗄️ Database Setup

### 1. Create the database

Connect to PostgreSQL and execute:

```sql
CREATE DATABASE api;
```

### 2. Create the users table

Connect to the `api` database and execute:

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200),
    email VARCHAR(200)
);
```

## ⚙️ Backend Setup

### 1. Clone the repository

Replace the URL with your actual GitHub repository URL.

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd devops-website/backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure the database

Update `database.js` or your environment configuration with the correct PostgreSQL connection details.

**Security:** Never commit database passwords or other secrets to GitHub.

### 4. Start the backend

```bash
npx nodemon index.js
```

The backend is expected to run on port `5050`.

## 💻 Frontend Setup

Open a separate terminal.

### 1. Navigate to the frontend directory

```bash
cd devops-website/frontend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the frontend

```bash
npm start
```

The frontend is expected to run on port `3000`.

## 🔌 API Endpoints

The following endpoints are expected for a standard CRUD implementation. Confirm them against your actual backend routes.

| HTTP Method | Endpoint | Description |
|---|---|---|
| GET | `/users` | Retrieve all users |
| POST | `/users` | Create a new user |
| PUT | `/users/:id` | Update an existing user |
| DELETE | `/users/:id` | Delete a user |

## ▶️ Run the Application Locally

1. Start PostgreSQL.
2. Start the backend on port `5050`.
3. Start the frontend on port `3000`.
4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## ☁️ AWS Deployment

The application can be hosted on an AWS EC2 instance.

- **Nginx:** Serves the frontend.
- **Node.js and Express.js:** Handle backend API requests.
- **PostgreSQL:** Stores application data.
- **AWS EC2:** Hosts the application components.

Configure Nginx and the frontend API URL to route requests to the backend correctly.

## 🔐 Security Best Practices

- Store database credentials in environment variables.
- Keep `.env` files out of version control.
- Use a `.gitignore` file to exclude secrets and unnecessary files.
- Restrict access through appropriate AWS security group rules.
- Avoid exposing PostgreSQL directly to the public internet.

## 🔮 Future Improvements

- Implement user authentication and authorization.
- Add input validation and error handling.
- Set up CI/CD using GitHub Actions.
- Add application logging and health checks.
- Configure database backups and monitoring.
- Improve deployment automation and security.

## 📄 License

Add a license if you intend to distribute this project publicly.

