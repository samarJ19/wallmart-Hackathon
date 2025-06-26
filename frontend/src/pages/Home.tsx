import { useState, useMemo, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShoppingCart, Filter } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import { useAuthenticatedAPI } from "@/services/api";

// Sample product data
const products = [
  {
    id: 1,
    name: "Wireless Headphones",
    price: 89.99,
    category: "Electronics",
    rating: 4.5,
    image:
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=300&fit=crop",
    description: "Premium wireless headphones with noise cancellation",
  },
  {
    id: 2,
    name: "Smart Watch",
    price: 199.99,
    category: "Electronics",
    rating: 4.8,
    image:
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&h=300&fit=crop",
    description: "Advanced fitness tracking and smart notifications",
  },
  {
    id: 3,
    name: "Leather Jacket",
    price: 149.99,
    category: "Clothing",
    rating: 4.3,
    image:
      "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=300&h=300&fit=crop",
    description: "Genuine leather jacket with modern styling",
  },
  {
    id: 4,
    name: "Coffee Maker",
    price: 79.99,
    category: "Appliances",
    rating: 4.6,
    image:
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=300&h=300&fit=crop",
    description: "Programmable drip coffee maker with thermal carafe",
  },
  {
    id: 5,
    name: "Running Shoes",
    price: 129.99,
    category: "Sports",
    rating: 4.7,
    image:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&h=300&fit=crop",
    description: "Lightweight running shoes with superior comfort",
  },
  {
    id: 6,
    name: "Backpack",
    price: 59.99,
    category: "Accessories",
    rating: 4.4,
    image:
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=300&h=300&fit=crop",
    description: "Durable travel backpack with multiple compartments",
  },
  {
    id: 7,
    name: "Smartphone",
    price: 699.99,
    category: "Electronics",
    rating: 4.9,
    image:
      "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300&h=300&fit=crop",
    description: "Latest smartphone with advanced camera system",
  },
  {
    id: 8,
    name: "Designer T-Shirt",
    price: 29.99,
    category: "Clothing",
    rating: 4.2,
    image:
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300&h=300&fit=crop",
    description: "Premium cotton t-shirt with unique design",
  },
  {
    id: 9,
    name: "Blender",
    price: 119.99,
    category: "Appliances",
    rating: 4.5,
    image:
      "https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=300&h=300&fit=crop",
    description: "High-speed blender for smoothies and more",
  },
  {
    id: 10,
    name: "Yoga Mat",
    price: 39.99,
    category: "Sports",
    rating: 4.6,
    image:
      "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=300&h=300&fit=crop",
    description: "Non-slip yoga mat with extra cushioning",
  },
  {
    id: 11,
    name: "Sunglasses",
    price: 89.99,
    category: "Accessories",
    rating: 4.3,
    image:
      "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=300&h=300&fit=crop",
    description: "UV protection sunglasses with polarized lenses",
  },
  {
    id: 12,
    name: "Gaming Mouse",
    price: 49.99,
    category: "Electronics",
    rating: 4.7,
    image:
      "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=300&h=300&fit=crop",
    description: "Precision gaming mouse with RGB lighting",
  },
];

const categories = [
  "All",
  "Electronics",
  "Clothing",
  "Appliances",
  "Sports",
  "Accessories",
];

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const authAPI = useAuthenticatedAPI();
  
  useEffect(() => {
    async function syncUser() {
    try {
       await authAPI.post("/api/users/sync"); //sync route call hona chaiye
    } catch (createError) {
      console.error("Error creating user:", createError);
    }  
    }
    syncUser()
  }, []);
  const filteredProducts = useMemo(() => {
    if (selectedCategory === "All") {
      return products;
    }
    return products.filter((product) => product.category === selectedCategory);
  }, [selectedCategory]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                WallMart Sphere
              </h1>
              <p className="text-gray-600 mt-1">Discover amazing products</p>
            </div>
            <Badge variant="outline" className="px-3 py-1">
              {filteredProducts.length} Products
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filter Section */}
        <div className="flex items-center gap-4 mb-8">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">
              Filter by category:
            </span>
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {/* Empty State */}
        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <ShoppingCart className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No products found
            </h3>
            <p className="text-gray-600">Try selecting a different category</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600">
            <p>&copy; 2025 ShopHub. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
