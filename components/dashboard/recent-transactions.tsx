"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

interface RecentTransaction {
  _id: string;
  totalAmount: number;
  paymentMethod: string;
  itemCount: number;
  createdAt: string;
  items: Array<{
    productName: string;
    quantity: number;
    totalPrice: number;
  }>;
}

interface RecentTransactionsProps {
  transactions: RecentTransaction[];
  isLoading?: boolean;
}

export function RecentTransactions({ transactions, isLoading }: RecentTransactionsProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-3 bg-muted rounded w-2/3 animate-pulse" />
                </div>
                <div className="h-6 w-16 bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Transactions</CardTitle>
        <Link href="/sales/transactions">
          <Button variant="outline" size="sm">
            View All
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            No recent transactions
          </div>
        ) : (
          <div className="space-y-4">
            {transactions.map((transaction) => (
              <div key={transaction._id} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      ${transaction.totalAmount.toFixed(2)}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {transaction.paymentMethod}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {transaction.itemCount} item{transaction.itemCount !== 1 ? 's' : ''} • {' '}
                    {formatDistanceToNow(new Date(transaction.createdAt), { addSuffix: true })}
                  </div>
                  {transaction.items.length > 0 && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {transaction.items.slice(0, 2).map((item, index) => (
                        <span key={index}>
                          {item.productName} ({item.quantity})
                          {index < Math.min(transaction.items.length, 2) - 1 && ', '}
                        </span>
                      ))}
                      {transaction.items.length > 2 && (
                        <span> +{transaction.items.length - 2} more</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}