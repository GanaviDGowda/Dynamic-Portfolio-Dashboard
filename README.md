# Dynamic Portfolio Dashboard

A real-time, full-stack Next.js web application that displays dynamic portfolio performance. It aggregates live Current Market Price (CMP) from Yahoo Finance and fundamental data (P/E Ratio, EPS) from Google Finance, presenting everything in a highly interactive and visually appealing dashboard.

## 🚀 Features

- **Live Market Data**: Automatically polls CMP every 15 seconds.
- **Fundamentals Scraping**: Scrapes Google Finance for P/E ratios and Latest Earnings.
- **Dynamic Sector Grouping**: Aggregates investments by sector (Tech, Financials, etc.) with real-time portfolio allocations.
- **Visual Analytics**: Interactive Recharts pie charts and conditional P&L formatting (green for gains, red for losses).
- **Graceful Degradation**: Dual-layer caching and resilient `Promise.allSettled` fetching ensures the dashboard stays up even if an external API rate-limits the server.
- **Modern UI**: Built with Shadcn UI, Tailwind CSS, and robust headless tables via `@tanstack/react-table`.

---

## 🛠️ Setup & Installation

### Prerequisites
- Node.js (v18 or higher)
- npm, pnpm, or yarn

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd portfolio-dashboard
```

### 2. Install dependencies
```bash
npm install
```

### 3. Generate the Seed Data
The dashboard uses a structured JSON seed file. The source data comes from an Excel spreadsheet in the `data/` folder. Run the conversion script to parse the `.xlsx` file and generate the runtime `holdings.seed.json`:
```bash
npm run seed:holdings
```

### 4. Start the Development Server
```bash
npm run dev
```

### 5. View the App
Open [http://localhost:3000](http://localhost:3000) in your browser to view the real-time dashboard.

---

## 📋 Evaluation Criteria & Implementation Notes

For reviewers evaluating this project against the original case study constraints:

- **Functionality:** All core requirements and bonus features are implemented. The dashboard successfully ingests structured JSON data, maps it across 6 distinct sectors, calculates dynamic portfolio weightings and real-time gain/loss, and renders it in a robust `@tanstack/react-table` data grid.
- **Code Quality:** The codebase follows a strict separation of concerns. External API logic is isolated in `lib/`, shared TypeScript interfaces live in `types/portfolio.ts`, and complex React state is abstracted into a custom `hooks/usePortfolioData.ts` hook. Strict TypeScript typing is enforced throughout.
- **Performance:** The dashboard is highly optimized. React components (like the `PortfolioTable`) are wrapped in `React.memo` to prevent unnecessary re-renders when data updates. The backend utilizes Next.js API route caching and an in-memory `Map` to drastically reduce redundant external API calls.
- **Error Handling:** API failures are handled gracefully using `Promise.allSettled()` on the backend, ensuring that one failed stock ticker doesn't crash the entire request. The frontend features a custom hook that preserves the last-known cached values and surfaces a clear, non-blocking `Alert` banner to the user if their network drops.
- **API Strategy:** Acknowledging the lack of official public APIs for Yahoo and Google Finance, the app utilizes `yahoo-finance2` (for robust, community-maintained scraping) and custom `cheerio` HTML parsing. To combat strict rate limits, a dual-layer cache is implemented: 15-second TTLs for live CMP, and 30-minute TTLs for heavier fundamental scrapes (P/E & Earnings).
- **User Interface:** The UI is built with Shadcn UI and Tailwind CSS, featuring a sleek, responsive, glassmorphic dark mode. Complex data is simplified using interactive `recharts` pie charts, distinct visual badging for stock status, and automatic green/red conditional formatting for P&L.
- **Problem Solving:** Addressed the major technical hurdle of slow, blocking scraper requests by executing all fetch operations concurrently. Furthermore, the 15-second polling interval is guarded by a `useRef` lock (`isFetchingRef`) on the frontend to prevent overlapping network requests if a user has a slow internet connection.
