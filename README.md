# TrashTrack AI — Smart Waste Management

TrashTrack AI is a comprehensive smart waste management platform designed to connect citizens with municipal workers for efficient waste reporting, tracking, and resolution.

## Features

### Role-Based Access
*   **Citizens:** Can report waste, track the status of their complaints, view their area's municipal zone, and receive notifications.
*   **Workers:** Can view assigned tasks, update task statuses, view priority zones, and manage their daily activities.

### Location Intelligence
*   **Automatic Geolocation:** Securely detects and stores the user's current location via the browser's Geolocation API upon login.
*   **Interactive Maps:** Integrates **Leaflet** with OpenStreetMap tiles to visualize the user's location on their dashboard.
*   **Privacy-First:** Explicitly requests permission before accessing location data; seamlessly handles denied/timeout states without breaking the core experience.

### Secure Authentication
*   JWT-based authentication ensures secure communication between the frontend and backend.
*   User identity (including location updates) is verified server-side, preventing impersonation.

## Tech Stack

### Frontend
*   **React** (built with Vite)
*   **Tailwind CSS** for responsive, modern UI design
*   **Lucide React** for icons
*   **Leaflet & React-Leaflet** for interactive maps
*   **React Router** for navigation

### Backend
*   **Node.js & Express.js**
*   **PostgreSQL** for robust data storage (using `pg`)
*   **Zod** for schema validation
*   **jsonwebtoken** (JWT) for secure authentication

## Getting Started

### Prerequisites
*   Node.js (v18+)
*   PostgreSQL database

### Environment Setup

1.  **Backend (`/backend/.env`)**
    ```env
    PORT=5000
    DATABASE_URL=postgres://user:pass@host:5432/db
    JWT_SECRET=your_jwt_secret
    ```

2.  **Frontend (`/frontend/.env`)**
    ```env
    VITE_API_URL=http://localhost:5000/api/v1
    ```

### Running Locally

1.  Start the backend server:
    ```bash
    cd backend
    npm install
    npm run dev
    ```

2.  Start the frontend development server:
    ```bash
    cd frontend
    npm install
    npm run dev
    ```

## Architecture

The system uses a decoupled architecture where the React frontend communicates with the Node.js backend via RESTful APIs. It emphasizes a premium aesthetic with specialized dashboard experiences depending on the authenticated user's role.