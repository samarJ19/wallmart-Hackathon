import { useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Check, X, Star } from "lucide-react";

interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  rating: number;
  image: string;
  description: string;
}

interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
}

export default function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleAddToCart = () => {
    console.log("Add to cart clicked for:", product.name);
    onAddToCart?.(product);
  };

  const handleTickClick = () => {
    console.log("Tick (like/favorite) clicked for:", product.name);
  };

  const handleCrossClick = () => {
    console.log("Cross (remove/dislike) clicked for:", product.name);
  };

  return (
    <Card 
      className="group relative transition-all duration-300 hover:shadow-xl hover:-translate-y-2 cursor-pointer overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative overflow-hidden">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-110"
        />
        
        {/* Price Badge */}
        <Badge className="absolute top-3 right-3 bg-white/95 text-black hover:bg-white shadow-md">
          ${product.price}
        </Badge>
        
        {/* Category Badge */}
        <Badge 
          variant="secondary" 
          className="absolute top-3 left-3 bg-black/70 text-white hover:bg-black/80"
        >
          {product.category}
        </Badge>

        {/* Hover Overlay with Tick/Cross buttons */}
        <div 
          className={`absolute inset-0 bg-black/50 flex items-center justify-center gap-4 transition-all duration-300 ${
            isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <Button
            size="icon"
            variant="secondary"
            className="bg-green-500 hover:bg-green-600 text-white shadow-lg transform hover:scale-110 transition-all duration-200"
            onClick={(e) => {
              e.stopPropagation();
              handleTickClick();
            }}
          >
            <Check className="h-5 w-5" />
          </Button>
          
          <Button
            size="icon"
            variant="secondary"
            className="bg-red-500 hover:bg-red-600 text-white shadow-lg transform hover:scale-110 transition-all duration-200"
            onClick={(e) => {
              e.stopPropagation();
              handleCrossClick();
            }}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm text-gray-600">{product.rating}</span>
          </div>
        </div>
        
        <h3 className="font-semibold text-lg mb-2 line-clamp-1 group-hover:text-blue-600 transition-colors">
          {product.name}
        </h3>
        
        <p className="text-sm text-gray-600 line-clamp-2 mb-3">
          {product.description}
        </p>
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <Button 
          className="w-full transition-all duration-300 transform hover:scale-105"
          variant={isHovered ? "default" : "outline"}
          onClick={handleAddToCart}
        >
          <ShoppingCart className="w-4 h-4 mr-2" />
          Add to Cart
        </Button>
      </CardFooter>
    </Card>
  );
}