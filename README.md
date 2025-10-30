# Home Business Platform

A web application for discovering and connecting with local home businesses in Singapore.

## Prerequisites

- Node.js (version 20.19.0 or higher)
- npm (comes with Node.js)

## Installation

Clone the repository and install dependencies:

```bash
npm install
```

## Running the Application

Start the frontend development server:
```bash
npm run dev
```

Start the backend server (required for payment features):
```bash
npm run server
```

The frontend will be available at `http://localhost:5173`
The backend runs on port 4242

## Environment Variables

Create a `.env` file in the root directory with the following:

```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id

STRIPE_SECRET_KEY=your_stripe_secret_key
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
PRICE_ID_1D=price_id_for_1_day
PRICE_ID_7D=price_id_for_7_days
PRICE_ID_30D=price_id_for_30_days
```

## Testing Payments

Use Stripe test cards for testing payment features:
- Card: `4242 4242 4242 4242`
- Expiry: Any future date
- CVC: Any 3 digits
- ZIP: Any 5 digits

## Features

- User authentication (Email/Password and Google Sign-In)
- Browse businesses by category
- Booking system with QR codes
- Reviews and ratings
- Stripe payment integration
- Admin dashboard
- Dark mode support

## Tech Stack

- Vue.js 3
- Firebase (Authentication & Firestore)
- Stripe
- Bootstrap 5
- Express.js
- Vite

## Build for Production

```bash
npm run build
```
