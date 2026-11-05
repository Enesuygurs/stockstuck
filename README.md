# StockStuck

A market dashboard for Borsa Istanbul stocks, TEFAS funds, forex, commodities, crypto and global ETFs. It is built with React, TypeScript and Tailwind CSS on the front end and a small Express API on the back end.

## Features

- **Market overview:** a live ribbon with indices, currencies and commodities.
- **Asset pages:** price charts, key statistics, a technical-analysis gauge, related news and similar assets for each symbol.
- **Heatmap:** a sector heatmap of the market.
- **Funds:** TEFAS fund listings and fund detail pages.
- **Screener and compare:** filter assets, and compare several of them side by side.
- **Macro view:** macroeconomic indicators at a glance.
- **Portfolio:** track your own positions.
- **Search and notifications:** quick symbol search, in-app notifications and optional browser push notifications.
- **Turkish routes:** pages are also available under Turkish paths (`/hisse/:symbol`, `/fonlar`, `/portfoy`, …).

## Getting started

Requirements: Node.js 18 or newer.

```bash
git clone https://github.com/Enesuygurs/stockstuck.git
cd stockstuck
npm install
npm run dev
```

`npm run dev` starts both parts together:

- the API server on `http://localhost:3001` (`server/server.js`);
- the Vite dev server on `http://localhost:5173`.

You can also start them separately with `npm run dev:server` and `npm run dev:client`. Build the front end for production with `npm run build`.

## Project structure

```
server/   Express API, market data services and the technical-analysis engine
src/      React app (pages, components, context, services, utils)
public/   Static assets
```

## Data sources

Market data comes from public Yahoo Finance endpoints, and fund data from TEFAS. Neither is an official API for this use, so availability and accuracy are not guaranteed.

## Disclaimer

This project is for personal and educational use. Nothing shown in the app is financial advice.
