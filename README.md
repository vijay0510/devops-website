DevOps Website — User Management Dashboard

A full-stack CRUD application for managing user information using React.js, Node.js, Express.js, and PostgreSQL.

The application allows users to create, read, update, and delete user records containing names and email addresses.

Tech Stack

Frontend: React.js

Backend: Node.js and Express.js

Database: PostgreSQL

API Testing: curl / Postman

Web Server: Nginx (for deployment)

Cloud Platform: AWS EC2

Version Control: Git and GitHub

Project Structure

devops-website/
├── frontend/
│   ├── package.json
│   └── src/
├── backend/
│   ├── index.js
│   ├── database.js
│   └── package.json
└── README.md

Note: The structure above is an example. Update it to match your actual project files.

Prerequisites

Install the following before running the application:

Node.js and npm

PostgreSQL

Git

Database Setup

Connect to PostgreSQL and create the database:

CREATE DATABASE api;

Connect to the api database, then create the users table:

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200),
    email VARCHAR(200)
);

Backend Setup

Open a terminal and run:

git clone <YOUR_GITHUB_REPOSITORY_URL>
cd <YOUR_PROJECT_DIRECTORY>/backend
npm install

Configure the PostgreSQL connection in database.js using your local database credentials.

Start the backend:

npx nodemon index.js

The backend runs on port 5050, assuming this is the port configured in your application.

Frontend Setup

Open another terminal:

cd <YOUR_PROJECT_DIRECTORY>/frontend
npm install
npm start

The frontend runs on port 3000, assuming this is the port configured in your application.

API Endpoints

Update these endpoints to match the routes implemented in your backend.

Method

Endpoint

Purpose

GET

/users

Retrieve all users

POST

/users

Create a user

PUT

/users/:id

Update a user

DELETE

/users/:id

Delete a user

Running Locally

Start PostgreSQL.

Start the backend on port 5050.

Start the frontend on port 3000.

Open http://localhost:3000 in your browser.

AWS Deployment

The application can be deployed on an AWS EC2 instance.

Nginx serves the frontend.

Node.js and Express handle backend API requests.

PostgreSQL stores user records.

Configure the frontend to communicate with the backend through the appropriate API URL and configure Nginx to route API requests if required.

Security Notes

Do not commit database passwords, AWS credentials, or API secrets to GitHub.

Use environment variables for sensitive configuration.

Restrict database and backend access using appropriate network and security group rules.

Future Improvements

Add user authentication and authorization.

Add input validation and error handling.

Use environment variables for configuration.

Configure automated deployment with a CI/CD pipeline.

Add logging and application health checks.

Implement database backups and monitoring.

License

Add a license if you intend to distribute this project publicly.
