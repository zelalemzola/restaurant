# Restaurant ERP System

A comprehensive Enterprise Resource Planning (ERP) system designed specifically for restaurants to manage inventory, track sales, monitor costs, and analyze profitability.

## Features

- **Inventory Management**: Track stock levels, manage products with custom metrics, and receive low stock alerts
- **Sales Tracking**: Record sales transactions with multiple payment methods
- **Cost Management**: Monitor operational costs including rent, salaries, and one-time expenses
- **Analytics & Reporting**: View comprehensive reports and business insights
- **Notifications**: Stay updated with system alerts and low stock warnings
- **Dashboard**: Overview of key performance indicators and metrics

## Technology Stack

- **Frontend**: Next.js 14 with App Router, TypeScript, Tailwind CSS, shadcn/ui
- **State Management**: RTK Query for API calls and caching
- **Backend**: Next.js API Routes with TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Validation**: Zod for runtime type checking
- **UI Components**: shadcn/ui with Radix UI primitives

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or cloud instance)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up environment variables:

   ```bash
   cp .env.local.example .env.local
   ```

   Update the `.env.local` file with your MongoDB connection string:

   ```
   MONGODB_URI=mongodb://localhost:27017/restaurant-erp
   ```

4. Run the development server:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

### Building for Production

```bash
npm run build
npm start
```

## Project Structure

```
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   └── ui/               # shadcn/ui components
├── lib/                  # Utility libraries
│   ├── models/           # Mongoose models
│   ├── providers/        # React providers
│   ├── store/            # Redux store and RTK Query
│   ├── validations/      # Zod validation schemas
│   ├── mongodb.ts        # Database connection
│   └── utils.ts          # Utility functions
├── types/                # TypeScript type definitions
└── public/               # Static assets
```

## API Endpoints

- `GET /api/product-groups` - Get all product groups
- `POST /api/product-groups` - Create a new product group
- More endpoints will be added as features are implemented

## Development

This project follows a spec-driven development approach. The implementation is organized into tasks that can be found in `.kiro/specs/restaurant-erp-system/tasks.md`.

## Contributing

1. Follow the existing code style and patterns
2. Add appropriate TypeScript types
3. Include validation using Zod schemas
4. Test your changes thoroughly

## License

This project is private and proprietary.
