'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Receipt, TrendingUp, CreditCard } from 'lucide-react';
import { useGetSalesTransactionsQuery } from '@/lib/store/api';
import { format, startOfDay, endOfDay } from 'date-fns';

export default function SalesPage() {
  // Get today's sales data for quick stats
  const { data: transactionsResponse } = useGetSalesTransactionsQuery({
    page: 1,
    limit: 100, // Get more data for better stats
  });

  const transactions = transactionsResponse?.success ? transactionsResponse.data.data : [];
  
  // Calculate today's sales
  const today = new Date();
  const todayTransactions = transactions.filter(transaction => {
    const transactionDate = new Date(transaction.createdAt);
    return transactionDate >= startOfDay(today) && transactionDate <= endOfDay(today);
  });

  const todaysSales = todayTransactions.reduce((total, transaction) => total + transaction.totalAmount, 0);
  const todaysTransactionCount = todayTransactions.length;

  // Calculate payment method distribution
  const paymentMethodStats = transactions.reduce((acc, transaction) => {
    acc[transaction.paymentMethod] = (acc[transaction.paymentMethod] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const mostUsedPaymentMethod = Object.entries(paymentMethodStats).reduce(
    (max, [method, count]) => count > max.count ? { method, count } : max,
    { method: 'N/A', count: 0 }
  );

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-2 mb-6">
        <ShoppingCart className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Sales Management</h1>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-sm text-muted-foreground">Today's Sales</div>
                <div className="text-2xl font-bold">${todaysSales.toFixed(2)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-blue-600" />
              <div>
                <div className="text-sm text-muted-foreground">Today's Transactions</div>
                <div className="text-2xl font-bold">{todaysTransactionCount}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-purple-600" />
              <div>
                <div className="text-sm text-muted-foreground">Popular Payment</div>
                <div className="text-2xl font-bold">{mostUsedPaymentMethod.method}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Point of Sale */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Point of Sale
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Process new sales transactions with product selection and payment processing.
            </p>
            <div className="space-y-2 mb-4">
              <div className="text-sm">• Select products and quantities</div>
              <div className="text-sm">• Choose payment method</div>
              <div className="text-sm">• Automatic stock updates</div>
              <div className="text-sm">• Real-time calculations</div>
            </div>
            <Link href="/sales/pos">
              <Button className="w-full">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Start New Sale
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Transaction History */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Transaction History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              View and analyze all sales transactions with detailed information.
            </p>
            <div className="space-y-2 mb-4">
              <div className="text-sm">• Complete transaction records</div>
              <div className="text-sm">• Filter by payment method</div>
              <div className="text-sm">• Search by product</div>
              <div className="text-sm">• Sales analytics</div>
            </div>
            <Link href="/sales/transactions">
              <Button variant="outline" className="w-full">
                <Receipt className="h-4 w-4 mr-2" />
                View Transactions
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions Preview */}
      {todayTransactions.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Recent Transactions Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {todayTransactions.slice(0, 5).map((transaction) => (
                <div key={transaction._id} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <div className="font-medium">
                      {transaction.items.length} item{transaction.items.length !== 1 ? 's' : ''}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(transaction.createdAt), 'HH:mm:ss')} • {transaction.paymentMethod}
                    </div>
                  </div>
                  <div className="font-bold">
                    ${transaction.totalAmount.toFixed(2)}
                  </div>
                </div>
              ))}
              {todayTransactions.length > 5 && (
                <div className="text-center pt-2">
                  <Link href="/sales/transactions">
                    <Button variant="ghost" size="sm">
                      View all {todayTransactions.length} transactions
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}