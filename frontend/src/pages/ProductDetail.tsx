import React, { useState, useEffect } from "react";
import {
  ShoppingCart,
  Heart,
  Star,
  Truck,
  Shield,
  RotateCcw,
  Eye,
  Minus,
  Plus,
  Check,
  X,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { type Product } from "@/types";
import { useAuthenticatedAPI } from "@/services/api";
import { useParams } from "react-router-dom";
import ProductCard from "@/components/ProductCard";

// Props interface for the component
interface ProductDetailPageProps {
  productId?: string;
  product?: Product;
}

const ProductDetailPage: React.FC<ProductDetailPageProps> = ({
  product: passedProduct,
}) => {
  const [product, setProduct] = useState<Product | null>(passedProduct || null);
  const [loading, setLoading] = useState(!passedProduct);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const { productId } = useParams();
  const authAPI = useAuthenticatedAPI();
  //When user is not logged hit the endpoint: /api/products/any/productId which returns the same detail about the product
  useEffect(() => {
    if (productId) {
      const fetchProduct = async () => {
        setLoading(true);
        const productResponse = await authAPI.get(`/api/products/${productId}`);
        await authAPI.post(`/api/products/${productId}/view`, {
          context: "User is viewing the product",
        });
        setProduct(productResponse.data.product);
        //we can show similar products in a grid
        setLoading(false);
      };

      fetchProduct();
    }
  }, [productId]);

  const handleQuantityChange = (delta: number) => {
    const newQuantity = quantity + delta;
    if (newQuantity >= 1 && newQuantity <= (product?.inventory || 0)) {
      setQuantity(newQuantity);
    }
  };
// When user is not logged in handleAddToCart should open a dialog box saying that you are not logged in get this feature by logging in 
  const handleAddToCart = async () => {
    if (product) {
      console.log(`Added ${quantity} of ${product.name} to cart`);
      try {
           await authAPI.post(
          `/api/cart/addproduct/${productId}`,
          {
            quantity: quantity,
          }
        );
      } catch (err) {
        console.log("Frontend: Got error while adding product to cart ", err);
      }
    }
  };

  const handleBuyNow = () => {
    if (product) {
      // Direct purchase logic here
      console.log(`Buying ${quantity} of ${product.name}`);
      // Redirect to checkout or handle purchase
    }
  };

  const handleViewInAR = () => {
    window.open('https://jainamsinghai.8thwall.app/wallmart2/?model=https%3A%2F%2Fraw.githubusercontent.com%2FBlack-Jade0%2Fwallmart%2Fmain%2Fstylized_coffee_shop_sketchfabweeklychallenge.glb', '_blank', 'noopener,noreferrer')
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Alert className="max-w-md">
          <X className="h-4 w-4" />
          <AlertDescription>Product not found</AlertDescription>
        </Alert>
      </div>
    );
  }

  const inStock = product.inventory > 0;
  const lowStock = product.inventory < 5 && product.inventory > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-8">
            {/* Image Gallery */}
            <div className="space-y-4">
              <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={product.images[selectedImage]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Thumbnail Gallery */}
              <div className="grid grid-cols-4 gap-3">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                      selectedImage === index
                        ? "border-blue-500"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${product.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Product Details */}
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  <span>{product.brand}</span>
                  <span>•</span>
                  <span>{product.category}</span>
                </div>

                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                  {product.name}
                </h1>

                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className="h-4 w-4 fill-yellow-400 text-yellow-400"
                      />
                    ))}
                    <span className="text-sm text-gray-600 ml-2">
                      4.8 (324 reviews)
                    </span>
                  </div>
                </div>

                <div className="text-3xl font-bold text-blue-600 mb-4">
                  ${product.price.toFixed(2)}
                </div>

                {/* Stock Status */}
                <div className="flex items-center gap-2 mb-6">
                  {inStock ? (
                    <>
                      <Check className="h-4 w-4 text-green-600" />
                      <span
                        className={`text-sm ${
                          lowStock ? "text-orange-600" : "text-green-600"
                        }`}
                      >
                        {lowStock
                          ? `Only ${product.inventory} left in stock`
                          : "In stock"}
                      </span>
                    </>
                  ) : (
                    <>
                      <X className="h-4 w-4 text-red-600" />
                      <span className="text-sm text-red-600">Out of stock</span>
                    </>
                  )}
                </div>
              </div>

              {/* Description */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Description</h3>
                <p className="text-gray-700 leading-relaxed">
                  {showFullDescription
                    ? product.description
                    : `${product.description.slice(0, 200)}...`}
                </p>
                <button
                  onClick={() => setShowFullDescription(!showFullDescription)}
                  className="text-blue-600 hover:text-blue-700 text-sm mt-2"
                >
                  {showFullDescription ? "Show less" : "Read more"}
                </button>
              </div>

              {/* Features */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Key Features</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(product.features).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <span className="text-gray-600">{key}:</span>
                      <span className="font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quantity Selector */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Quantity</h3>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleQuantityChange(-1)}
                    disabled={quantity <= 1}
                    className="h-10 w-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="px-4 py-2 bg-gray-50 rounded-lg min-w-[3rem] text-center">
                    {quantity}
                  </span>
                  <button
                    onClick={() => handleQuantityChange(1)}
                    disabled={quantity >= product.inventory}
                    className="h-10 w-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={handleAddToCart}
                    disabled={!inStock}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    Add to Cart
                  </button>

                  <button
                    onClick={handleBuyNow}
                    disabled={!inStock}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    Buy Now
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setIsWishlisted(!isWishlisted)}
                    className={`flex items-center justify-center gap-2 px-6 py-3 border rounded-lg transition-colors ${
                      isWishlisted
                        ? "border-red-300 text-red-600 bg-red-50"
                        : "border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <Heart
                      className={`h-4 w-4 ${
                        isWishlisted ? "fill-current" : ""
                      }`}
                    />
                    {isWishlisted ? "Wishlisted" : "Add to Wishlist"}
                  </button>

                  {product.arEnabled && (
                    <button
                      onClick={handleViewInAR}
                      className="flex items-center justify-center gap-2 px-6 py-3 border border-purple-300 text-purple-600 rounded-lg hover:bg-purple-50 transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                      View in AR
                    </button>
                  )}
                </div>
              </div>

              {/* Shipping Info */}
              <div className="border-t pt-6 space-y-3">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Truck className="h-4 w-4" />
                  <span>Free shipping on orders over $50</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <RotateCcw className="h-4 w-4" />
                  <span>Easy 30-day returns</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Shield className="h-4 w-4" />
                  <span>2-year warranty included</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Similar Products Carousel */}
      <div className="mt-8">
        <h3 className="text-xl font-semibold mb-4 text-gray-900">
          Similar Products
        </h3>
        <div className="relative">
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {product.similarProducts?.map((similarProduct) => (
              <div key={similarProduct.id} className="flex-shrink-0 w-64">
                <ProductCard product={similarProduct} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;
