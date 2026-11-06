# AutoHub Ghana

AutoHub is a React and Vite marketplace frontend with a separate Express API and PostgreSQL data store.

## Local setup

1. Install the API packages from this folder with `npm install`.
2. Install the frontend packages with `npm install --prefix client`.
3. Copy `.env.example` to `.env`, set a PostgreSQL connection string, and replace `JWT_SECRET` with a random value of at least 32 characters.
4. Create the local PostgreSQL database and run `npm run db:migrate`.
5. Create a Cloudinary account and set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in `.env` to enable car photo uploads. Keep the API secret on the server.
6. Start the API with `npm run dev:api` and the frontend in another terminal with `npm --prefix client run dev`.

The frontend uses demonstration vehicles when the API is unavailable. When the API is connected, browse results come from active database listings.

## First administrator

Register an account in the app, then promote it from the project root with `npm run admin:promote -- account@example.com`. This changes only that account's role in the database. Sign out and back in to refresh the role in the session.

## API overview

- `GET /api/listings` supports type, keyword, location, price, sorting, and pagination.
- `POST /api/listings` publishes a sale or rental listing for the signed-in owner.
- `POST /api/media/signature` creates short-lived signatures for authenticated car photo uploads.
- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` manage accounts.
- `POST /api/bookings` sends a date request for an active rental listing.
- `/api/admin/listings` lets administrators review and publish or reject listings.

Account sessions use HTTP-only, same-site cookies. Set `FRONTEND_ORIGIN` to the exact deployed frontend origin before production use, and serve the API over HTTPS in production. Signed-in sellers can upload 3–10 photos directly from their phone or computer. A front, rear, and interior view are required. Photos are stored in Cloudinary, and the gallery is saved with the listing in PostgreSQL. New listings appear in the matching sale or rental results after submission. Payment processing is not included.

## Public preview deploy

A Render Blueprint in `render.yaml` deploys the API and built React app from one repository as one web service. In Render, use New > Blueprint and connect this GitHub repository. Render prompts for `DATABASE_URL`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`; use the same Neon URL as in your local `.env`. Render generates `JWT_SECRET`. The service is configured on the Free plan for a preview, so it can sleep after 15 minutes without traffic and may take about a minute to wake. Free instances are for testing/hobby projects, not production.
