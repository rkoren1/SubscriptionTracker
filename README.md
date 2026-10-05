# Subscription Tracker

A fullstack subscription management app built with:

- .NET 10 Web API
- EF Core with PostgreSQL
- React + Vite frontend

## Prerequisites

- .NET 10 SDK
- Node.js 20+
- Docker Desktop (for the local PostgreSQL container)

## Start PostgreSQL

Make sure Docker Desktop is running, then start the database:

```bash
docker compose up -d
```

This creates a PostgreSQL instance on:

- Host: `localhost`
- Port: `5432`
- Database: `subscriptiontracker`
- User: `postgres`
- Password: `postgres123`

## Run the backend

```bash
dotnet restore
cd SubscriptionTracker.Api
dotnet run
```

The API will listen on `http://localhost:5283` and uses the PostgreSQL connection string in `SubscriptionTracker.Api/appsettings.json`.
The development environment uses a local-only JWT signing key. Configure `Jwt__SigningKey` with a strong value before deploying outside development.

## Run the frontend

```bash
cd SubscriptionTracker.Web
npm install
npm run dev -- --host 0.0.0.0
```

Then open:

- Frontend: `http://localhost:5173`
- API health: `http://localhost:5283/health`

## Accounts and Google sign-in

The app supports email/password registration and login. Subscription endpoints require a signed-in user, and each account only sees its own records. Database migrations, including the Identity user tables, are applied when the API starts.

Google sign-in requires a Google OAuth Web client ID. In Google Cloud Console, add `http://localhost:5173` as an authorized JavaScript origin. Copy `SubscriptionTracker.Web/.env.example` to `.env.local` and set `VITE_GOOGLE_CLIENT_ID` to that client ID. Start the API with the same ID configured:

```powershell
$env:Authentication__Google__ClientId = "your-google-client-id"
dotnet run --project SubscriptionTracker.Api
```

The Google client ID is public, but it must match on both sides. Without it, email/password accounts remain available and the Google button shows that setup is needed.

## Model and storage

The app includes a `Subscription` entity with annual cost calculation and a PostgreSQL-backed EF Core database. The initial migration is generated in:

- `SubscriptionTracker.Api/Migrations/`

## Useful commands

```bash
dotnet test SubscriptionTracker.Tests/SubscriptionTracker.Tests.csproj
cd SubscriptionTracker.Web && npm run build
```
