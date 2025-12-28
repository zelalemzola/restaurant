// Sales transactions API routes (alias for /api/sales/transactions)
import { NextRequest } from "next/server";

// Re-export the handlers from the main sales transactions route
export { GET, POST } from "../sales/transactions/route";

// This file provides an alias for the sales transactions API
// to match the expected endpoint in the RTK Query store configuration
