# Kotak

Kotak is a modern, self-hosted file management system built with SvelteKit that provides secure file storage, organization, and sharing capabilities. This web-based application allows you to upload, organize, preview, and share files through an intuitive interface, essentially giving you your own personal cloud storage solution that you control completely.

## Core Features

**File Management**: Upload files through drag-and-drop, organize them in folders, and manage everything through a clean, responsive interface. The system supports bulk operations for efficient file handling.

**Smart Preview**: View images, documents, and other files directly in the browser without downloading. The preview system adapts to different file types and screen sizes.

**Secure Sharing**: Share files and folders with others through secure links. Control access with read/write permissions and optional expiration dates. Share publicly or with specific email addresses.

**Search & Navigation**: Quickly find files using the built-in search functionality. Navigate through your file hierarchy with an intuitive sidebar and breadcrumb system.

**Trash Management**: Deleted files are safely stored in a trash system, allowing recovery when needed. Permanently delete files when you're ready.

**User Authentication**: Secure login system with session management ensures your files remain private and accessible only to authorized users.

## Self-Hosting

Kotak is designed for easy deployment using Docker Compose. The included configuration sets up the complete stack with PostgreSQL database and the web application.

### Quick Start

Create a directory for your Kotak deployment and download the necessary configuration files:

```bash
mkdir kotak && cd kotak
wget https://raw.githubusercontent.com/PXR05/kotak/main/compose.yaml
wget https://raw.githubusercontent.com/PXR05/kotak/main/.env.example
mv .env.example .env
```

Configure your environment variables in `.env`:

- `DATABASE_PASSWORD`: Set a secure password for PostgreSQL
- `DATABASE_URL`: PostgreSQL connection string (e.g., `postgresql://root:your_password@db:5432/kotak`)
- `PROTOCOL`: Protocol for your deployment (`http` or `https`)
- `DOMAIN`: Your domain name or IP address
- `LIMITER_SECRET`: Secret for rate limiting

Deploy with Docker Compose:

```bash
docker-compose up -d
```

The application will be available at `http://your-domain:4321`. For production deployments, you should set up a reverse proxy (like Nginx or Traefik) to handle SSL certificates and proxy requests to port 4321.

## Project Structure

The codebase follows SvelteKit conventions with a clear separation of concerns:

**Frontend Components**: Located in `src/lib/components/`, organized by feature areas including dialogs, file tables, sidebar navigation, and reusable UI components.

**API Routes**: RESTful endpoints in `src/routes/api/` handle file operations, folder management, search, and sharing functionality.

**Database Layer**: Drizzle ORM manages the PostgreSQL database with schemas defined in `src/lib/server/db/`. The system tracks users, files, folders, shares, and trash items.

**State Management**: Svelte 5's reactive state system manages application state, with stores organized by feature in `src/lib/stores/`.

**Authentication**: Session-based authentication using secure cookies, with utilities in `src/lib/server/auth.ts`.

## Development

### Prerequisites

Kotak uses [Bun](https://bun.sh) as its runtime and package manager, you can use Node.js instead, but Bun is recommended.

### Setup

Install dependencies and set up your development environment:

```bash
bun i
cp .env.example .env.local
```

Configure your local database connection in `.env.local`. For development, you can use the included `compose.dev.yaml`:

```bash
docker-compose -f compose.dev.yaml up -d
```

Run database migrations and start the development server:

```bash
bun run db:migrate
bun run dev
```

The application will be available at `http://localhost:5173`.
