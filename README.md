# Quick Movie Booking

Full-stack movie booking application with a React frontend and Node.js/Express backend.

Live app: https://quick-movie-booking.vercel.app/

## Project Structure

```
MovieBooking/
  client/   # Frontend (React + Vite)
  server/   # Backend (Express + MongoDB)
```

## Tech Stack

- Frontend: React, Vite, Clerk, Axios, Tailwind CSS
- Backend: Node.js, Express, MongoDB (Mongoose), Clerk, Stripe, Inngest, Nodemailer

## Local Setup

### 1. Install dependencies

Frontend:

```bash
cd client
npm install
```

Backend:

```bash
cd server
npm install
```

### 2. Configure environment variables

Create `.env` files in both `client` and `server` folders.

Client (`client/.env`):

```env
VITE_BASE_URL=http://localhost:3000
VITE_TMDB_IMAGE_BASE_URL=https://image.tmdb.org/t/p/w500
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
VITE_CURRENCY=INR
```

Server (`server/.env`):

```env
MONGODB_URI=your_mongodb_connection_uri
TMDB_API_KEY=your_tmdb_bearer_token
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
SMTP_USER=your_smtp_user
SMTP_PASSWORD=your_smtp_password
SENDER_EMAIL=your_sender_email
```

### 3. Run the app

Start backend (Terminal 1):

```bash
cd server
npm run server
```

Start frontend (Terminal 2):

```bash
cd client
npm run dev
```

Frontend dev URL: `http://localhost:5173`  
Backend dev URL: `http://localhost:3000`

## Available Scripts

Client (`client/package.json`):

- `npm run dev` - Start frontend dev server
- `npm run build` - Build frontend for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

Server (`server/package.json`):

- `npm run server` - Start backend with nodemon
- `npm start` - Start backend with node

## API Base URL

The frontend uses:

- `VITE_BASE_URL` if provided
- Falls back to `http://localhost:3000`

Update `VITE_BASE_URL` to your deployed backend URL for production.
