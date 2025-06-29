import { useState, useMemo, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShoppingCart, Filter, Heart, ChevronLeft, ChevronRight } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import { api, useAuthenticatedAPI } from "@/services/api";
import { type Product } from "@/types";
import { useNavigate } from "react-router-dom";

const categories = [
  "All",
  "electronics",
  "clothing",
  "appliances",
  "sports",
  "accessories",
  "home"
];

const PRODUCTS_PER_PAGE = 12;

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

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const authAPI = useAuthenticatedAPI();
  const navigate = useNavigate();
  
  useEffect(() => {
    async function getProduct() {
      try {
        setLoading(true);
        const res = await api.get("api/products/genproducts");
        setProducts(Array.isArray(res.data.products) ? res.data.products : []);
      } catch (createError) {
        console.error("Error while getting products from database:", createError);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }
    
    getProduct();
    
    async function syncUser() {
      try {
        await authAPI.post("/api/users/sync");
      } catch (createError) {
        console.error("Error creating user:", createError);
      }  
    }
    
    syncUser();
  }, []);

  const filteredProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];
    
    if (selectedCategory === "All") {
      return products;
    }
    return products.filter((product) => product.category === selectedCategory);
  }, [products, selectedCategory]);

  // Reset to first page when category changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory]);

  // Pagination logic
  const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);
  const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;
  const endIndex = startIndex + PRODUCTS_PER_PAGE;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-lg border-r fixed h-full z-10">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Navigation</h2>
          <nav className="space-y-4">
            <button
              onClick={() => navigate('/cart')}
              className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ShoppingCart className="w-5 h-5" />
              <span className="font-medium">Cart</span>
            </button>
            <button
              onClick={() => navigate('/foryou')}
              className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Heart className="w-5 h-5" />
              <span className="font-medium">For You</span>
            </button>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 ml-64">
        {/* Header */}
        <header className="bg-white shadow-sm border-b sticky top-0 z-5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  WallMart Sphere
                </h1>
                <p className="text-gray-600 mt-1">Discover amazing products</p>
              </div>
              <Badge variant="outline" className="px-3 py-1">
                {loading ? "Loading..." : `${filteredProducts.length} Products`}
              </Badge>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Filter Section */}
          {!loading && (
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
                    <SelectItem key={category} value={category} className="capitalize">
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Loading Skeletons */}
          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 12 }).map((_, index) => (
                <ProductSkeleton key={index} />
              ))}
            </div>
          )}

          {/* Product Grid */}
          {!loading && currentProducts.length > 0 && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                {currentProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>

                  <div className="flex gap-2">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      // Show first page, last page, current page, and pages around current page
                      const showPage = 
                        page === 1 || 
                        page === totalPages || 
                        (page >= currentPage - 1 && page <= currentPage + 1);

                      if (!showPage) {
                        // Show ellipsis for gaps
                        if (page === currentPage - 2 || page === currentPage + 2) {
                          return (
                            <span key={page} className="px-3 py-2 text-sm text-gray-500">
                              ...
                            </span>
                          );
                        }
                        return null;
                      }

                      return (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`px-3 py-2 text-sm font-medium rounded-lg ${
                            currentPage === page
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}

          {/* Empty State */}
          {!loading && filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <ShoppingCart className="w-16 h-16 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No products found
              </h3>
              <p className="text-gray-600">
                {selectedCategory === "All" 
                  ? "No products available at the moment" 
                  : "Try selecting a different category"
                }
              </p>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="bg-white border-t mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center text-gray-600">
              <p>&copy; 2025 WallMart Sphere. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}