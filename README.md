# Krishsan Tech Enterprise P & P Service Management

Krishsan Tech Enterprise P & P Service Management is a high-fidelity, professional-grade print management and cloud fulfillment system designed for modern print shops. The platform provides a dual-portal experience: a high-efficiency operations terminal for Shopkeepers and Shop Owners, and a self-service cloud checkout portal for Customers.

---

## 🌟 Key System Features & Portals

### 1. Operations Management Terminal (Admin Portal)
Designed for maximum information density, clean typography, and real-time responsiveness.
- **Uniform Dashboard Banner:** Displays system name and live synchronized date/time.
- **Fulfillment KPI Row:** Real-time metrics counting:
  - **Active Queue:** Print jobs currently in queue (excluding frozen tasks).
  - **Pending Payments:** Completed orders awaiting checkout.
  - **Today's Revenue:** Aggregate revenue generated from completed orders today.
  - **Completed Today:** Counter of successfully finished printing jobs.
  - **Total Orders:** Cumulative lifetime order statistics.
- **Analytical Chart Suite:**
  - **Revenue Trend:** Cumulative 7-day line chart utilizing clean whole-number Y-axis scaling (0 to 150).
  - **Daily Jobs Volume:** Visual bar chart tracking orders processed daily with Tuesday volume highlighting.
  - **Status Breakdown:** Real-time status allocation donut chart with overlay center text indicator (e.g., "19 Total").
- **Live Sync Queue Manager:** An interactive listing syncing all Firestore jobs instantly. Shopkeepers can:
  - Retrieve original uploaded files directly from secure cloud preview states.
  - Advance status states: `Pending` ➔ `Processing` ➔ `Ready` ➔ `Completed`.
  - Flag unreadable/corrupted files as `Action Required: File Error`.
  - Pause print orders on mechanical jam or empty stock as `On Hold`.
  - Auto-refresh mechanism ensuring data integrity across multiple terminals.

### 2. Self-Service Portal (Customer Portal)
A premium, responsive interface featuring elegant glassmorphism designs, rounded card layouts, and harmonious gradients.
- **Modern Auth Experience:** Interactive role-based sign-in/sign-up forms styled with frosted glass containers and blurred background decoration blobs.
- **Interactive Catalogue:** Customers can browse available services (Academic, Marketing, Documents, Large Format), view turnaround times, and place orders.
- **Dynamic Configuration Form:** Enforces automatic pricing updates based on pages, color choices, bindings (spiral, hardcover, staple), and thesis embossing rules.
- **Milestone Stepper:** Shows the real-time operational status (Placed ➔ Paid ➔ Printing ➔ Ready ➔ Completed) directly on the customer feed.
- **Secure Payment Integration:** Simulates multiple payment channels (E-Wallet, FPX online banking, QR Pay) with a 15-minute checkout countdown and automatically updates order status to `"Paid"` upon receiving a successful transaction token.
- **Draft Recovery:** If a user cancels during payment checkout, the system saves their configuration as a `Draft` in the database, allowing them to resume checkout within 24 hours.

---

## 📂 System Architecture & Technologies

- **Frontend Core:** React, React Router (SPA Routing), Framer Motion (Page Transitions and Micro-animations), Lucide React (Monochromatic Icons).
- **Backend Services:** Firebase Authentication (Secure customer access) and Cloud Firestore (Real-time database sync using `onSnapshot` listeners).
- **Design System:** Geometric typography, harmonized off-white body backgrounds (`#F4F5F7`), white sidebar card containers (`bg-white`), and rich gradients (indigo-to-blue active highlights).

---

## 🚀 Getting Started

### Installation
Clone the repository, navigate to the folder, and install dependencies:
```bash
cd inventory-systems
npm install
```

### Running Locally
To launch the hot-reloading development server:
```bash
npm start
```
Open [http://localhost:3000](http://localhost:3000) to view the application in your browser.

### Building for Production
To bundle and optimize the application for deployment:
```bash
npm run build
```
This generates a minified, production-ready bundle inside the `build` directory.
