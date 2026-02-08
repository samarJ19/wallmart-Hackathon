import { useAuthenticatedAPI } from "@/services/api";
import { useCallback, useEffect, useState } from "react";
import { type Product } from "@/types";

interface ApiResponse {
  products?: Product[];
  data?: Product[];
}

export const useRecommendation = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const authAPI = useAuthenticatedAPI();

  // Helper function to extract products from response
  const extractProducts = (responseData: ApiResponse | Product[]) => {
    console.log("📦 Raw API response:", responseData);
    
    // Handle different possible response structures
    if (Array.isArray(responseData)) {
      return responseData;
    }
    
    if (responseData && Array.isArray(responseData.products)) {
      return responseData.products;
    }
    
    if (responseData && Array.isArray(responseData.data)) {
      return responseData.data;
    }
    
    console.warn("⚠️ Unexpected response structure:", responseData);
    return [];
  };

  // Unified fetch function - removed from useCallback to avoid dependency issues
  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("🔄 Fetching recommendations...");
      
      const response = await authAPI.get("api/recommendations/getRec");
      const extractedProducts = extractProducts(response.data);
      
      console.log("✅ Recommendations fetched:", extractedProducts.length, "products");
      setProducts(extractedProducts);
    } catch (err) {
      console.error("❌ Error fetching recommendations:", err);
      setError("Failed to load recommendations");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // Initial load - empty dependency array to only run once
  useEffect(() => {
    fetchRecommendations();
  }, []); // Empty dependency array for initial load only

  // Refresh function - use current authAPI without dependencies
  const refresh = useCallback(async () => {
    console.log("🔄 Manual refresh triggered");
    await fetchRecommendations();
  }, []); // Empty dependency array

  // Return products array, loading state, error, and refresh function
  return {
    products,
    loading,
    error,
    refresh,
  };
};