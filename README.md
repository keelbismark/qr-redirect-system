# QR Redirect System

## Project Overview

This repository contains a web-based QR Redirect System, built using Node.js, Express.js, and JavaScript. It provides a user interface for managing QR code redirects, including creating, editing, and tracking QR code usage statistics.

## Key Features & Benefits

*   **QR Code Generation:**  Generates QR codes that redirect users to specified URLs.
*   **URL Management:** Allows administrators to create, edit, and delete redirect URLs.
*   **Statistics Tracking:**  Tracks the number of scans and geographic locations (using geoip-lite) of QR code usage.
*   **User Authentication:** Implements a secure authentication system for administrators.
*   **Customizable Admin Interface:** Provides an intuitive web interface for managing QR code redirects.

## Prerequisites & Dependencies

Before you begin, ensure you have the following installed:

*   **Node.js:**  (Version >= 14 recommended)  [https://nodejs.org/](https://nodejs.org/)
*   **npm** (Node Package Manager):  Comes with Node.js.  Verify with `npm -v`.

## Installation & Setup Instructions

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/keelbismark/qr-redirect-system.git
    cd qr-redirect-system
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Create a `.env` file:**

    Create a `.env` file in the root directory based on the `.env.example` file. Populate it with the required environment variables (see Configuration Options).  The `.env.example` file will look similar to the following:

    ```
    PORT=3000
    DATABASE_URL=your_database_url
    JWT_SECRET=your_jwt_secret
    ADMIN_USERNAME=your_admin_username
    ADMIN_PASSWORD=your_admin_password
    ```

4.  **Set up the database:**

    Execute the SQL schema located in `schema-v2.sql` to create the necessary database tables.  Use a database client (like MySQL Workbench, pgAdmin, or similar) to connect to your database and run the script.

5.  **Start the application:**

    ```bash
    npm start
    ```

    Alternatively, for development with automatic restarts on code changes:

    ```bash
    npm run dev
    ```

    The application will be accessible at `http://localhost:<PORT>`, where `<PORT>` is defined in your `.env` file (default is 3000).

## Usage Examples

1.  **Access the Admin Interface:** Navigate to `http://localhost:<PORT>/admin/index.html` to access the admin dashboard.  You'll need to log in using the credentials set in the `.env` file.

2.  **Create a new QR code redirect:**  In the admin dashboard, navigate to the "Create" page (`create.html`).  Enter the target URL and other relevant details.  The system will generate a QR code image for you to download and use.

3.  **Edit an existing QR code redirect:**  In the admin dashboard, navigate to the "Links" page (`links.html`).  You'll see a list of existing QR code redirects.  Select the entry you want to edit and modify the URL or other parameters.

4.  **View statistics:**  Navigate to the "Stats" page (`stats.html`) to view statistics about the usage of your QR code redirects.

## Configuration Options

The application's behavior is configured using environment variables defined in the `.env` file:

*   **`PORT`:**  The port on which the application listens for incoming requests.
*   **`DATABASE_URL`:**  The connection string to your database (e.g., MySQL, PostgreSQL).
*   **`JWT_SECRET`:**  A secret key used for signing JSON Web Tokens (JWTs) for authentication.  Keep this secret secure.
*   **`ADMIN_USERNAME`:** The username for the administrative user.
*   **`ADMIN_PASSWORD`:** The password for the administrative user.

## Contributing Guidelines

We welcome contributions to this project! To contribute:

1.  Fork the repository.
2.  Create a new branch for your feature or bug fix.
3.  Make your changes and write tests.
4.  Submit a pull request.

## License Information

License not specified.

## Acknowledgments

*   The project uses the `geoip-lite` library for geolocation.
*   The project uses `express-rate-limit` for rate limiting API requests.
*   The project uses the following libraries: bcrypt, canvas, crypto, dotenv, express, express-rate-limit, geoip-lite, jsonwebtoken, multer
