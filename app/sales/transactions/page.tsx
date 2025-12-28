'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useGetSalesTransactionsQuery } from '@/lib/store/api';
import { PaymentMethod } from '@/types';
import { Receipt, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

const PAYMENT_METHOD_COLORS: Record<PaymentMethod, string> = {
  'Cash': 'bg-green-100 text-green-800',
  'POS': 'bg-blue-100 text-blue-800',
  'CBE': 'bg-purple-100 text-purple-800',
  'Abyssinia': 'bg-orange-100 text-orange-800',
  'Zemen': 'bg-red-100 text-red-800',
  'Awash': 'bg-yellow-100 text-yellow-800',
  'Telebirr': 'bg-indigo-100 text-indigo-800',
};

export default function SalesTransactionsPage() {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<PaymentMethod | 'all'>('all');

  const { data: transactionsResponse, isLoading, error } = useGetSalesTransactionsQuery({
    page,
    limit,
  });

  const transactions = transactionsResponse?.success ? transactionsResponse.data.data : [];
  const pagination = transactionsResponse?.success ? transactionsResponse.data.pagination : null;

  // Filter transactions based on search and payment method
  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = searchTerm === '' || 
      transaction.items.some((item: any) => 
        item.productId?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    
    const matchesPaymentMethod = paymentMethodFilter === 'all' || 
      transaction.paymentMethod === paymentMethodFilter;

    return matchesSearch && matchesPaymentMethod;
  });

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && pagination && newPage <= pagination.totalPages) {
      setPage(newPage);
    }
  };

  const getTotalSales = () => {
    return filteredTransactions.reduce((total, transaction) => total + transaction.totalAmount, 0);
  };

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              Error loading sales transactions. Please try again.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-2 mb-6">
        <Receipt className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Sales Transactions</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total Transactions</div>
            <div className="text-2xl font-bold">{filteredTransactions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total Sales</div>
            <div className="text-2xl font-bold">${getTotalSales().toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Average Sale</div>
            <div className="text-2xl font-bold">
              ${filteredTransactions.length > 0 ? (getTotalSales() / filteredTransactions.length).toFixed(2) : '0.00'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by product name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Select value={paymentMethodFilter} onValueChange={(value) => setPaymentMethodFilter(value as PaymentMethod | 'all')}>
                <SelectTrigger>
                  <SelectValue placeholder="Payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payment Methods</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="POS">POS Card</SelectItem>
                  <SelectItem value="CBE">CBE Birr</SelectItem>
                  <SelectItem value="Abyssinia">Abyssinia Bank</SelectItem>
                  <SelectItem value="Zemen">Zemen Bank</SelectItem>
                  <SelectItem value="Awash">Awash Bank</SelectItem>
                  <SelectItem value="Telebirr">Telebirr</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading transactions...</div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No transactions found
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead className="text-right">Total Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((transaction) => (
                      <TableRow key={transaction._id}>
                        <TableCell>
                          <div className="font-medium">
                            {format(new Date(transaction.createdAt), 'MMM dd, yyyy')}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(transaction.createdAt), 'HH:mm:ss')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {transaction.items.map((item: any, index: number) => (
                              <div key={index} className="text-sm">
                                <span className="font-medium">
                                  {item.productId?.name || 'Unknown Product'}
                                </span>
                                <span className="text-muted-foreground ml-2">
                                  × {item.quantity} @ ${item.unitPrice.toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="secondary"
                            className={PAYMENT_METHOD_COLORS[transaction.paymentMethod]}
                          >
                            {transaction.paymentMethod}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          ${transaction.totalAmount.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                    {pagination.total} transactions
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <span className="text-sm">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page >= pagination.totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}