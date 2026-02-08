import { useRecommendation } from "@/hooks/useRecommendation";
import { Filter, ShoppingCart, RefreshCw } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import ProductCard from "./ProductCard";
import { useMemo, useState } from "react";

// Shimmer Loading Skeleton Component
const ProductSkeleton = () => (
  <div className="bg-white rounded-lg shadow-sm border animate-pulse">
    <div className="h-48 bg-gray-200 rounded-t-lg"></div>
    <div className="p-4">
      <div className="h-4 bg-gray-200 rounded mb-2"></div>
      <div className="h-3 bg-gray-200 rounded mb-3 w-3/4"></div>
      <div className="flex justify-between items-center">
        <div className="h-5 bg-gray-200 rounded w-16"></div>
        <div className="h-8 bg-gray-200 rounded w-20"></div>
      </div>
    </div>
  </div>
);

export default function Foryou() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const { products, loading, error, refresh } = useRecommendation();
  
  // Debug log to track state changes
  console.log("🎯 Foryou render - products:", products.length, "loading:", loading, "error:", error);
  
  const filteredProducts = useMemo(() => {
    console.log("🔍 Filtering products - input:", products.length, "category:", selectedCategory);
    
    // Only filter if products is a valid array
    if (!Array.isArray(products) || products.length === 0) {
      console.log("❌ No valid products array");
      return [];
    }
    
    if (selectedCategory === "All") {
      console.log("✅ Returning all products:", products.length);
      return products;
    }
    
    const filtered = products.filter((product) => product.category === selectedCategory);
    console.log("✅ Filtered products:", filtered.length, "for category:", selectedCategory);
    return filtered;
  }, [products, selectedCategory]);

  const categories = [
    "All",
    "Electronics",
    "Clothing",
    "Appliances",
    "Sports",
    "Accessories",
  ];

  const handleRefresh = async () => {
    console.log("🔄 Refresh button clicked");
    await refresh();
    console.log("✅ Refresh completed");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-bold text-2xl">For You</h2>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Debug Info - Remove in production */}
        

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <div className="text-red-800">
              <p className="font-medium">Error loading recommendations</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Loading Skeletons */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, index) => (
              <ProductSkeleton key={index} />
            ))}
          </div>
        )}

        {/* Filter Section - Only show when not loading and we have products */}
        {!loading && Array.isArray(products) && products.length > 0 && (
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
        )}

        {/* Product Grid - Only render when we have valid array data */}
        {!loading && Array.isArray(filteredProducts) && filteredProducts.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        {/* Empty State - Show when not loading, no error, and no products */}
        {!loading && !error && Array.isArray(products) && products.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <ShoppingCart className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No products found
            </h3>
            <p className="text-gray-600">No recommendations available at the moment</p>
          </div>
        )}

        {/* No Results for Filter */}
        {!loading && !error && Array.isArray(products) && products.length > 0 && filteredProducts.length === 0 && (
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
    </div>
  );
}