# Homes - Home Business Platform

A web application for discovering and connecting with local home businesses in Singapore.

## Prerequisites

**IMPORTANT:** Ensure you have the following installed:
- **Node.js** (version 20.x or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js) - version 10.x or higher

To check your versions:
```bash
node --version  # Should be v20.x.x or higher
npm --version   # Should be 10.x.x or higher
```

## Installation Steps

### 1. Clone the Repository
```bash
git clone <repository-url>
cd wad-project
```

### 2. Install Dependencies
```bash
npm install
```

**Note:** If you encounter errors during installation, try:
```bash
npm install --legacy-peer-deps
```

### 3. Set Up Environment Variables
Create a `.env` file in the root directory (see "Environment Variables" section below).

## Running the Application Locally

### Option 1: Run Both Servers (Recommended)
Open **TWO terminal windows** and run:

**Terminal 1 - Frontend:**
```bash
npm run dev
```

**Terminal 2 - Backend (for payments):**
```bash
npm run server
```

### Option 2: Run Frontend Only
If you don't need payment features for testing:
```bash
npm run dev
```

### Access the Application
- **Frontend:** http://localhost:5173
- **Backend:** http://localhost:4242 (only when server is running)

**The application should now be accessible in your browser!**

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

## Troubleshooting

### Common Issues

**1. "Module not found" or dependency errors**
```bash
rm -rf node_modules package-lock.json
npm install
```

**2. Port already in use (5173 or 4242)**
- Close other applications using these ports
- Or change the port in `vite.config.js` (frontend) or `server.js` (backend)

**3. Firebase authentication not working**
- Verify your `.env` file has correct Firebase credentials
- Ensure Firebase project is set up correctly

**4. White screen or blank page**
- Check browser console for errors (F12)
- Verify `npm run dev` is running without errors
- Try clearing browser cache

**5. Payment features not working**
- Ensure backend server is running (`npm run server`)
- Check Stripe API keys in `.env` file

## Features

- User authentication (Email/Password and Google Sign-In)
- Browse businesses by category
- Real-time messaging system
- Booking system with QR codes
- Reviews and ratings with unlock codes
- Stripe payment integration for business boosting
- Admin dashboard for managing reports
- Dark mode support
- Mobile-responsive design

## Tech Stack

- **Frontend:** Vue.js 3, Bootstrap 5, Vite
- **Backend:** Express.js (Node.js)
- **Database:** Firebase Firestore
- **Authentication:** Firebase Auth
- **Payments:** Stripe
- **Maps:** Google Maps API
- **Icons:** Iconify
