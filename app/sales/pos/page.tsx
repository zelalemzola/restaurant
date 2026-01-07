"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  useRealTimeUpdates,
  useOptimisticUpdates,
} from "@/lib/hooks/useRealTimeUpdates";
import {
  useGetProductsQuery,
  useCreateSalesTransactionMutation,
} from "@/lib/store/api";
import { PaymentMethod } from "@/types";
import { ShoppingCart, Plus, Minus, Trash2, CreditCard } from "lucide-react";
import { BackButton } from "@/components/navigation/BackButton";
import { Breadcrumb } from "@/components/navigation/Breadcrumb";

interface CartItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  metric: string;
  type: string;
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "Cash", label: "Cash" },
  { value: "POS", label: "POS Card" },
  { value: "CBE", label: "CBE Birr" },
  { value: "Abyssinia", label: "Abyssinia Bank" },
  { value: "Zemen", label: "Zemen Bank" },
  { value: "Awash", label: "Awash Bank" },
  { value: "Telebirr", label: "Telebirr" },
];

export default function PointOfSalePage() {
  const router = useRouter();
  const { toast } = useToast();

  // Enable real-time updates for products and sales
  useRealTimeUpdates({
    enableProducts: true,
    enableInventory: true,
    enableSales: true,
    enableCosts: false,
    enableNotifications: false,
  });

  // Hook for optimistic updates
  const { invalidateAfterMutation } = useOptimisticUpdates();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch sellable and combination products
  const { data: productsResponse, isLoading } = useGetProductsQuery({
    limit: 100,
    search: searchTerm,
  });

  const [createSalesTransaction, { isLoading: isCreating }] =
    useCreateSalesTransactionMutation();

  const products = productsResponse?.success
    ? productsResponse.data.products
    : [];
  // Show all products, but indicate which ones are sellable
  const allProducts = products;
  console.log(allProducts[0]);
  const addToCart = (product: any) => {
    // Use selling price if available, otherwise use cost price, otherwise default to 0
    const price = product.sellingPrice || product.costPrice || 0;

    if (price <= 0) {
      toast({
        title: "Error",
        description: "This product has no price set",
        variant: "destructive",
      });
      return;
    }

    const existingItem = cart.find((item) => item.productId === product._id);

    if (existingItem) {
      updateQuantity(product._id, existingItem.quantity + 1);
    } else {
      const newItem: CartItem = {
        productId: product._id,
        name: product.name,
        quantity: 1,
        unitPrice: price,
        totalPrice: price,
        metric: product.metric,
        type: product.type,
      };
      setCart([...cart, newItem]);
    }
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(
      cart.map((item) =>
        item.productId === productId
          ? {
              ...item,
              quantity: newQuantity,
              totalPrice: item.unitPrice * newQuantity,
            }
          : item
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.productId !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setPaymentMethod("");
  };

  const getTotalAmount = () => {
    return cart.reduce((total, item) => total + item.totalPrice, 0);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast({
        title: "Error",
        description: "Please add items to cart before checkout",
        variant: "destructive",
      });
      return;
    }

    if (!paymentMethod) {
      toast({
        title: "Error",
        description: "Please select a payment method",
        variant: "destructive",
      });
      return;
    }

    try {
      const items = cart.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      }));

      await createSalesTransaction({
        items,
        paymentMethod: paymentMethod as PaymentMethod,
      }).unwrap();

      // Immediately invalidate related data for real-time updates
      invalidateAfterMutation([
        "Product",
        "SalesTransaction",
        "StockTransaction",
        "Analytics",
      ]);

      toast({
        title: "Success",
        description: "Sale completed successfully!",
        variant: "default",
      });

      clearCart();
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast({
        title: "Error",
        description: error?.data?.error?.message || "Failed to complete sale",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="w-full p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <BackButton fallbackPath="/sales" showText={true} />
          <div>
            <h1 className="text-3xl font-bold">Point of Sale</h1>
            <Breadcrumb
              items={[
                { label: "Sales", href: "/sales" },
                { label: "Point of Sale", href: "/sales/pos" },
              ]}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Products Section */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Products</CardTitle>
              <div className="flex gap-4">
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Loading products...</div>
              ) : allProducts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No products found
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {allProducts.map((product) => {
                    const price =
                      product.sellingPrice || product.costPrice || 0;
                    const hasPrice = price > 0;

                    return (
                      <Card
                        key={product._id}
                        className={`cursor-pointer hover:shadow-md transition-shadow ${
                          !hasPrice ? "opacity-60" : ""
                        }`}
                      >
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-medium text-sm">
                              {product.name}
                            </h3>
                            <Badge
                              variant={
                                product.type === "combination"
                                  ? "secondary"
                                  : product.type === "sellable"
                                  ? "default"
                                  : "outline"
                              }
                            >
                              {product.type}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground mb-2">
                            {product.metric}
                          </div>
                          <div className="text-xs text-muted-foreground mb-2">
                            Stock: {product.currentQuantity} {product.metric}
                          </div>
                          <div className="flex justify-between items-center">
                            <div className="flex flex-col">
                              {hasPrice ? (
                                <span className="font-bold text-lg">
                                  ${price.toFixed(2)}
                                </span>
                              ) : (
                                <span className="text-sm text-muted-foreground">
                                  No price set
                                </span>
                              )}
                              {product.sellingPrice && product.costPrice && (
                                <span className="text-xs text-muted-foreground">
                                  Cost: ${product.costPrice.toFixed(2)}
                                </span>
                              )}
                            </div>
                            <Button
                              size="sm"
                              onClick={() => addToCart(product)}
                              disabled={
                                !hasPrice ||
                                (product.type === "combination" &&
                                  product.currentQuantity <= 0)
                              }
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Cart Section */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Cart ({cart.length})</span>
                {cart.length > 0 && (
                  <Button variant="outline" size="sm" onClick={clearCart}>
                    Clear
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cart.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Cart is empty
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Cart Items */}
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {cart.map((item) => (
                      <div
                        key={item.productId}
                        className="flex items-center gap-2 p-2 border rounded"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {item.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            ${item.unitPrice.toFixed(2)} / {item.metric}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              updateQuantity(item.productId, item.quantity - 1)
                            }
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center text-sm">
                            {item.quantity}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              updateQuantity(item.productId, item.quantity + 1)
                            }
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removeFromCart(item.productId)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="text-sm font-medium">
                          ${item.totalPrice.toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  {/* Payment Method */}
                  <div className="space-y-2">
                    <Label htmlFor="payment-method">Payment Method</Label>
                    <Select
                      value={paymentMethod}
                      onValueChange={(value) =>
                        setPaymentMethod(value as PaymentMethod)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_METHODS.map((method) => (
                          <SelectItem key={method.value} value={method.value}>
                            {method.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  {/* Total */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total:</span>
                      <span>${getTotalAmount().toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Checkout Button */}
                  <Button
                    className="w-full"
                    onClick={handleCheckout}
                    disabled={isCreating || cart.length === 0 || !paymentMethod}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    {isCreating ? "Processing..." : "Complete Sale"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
