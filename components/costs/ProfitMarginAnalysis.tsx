"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  AlertTriangle,
  Target,
  RefreshCw,
  BarChart3,
} from "lucide-react";

interface ProfitMarginData {
  productId: string;
  productName: string;
  productType: string;
  costPrice: number;
  sellingPrice: number;
  totalCostPerUnit: number;
  profitMargin: number;
  profitAmount: number;
  profitPercentage: number;
  lastCalculated: string;
}

interface ProfitAnalysis {
  totalProducts: number;
  profitableProducts: number;
  unprofitableProducts: number;
  averageProfitMargin: number;
  totalProfitAmount: number;
  highProfitProducts: ProfitMarginData[];
  lowProfitProducts: ProfitMarginData[];
  unprofitableProductsList: ProfitMarginData[];
}

export function ProfitMarginAnalysis() {
  const [analysis, setAnalysis] = useState<ProfitAnalysis | null>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [targetMargin, setTargetMargin] = useState(25);
  const [selectedView, setSelectedView] = useState("overview");

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [analysisRes, trendsRes, recommendationsRes] = await Promise.all([
        fetch("/api/profit-margins?action=analysis"),
        fetch("/api/profit-margins?action=trends"),
        fetch(`/api/profit-margins?action=recommendations&targetMargin=${targetMargin}`),
      ]);

      const [analysisData, trendsData, recommendationsData] = await Promise.all([
        analysisRes.json(),
        trendsRes.json(),
        recommendationsRes.json(),
      ]);

      if (analysisData.success) setAnalysis(analysisData.data);
      if (trendsData.success) setTrends(trendsData.data);
      if (recommendationsData.success) setRecommendations(recommendationsData.data);
    } catch (err) {
      setError("Failed to fetch profit margin data");
      console.error("Error fetching profit margin data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateStaleMargins = async () => {
    try {
      setIsUpdating(true);
      const response = await fetch("/api/profit-margins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update-stale", daysSinceLastCalculation: 7 }),
      });

      const data = await response.json();
      if (data.success) {
        await fetchData(); // Refresh data
      } else {
        setError(data.error?.message || "Failed to update profit margins");
      }
    } catch (err) {
      setError("Failed to update profit margins");
      console.error("Error updating profit margins:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [targetMargin]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatPercentage = (percentage: number) => {
    return `${percentage.toFixed(1)}%`;
  };

  const getProfitMarginColor = (margin: number) => {
    if (margin < 0) return "text-red-600";
    if (margin < 10) return "text-orange-600";
    if (margin < 25) return "text-yellow-600";
    return "text-green-600";
  };

  const getProfitMarginBadge = (margin: number) => {
    if (margin < 0) return <Badge variant="destructive">Loss</Badge>;
    if (margin < 10) return <Badge variant="secondary">Low</Badge>;
    if (margin < 25) return <Badge variant="outline">Moderate</Badge>;
    return <Badge variant="default">High</Badge>;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchData}>Retry</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Profit Margin Analysis</h2>
          <p className="text-muted-foreground">
            Cost-based profit calculations and recommendations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="targetMargin">Target Margin:</Label>
            <Input
              id="targetMargin"
              type="number"
              value={targetMargin}
              onChange={(e) => setTargetMargin(Number(e.target.value))}
              className="w-20"
              min="0"
              max="100"
            />
            <span className="text-sm text-muted-foreground">%</span>
          </div>
          <Button
            onClick={updateStaleMargins}
            disabled={isUpdating}
            variant="outline"
          >
            {isUpdating ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Update
          </Button>
        </div>
      </div>

      {/* View Selector */}
      <div className="flex gap-2">
        <Button
          variant={selectedView === "overview" ? "default" : "outline"}
          onClick={() => setSelectedView("overview")}
        >
          Overview
        </Button>
        <Button
          variant={selectedView === "products" ? "default" : "outline"}
          onClick={() => setSelectedView("products")}
        >
          Products
        </Button>
        <Button
          variant={selectedView === "recommendations" ? "default" : "outline"}
          onClick={() => setSelectedView("recommendations")}
        >
          Recommendations
        </Button>
      </div>

      {/* Overview */}
      {selectedView === "overview" && analysis && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analysis.totalProducts}</div>
                <p className="text-xs text-muted-foreground">
                  With selling prices set
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Profitable Products</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {analysis.profitableProducts}
                </div>
                <p className="text-xs text-muted-foreground">
                  {analysis.totalProducts > 0
                    ? `${((analysis.profitableProducts / analysis.totalProducts) * 100).toFixed(1)}%`
                    : "0%"} of total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Unprofitable Products</CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {analysis.unprofitableProducts}
                </div>
                <p className="text-xs text-muted-foreground">
                  Need price adjustment
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg. Profit Margin</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getProfitMarginColor(analysis.averageProfitMargin)}`}>
                  {formatPercentage(analysis.averageProfitMargin)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Across all products
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Product Type Trends */}
          {trends.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Profit Margins by Product Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {trends.map((trend) => (
                    <div key={trend._id} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                      <div>
                        <p className="font-medium capitalize">{trend._id}</p>
                        <p className="text-sm text-muted-foreground">
                          {trend.productCount} product{trend.productCount !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold text-lg ${getProfitMarginColor(trend.averageProfitMargin)}`}>
                          {formatPercentage(trend.averageProfitMargin)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Avg. margin
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Products View */}
      {selectedView === "products" && analysis && (
        <div className="space-y-6">
          {/* High Profit Products */}
          {analysis.highProfitProducts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <TrendingUp className="h-5 w-5" />
                  High Profit Products ('&gt; 50% margin')
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Cost Price</TableHead>
                      <TableHead>Selling Price</TableHead>
                      <TableHead>Profit Margin</TableHead>
                      <TableHead>Profit Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analysis.highProfitProducts.map((product) => (
                      <TableRow key={product.productId}>
                        <TableCell className="font-medium">{product.productName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{product.productType}</Badge>
                        </TableCell>
                        <TableCell>{formatCurrency(product.costPrice)}</TableCell>
                        <TableCell>{formatCurrency(product.sellingPrice)}</TableCell>
                        <TableCell>
                          <span className={getProfitMarginColor(product.profitMargin)}>
                            {formatPercentage(product.profitMargin)}
                          </span>
                        </TableCell>
                        <TableCell className="text-green-600 font-medium">
                          {formatCurrency(product.profitAmount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Low Profit Products */}
          {analysis.lowProfitProducts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-600">
                  <AlertTriangle className="h-5 w-5" />
                  Low Profit Products (0-20% margin)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Cost Price</TableHead>
                      <TableHead>Selling Price</TableHead>
                      <TableHead>Profit Margin</TableHead>
                      <TableHead>Profit Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analysis.lowProfitProducts.map((product) => (
                      <TableRow key={product.productId}>
                        <TableCell className="font-medium">{product.productName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{product.productType}</Badge>
                        </TableCell>
                        <TableCell>{formatCurrency(product.costPrice)}</TableCell>
                        <TableCell>{formatCurrency(product.sellingPrice)}</TableCell>
                        <TableCell>
                          <span className={getProfitMarginColor(product.profitMargin)}>
                            {formatPercentage(product.profitMargin)}
                          </span>
                        </TableCell>
                        <TableCell className="text-orange-600 font-medium">
                          {formatCurrency(product.profitAmount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Unprofitable Products */}
          {analysis.unprofitableProductsList.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <TrendingDown className="h-5 w-5" />
                  Unprofitable Products (Loss-making)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Cost Price</TableHead>
                      <TableHead>Selling Price</TableHead>
                      <TableHead>Loss Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analysis.unprofitableProductsList.map((product) => (
                      <TableRow key={product.productId}>
                        <TableCell className="font-medium">{product.productName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{product.productType}</Badge>
                        </TableCell>
                        <TableCell>{formatCurrency(product.costPrice)}</TableCell>
                        <TableCell>{formatCurrency(product.sellingPrice)}</TableCell>
                        <TableCell className="text-red-600 font-medium">
                          {formatCurrency(Math.abs(product.profitAmount))}
                        </TableCell>
                        <TableCell>
                          <Badge variant="destructive">Loss</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Recommendations View */}
      {selectedView === "recommendations" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Pricing Recommendations (Target: {targetMargin}% margin)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recommendations.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                All products meet the target profit margin of {targetMargin}%
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Current Price</TableHead>
                    <TableHead>Current Margin</TableHead>
                    <TableHead>Recommended Price</TableHead>
                    <TableHead>Potential Increase</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recommendations.slice(0, 20).map((rec) => (
                    <TableRow key={rec.productId}>
                      <TableCell className="font-medium">{rec.productName}</TableCell>
                      <TableCell>{formatCurrency(rec.currentSellingPrice)}</TableCell>
                      <TableCell>
                        <span className={getProfitMarginColor(rec.currentProfitMargin)}>
                          {formatPercentage(rec.currentProfitMargin)}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(rec.recommendedSellingPrice)}
                      </TableCell>
                      <TableCell className="text-green-600 font-medium">
                        +{formatCurrency(rec.potentialProfitIncrease)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}