import { useEffect, useState } from "react";
import { Minus, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuthenticatedAPI } from "@/services/api";
import type { CartItem } from "@/types";

const ShoppingCart = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const authAPI = useAuthenticatedAPI();
  const [selectedItems, setSelectedItems] = useState(
    new Set(cartItems.map((item) => item.id))
  );
  useEffect(() => {
    async function fetchCartData (){
      try {
      const cart = await authAPI.get('api/cart/cartproducts');
      setCartItems(cart.data.cartData);
    } catch (err) {
      console.log("Frontend: Error on fetching cart items", err);
    }
    }
    fetchCartData();
  }, []);
  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    setCartItems((items) =>
      items.map((item) =>
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      )
    );
    try {
      const updateQuant = await authAPI.put(
        `/api/cart/updatequantity/${itemId}`,
        {
          quant: newQuantity,
        }
      );
      console.log("Update response of cart: ", updateQuant.data);
    } catch (err) {
      console.log("Frontend: Error on updating", err);
    }
  };

  const removeItem = async (itemId: string) => {
    setCartItems((items) => items.filter((item) => item.id !== itemId));
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      newSet.delete(itemId);
      return newSet;
    });
    try {
      const del = await authAPI.delete(`/api/cart/deleteItem/${itemId}`);
      console.log("Del response of cart: ", del.data);
    } catch (err) {
      console.log("Frontend: Error on deleting", err);
    }
  };

  const toggleItemSelection = (itemId: string) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === cartItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(cartItems.map((item) => item.id)));
    }
  };

  const calculateSubtotal = () => {
    return cartItems
      .filter((item) => selectedItems.has(item.id))
      .reduce((total, item) => total + item.product.price * item.quantity, 0);
  };

  const formatPrice = (price: number) => {
    return `₹${price.toLocaleString("en-IN")}`;
  };

  const getOriginalPrice = (currentPrice: number) => {
    // Mock original price calculation (assuming some discount)
    return Math.round(currentPrice * 1.3);
  };

  const getDiscount = (originalPrice: number, currentPrice: number) => {
    return Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 bg-gray-50 min-h-screen">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Cart Section */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">Shopping Cart</h1>
                <button
                  className="text-blue-600 hover:underline text-sm"
                  onClick={toggleSelectAll}
                >
                  {selectedItems.size === cartItems.length
                    ? "Deselect all items"
                    : "Select all items"}
                </button>
              </div>

              <div className="space-y-4">
                {cartItems.map((item) => {
                  const originalPrice = getOriginalPrice(item.product.price);
                  const discount = getDiscount(
                    originalPrice,
                    item.product.price
                  );

                  return (
                    <div
                      key={item.id}
                      className="border rounded-lg p-4 bg-white"
                    >
                      <div className="flex items-start gap-4">
                        <Checkbox
                          checked={selectedItems.has(item.id)}
                          onCheckedChange={() => toggleItemSelection(item.id)}
                          className="mt-2"
                        />

                        <img
                          src={item.product.imageUrl}
                          alt={item.product.name}
                          className="w-24 h-24 object-cover rounded-md flex-shrink-0"
                        />

                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <div className="flex-1 pr-4">
                              <h3 className="text-sm font-medium text-gray-900 mb-2 line-clamp-2">
                                {item.product.name}
                              </h3>

                              <div className="flex flex-wrap gap-2 mb-2">
                                <span className="text-green-600 text-xs bg-green-50 px-2 py-1 rounded">
                                  In stock
                                </span>
                                <span className="text-blue-600 text-xs bg-blue-50 px-2 py-1 rounded">
                                  Eligible for FREE Shipping
                                </span>
                                <Badge variant="secondary" className="text-xs">
                                  <Check className="w-3 h-3 mr-1" />
                                  Prime
                                </Badge>
                              </div>

                              <p className="text-xs text-gray-600 mb-2">
                                🎁 This will be a gift Learn more
                              </p>

                              <p className="text-xs text-gray-600 mb-3">
                                Size:{" "}
                                {item.product.category === "Cookware"
                                  ? "20cm"
                                  : "Standard"}
                              </p>

                              <div className="flex items-center gap-2 mb-3">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    updateQuantity(item.id, item.quantity - 1)
                                  }
                                  disabled={item.quantity <= 1}
                                  className="h-8 w-8 p-0"
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="w-8 text-center text-sm">
                                  {item.quantity}
                                </span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    updateQuantity(item.id, item.quantity + 1)
                                  }
                                  className="h-8 w-8 p-0"
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                                <span className="text-gray-400 mx-2">|</span>
                                <button
                                  className="text-blue-600 hover:underline text-sm"
                                  onClick={() => removeItem(item.id)}
                                >
                                  Delete
                                </button>
                                <span className="text-gray-400 mx-2">|</span>
                                <button className="text-blue-600 hover:underline text-sm">
                                  Save for later
                                </button>
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="mb-1">
                                <Badge
                                  variant="destructive"
                                  className="text-xs mb-1"
                                >
                                  Limited time deal
                                </Badge>
                              </div>
                              <div className="flex items-center gap-1 mb-1">
                                <span className="bg-red-600 text-white text-xs px-1 rounded">
                                  -{discount}%
                                </span>
                                <span className="text-xl font-bold">
                                  {formatPrice(item.product.price)}
                                </span>
                                <span className="text-xs align-top">00</span>
                              </div>
                              <div className="text-xs text-gray-500 mb-2">
                                M.R.P.:{" "}
                                <span className="line-through">
                                  {formatPrice(originalPrice)}
                                </span>
                              </div>
                              <div className="text-xs text-blue-600 mb-1">
                                Buy 2 items, get 5% off
                              </div>
                              <button className="text-blue-600 hover:underline text-xs">
                                Shop Items
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 pt-4 border-t text-right">
                <p className="text-lg font-semibold">
                  Subtotal (
                  {
                    cartItems.filter((item) => selectedItems.has(item.id))
                      .length
                  }{" "}
                  items): {formatPrice(calculateSubtotal())}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Check className="w-5 h-5 text-green-600" />
                <div>
                  <span className="text-green-600 font-medium">₹499</span>
                  <p className="text-sm text-green-600">
                    Your order is eligible for FREE Delivery.
                  </p>
                  <p className="text-xs text-gray-600">
                    Choose{" "}
                    <span className="text-blue-600 underline cursor-pointer">
                      FREE Delivery
                    </span>{" "}
                    option at checkout.
                  </p>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span>
                    Subtotal (
                    {
                      cartItems.filter((item) => selectedItems.has(item.id))
                        .length
                    }{" "}
                    items):
                  </span>
                  <span className="font-semibold">
                    {formatPrice(calculateSubtotal())}
                  </span>
                </div>
                <p className="text-xs text-gray-600">
                  🎁 This order contains a gift
                </p>
              </div>

              <Button className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-medium mb-3">
                Proceed to Buy
              </Button>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">EMI Available</span>
                  <Button variant="ghost" size="sm" className="p-0 h-auto">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ShoppingCart;
