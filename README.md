# 🏠 Fixora — Home Services Marketplace (TaskRabbit / Urban Company Clone)

**Fixora** is a full-featured, mobile-first on-demand home services marketplace built with React Native and Expo Router. It connects customers seeking trusted home repair and maintenance with verified local professionals.

Connected to Firebase Project: **Fixora** (`majeedumer50@gmail.com`)

---

## 🌟 Ecosystem Overview

The application includes three distinct portals with an instantaneous **1-Tap Role / Portal Switcher**:

### 1. 👤 Customer App
* **🔐 Authentication:** Firebase email/password registration, login, and instant 1-tap demo logins.
* **🏠 Home Screen:** Location selector, active booking tracker banner, seasonal promo banners, service category grid, popular services, top-rated professionals, and trust guarantees.
* **🔍 Search & Filter:** Instant search across titles, categories, and providers; category pills; price sorting (Low to High / High to Low); minimum rating filters (4.8+).
* **📂 Service Categories:** Home Cleaning, Plumbing, Electrical, AC & Appliances, Painting, Carpentry, Moving & Packing, Pest Control.
* **👨‍🔧 Service Provider Profiles:** Professional bio, verification badge, rating score, reviews count, hourly rate, and full catalog of offered services.
* **⭐ Reviews & Ratings:** Real-time customer review display; interactive 5-star rating and review submission upon booking completion.
* **📅 Booking Flow:** 4-step wizard with date picker (next 7 days), time slot selector, saved address picker with inline address creator, special instructions, and transparent bill breakdown.
* **📍 Address Management:** Save Home, Work, and Other addresses with street, apartment, city, state, zip code, and default address flag.
* **📋 My Bookings:** Tabbed views (`All`, `Active`, `Pending`, `Completed`, `Cancelled`) with live status badges.
* **🔄 Live Status Tracker:** Real-time stepper: `Requested` ➔ `Accepted` ➔ `On The Way` ➔ `In Progress` ➔ `Completed`. Customer cancellation with reason.
* **💬 1-on-1 Real-time Chat:** Instant messaging between customer and provider with timestamps, sender bubbles, and quick reply presets.
* **🔔 Notification Center:** In-app updates for booking confirmations, provider status updates, and promotions with unread counter badges.
* **❤️ Saved Favorites:** Bookmark services and providers for fast access.
* **👤 Customer Profile:** Account information, demo persona switcher, and Firebase status settings.

---

### 2. 👨‍🔧 Provider Portal
* **Availability Toggle:** 1-tap switch between `Online / Available` and `Busy`.
* **Dashboard KPIs:** Real-time counter of New Requests, Active Jobs, Completed Jobs, and Average Rating (★).
* **Incoming Booking Requests:** View booking date, time, address, and special notes; 1-tap `Accept` or `Decline`.
* **Job Progress Controls:** Direct advancement through service milestones: `🚗 Mark On The Way` ➔ `🧰 Start Service` ➔ `⭐ Complete Job`.
* **Chat with Customers:** Direct messaging thread with the customer for active bookings.
* **Create & Edit Services:** Add new services with title, category, price ($), duration, description, and custom photo URL; edit or delete anytime.
* **Earnings & Payouts:** Real-time revenue balance, completed jobs tally, average job value, and payout withdrawal flow.

---

### 3. 🛡️ Admin Portal
* **Operations Dashboard:** Live GMV volume, total marketplace bookings, active verified providers count, and platform average rating.
* **Category Demand Analytics:** Visual breakdown of order distribution across service categories.
* **Manage Customers & Providers:** Search directory, toggle provider verification status (`Verified` badge), and review contact info.
* **Manage Categories:** Add new service categories, edit names/descriptions/colors, or remove categories.
* **Manage Platform Services:** Monitor all catalog services across all providers with deletion capability.
* **Manage All Bookings:** Filter all system bookings by status (`Pending`, `Accepted`, `In Progress`, `Completed`, `Cancelled`) with administrative status override controls.
* **Moderate Reviews:** Monitor customer feedback and remove inappropriate reviews.

---

## 🚀 Getting Started

### 1. Start the Dev Server

```bash
# Start dev server
npx expo start
```

Press `w` in the terminal to open in the web browser, or scan the QR code using the **Expo Go** app on iOS / Android.

### 2. Code Quality & Verification

```bash
# Typecheck TypeScript
npx tsc --noEmit

# Lint code
npx expo lint
```

---

## 🔥 Firebase Setup Guide (Project: Fixora)

The app is built to connect to your Firebase project **Fixora** (`majeedumer50@gmail.com`).

### Setting Up Live Firebase Credentials:
1. Open the [Firebase Console](https://console.firebase.google.com/).
2. Select your project **Fixora**.
3. Under **Project Settings** ➔ **General** ➔ **Your Apps**, click on your Web App (or add a Web App if not added yet).
4. Copy the `firebaseConfig` keys.
5. You can configure them in either of two ways:

#### Option A: In-App Configuration (Recommended & Instant)
- Open the Fixora app.
- Go to the **Profile** tab ➔ **Firebase Project Fixora**.
- Paste your API Key, Project ID, Auth Domain, Storage Bucket, and App ID.
- Tap **Save & Connect Firebase**.

#### Option B: Environment Variables (`.env`)
Create a `.env` file in the project root:
```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key_here
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=fixora.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=fixora
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=fixora.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### Cloud Firestore Collections Structure:
- `categories`: `{ id, name, slug, icon, description, color, servicesCount }`
- `services`: `{ id, providerId, providerName, categoryId, title, price, duration, description, imageUrl, rating, reviewsCount, isPopular, isActive }`
- `users`: `{ id, email, name, phone, role, avatar, bio, hourlyRate, rating, isVerified, availabilityStatus, earnings }`
- `bookings`: `{ id, customerId, providerId, serviceId, status, date, timeSlot, address, notes, totalPrice, paymentMethod, paymentStatus }`
- `messages`: `{ id, bookingId, senderId, senderName, senderRole, recipientId, text, timestamp, isRead }`
- `reviews`: `{ id, bookingId, serviceId, providerId, customerId, customerName, rating, comment, createdAt }`
- `notifications`: `{ id, userId, title, message, type, read, bookingId, createdAt }`

> **Note on Offline / Sandbox Mode:** If Firebase credentials are not yet entered or network is offline, Fixora automatically operates on a robust local storage engine with pre-seeded, realistic data so all features, portals, and flows can be tested immediately without network dependency.

---

## 👥 Demo Personas for Instant Testing

Use the **Switch Experience / Portal** card or demo buttons in the **Profile** screen to test any persona in 1 click:

1. **Customer Persona (`Alex Morgan`)**:
   - Email: `alex.morgan@example.com`
   - Active bookings in progress, saved addresses, and reviews.
2. **Provider Persona (`David Miller`)**:
   - Email: `david.electric@fixora.com`
   - Licensed electrician & AC specialist with incoming requests, active jobs, and $3,420+ balance.
3. **Admin Persona (`Umer Majeed`)**:
   - Email: `majeedumer50@gmail.com`
   - Full administrative control across the platform.
