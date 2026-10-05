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

## Run the frontend

```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0
```

Then open:

- Frontend: `http://localhost:5173`
- API health: `http://localhost:5283/health`

## Model and storage

The app includes a `Subscription` entity with annual cost calculation and a PostgreSQL-backed EF Core database. The initial migration is generated in:

- `SubscriptionTracker.Api/Migrations/`

## Useful commands

```bash
dotnet test SubscriptionTracker.Tests/SubscriptionTracker.Tests.csproj
cd frontend && npm run build
```
