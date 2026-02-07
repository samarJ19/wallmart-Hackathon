import React, { useState } from 'react';
import { 
  Search, 
  ShoppingCart, 
  User, 
  Menu, 
  Heart, 
  Sparkles, 
  MapPin, 
  ChevronDown, 
  ChevronRight,
  Star,
  Plus
} from 'lucide-react';

// --- Types ---
interface Product {
  id: number;
  title: string;
  price: number;
  rating: number;
  reviews: number;
  image: string;
  badge?: string;
  shipping: string;
}

interface Category {
  id: number;
  title: string;
  image: string;
}

// --- Mock Data ---
const CATEGORIES: Category[] = [
  { id: 1, title: "Grocery", image: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=200" },
  { id: 2, title: "Electronics", image: "https://images.unsplash.com/photo-1498049860654-af1a5c5668ba?auto=format&fit=crop&q=80&w=200" },
  { id: 3, title: "Fashion", image: "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&q=80&w=200" },
  { id: 4, title: "Home", image: "https://images.unsplash.com/photo-1484101403633-562f891dc89a?auto=format&fit=crop&q=80&w=200" },
  { id: 5, title: "Toys", image: "https://images.unsplash.com/photo-1566576912906-253c72338879?auto=format&fit=crop&q=80&w=200" },
  { id: 6, title: "Patio & Garden", image: "https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?auto=format&fit=crop&q=80&w=200" },
];

const DEALS: Product[] = [
  {
    id: 101,
    title: "4K UHD Smart LED TV - 55 Inch",
    price: 248.00,
    rating: 4.5,
    reviews: 1205,
    image: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&q=80&w=400",
    badge: "Rollback",
    shipping: "2-day shipping"
  },
  {
    id: 102,
    title: "Wireless Noise Cancelling Headphones",
    price: 59.99,
    rating: 4.2,
    reviews: 856,
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=400",
    badge: "Best Seller",
    shipping: "Pickup available"
  },
  {
    id: 103,
    title: "Professional Blender 1000W",
    price: 89.00,
    rating: 4.8,
    reviews: 342,
    image: "https://images.unsplash.com/photo-1570222094114-28a9d88a27e6?auto=format&fit=crop&q=80&w=400",
    badge: "Save $20",
    shipping: "3+ day shipping"
  },
  {
    id: 104,
    title: "Men's Cotton Crew T-Shirt, 5-Pack",
    price: 18.48,
    rating: 4.6,
    reviews: 4092,
    image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=400",
    shipping: "2-day shipping"
  }
];

// --- Sub-Components ---

const Header = () => (
  <header className="bg-[#0071dc] text-white sticky top-0 z-50">
    {/* Top Row: Logo, Search, Account */}
    <div className="container mx-auto px-4 h-20 flex items-center justify-between gap-6">
      
      {/* Logo */}
      <div className="flex items-center gap-1 hover:bg-[#005bb5] p-2 rounded-full cursor-pointer transition">
        <h1 className="text-xl md:text-2xl font-bold tracking-tight">Walmart</h1>
        <Sparkles className="w-5 h-5 text-yellow-400 fill-current" />
      </div>

      {/* Departments Button (Desktop) */}
      <button className="hidden md:flex items-center gap-2 font-semibold hover:bg-[#005bb5] px-3 py-2 rounded-full transition">
        <Menu className="w-5 h-5" />
        <span>Departments</span>
      </button>

      {/* Services Button (Desktop) */}
      <button className="hidden md:flex items-center gap-2 font-semibold hover:bg-[#005bb5] px-3 py-2 rounded-full transition">
        <div className="grid grid-cols-2 gap-0.5 w-4">
            <div className="w-1.5 h-1.5 bg-white rounded-sm"></div>
            <div className="w-1.5 h-1.5 bg-white rounded-sm"></div>
            <div className="w-1.5 h-1.5 bg-white rounded-sm"></div>
            <div className="w-1.5 h-1.5 bg-white rounded-sm"></div>
        </div>
        <span>Services</span>
      </button>

      {/* Search Bar */}
      <div className="flex-1 max-w-2xl relative">
        <input 
          type="text" 
          placeholder="Search everything at Walmart online and in store" 
          className="w-full h-10 px-5 rounded-full text-black focus:outline-none focus:ring-2 focus:ring-yellow-400"
        />
        <button className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#ffc220] p-1.5 rounded-full hover:bg-yellow-500 transition">
          <Search className="w-4 h-4 text-[#004f9a]" />
        </button>
      </div>

      {/* User Actions */}
      <div className="flex items-center gap-4">
        <button className="flex flex-col items-center hover:bg-[#005bb5] px-3 py-1 rounded-full transition group">
          <Heart className="w-5 h-5 mb-0.5" />
          <span className="text-xs font-medium">Reorder</span>
          <span className="text-xs font-bold -mt-0.5 group-hover:underline">My Items</span>
        </button>

        <button className="flex flex-col items-center hover:bg-[#005bb5] px-3 py-1 rounded-full transition group">
          <User className="w-5 h-5 mb-0.5" />
          <span className="text-xs font-medium">Sign In</span>
          <span className="text-xs font-bold -mt-0.5 group-hover:underline">Account</span>
        </button>

        <button className="flex flex-col items-center hover:bg-[#005bb5] px-3 py-1 rounded-full transition relative">
          <div className="relative">
            <ShoppingCart className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 bg-[#ffc220] text-[#004f9a] text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">0</span>
          </div>
          <span className="text-xs font-bold mt-0.5">$0.00</span>
        </button>
      </div>
    </div>

    {/* Bottom Row: Location & Quick Links */}
    <div className="bg-[#005bb5] h-10 border-t border-[#4d93e5]">
      <div className="container mx-auto px-4 h-full flex items-center justify-between text-sm">
        <div className="flex items-center gap-6">
          <button className="flex items-center gap-2 hover:bg-white/10 px-2 py-1 rounded transition">
            <img src="https://i.imgur.com/gC262xH.png" alt="home" className="w-6 h-6 object-contain hidden" /> 
            {/* Fallback for Walmart+ Icon */}
            <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4 text-white" />
                <span className="font-light">Sacramento, 95829</span>
                <span className="font-bold">Sacramento Supercenter</span>
            </div>
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>

        <div className="hidden md:flex items-center gap-6 font-semibold">
            <a href="#" className="hover:underline">Grocery & Essentials</a>
            <a href="#" className="hover:underline">Christmas Shop</a>
            <a href="#" className="hover:underline">Fashion</a>
            <a href="#" className="hover:underline">Home</a>
            <a href="#" className="hover:underline">Electronics</a>
        </div>
      </div>
    </div>
  </header>
);

const Hero = () => (
  <section className="container mx-auto px-4 py-6">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[400px]">
      {/* Main Banner */}
      <div className="md:col-span-2 relative rounded-2xl overflow-hidden bg-pink-100 group cursor-pointer">
        <img 
          src="https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&q=80&w=1200" 
          alt="Deals" 
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent p-12 flex flex-col justify-center text-white">
          <h2 className="text-5xl font-bold mb-4">Deals for Days</h2>
          <p className="text-xl mb-6">Save big on top tech, toys, and more.</p>
          <button className="bg-white text-black px-6 py-3 rounded-full font-bold w-fit hover:bg-gray-100 transition">
            Shop all deals
          </button>
        </div>
      </div>

      {/* Side Banners */}
      <div className="hidden md:flex flex-col gap-4">
        <div className="flex-1 bg-blue-50 rounded-2xl p-6 flex flex-col justify-center relative overflow-hidden cursor-pointer group">
           <div className="absolute top-4 left-4 z-10">
               <h3 className="text-2xl font-bold text-gray-800">Flash Picks</h3>
               <p className="text-gray-600">Up to 65% off</p>
           </div>
           <img 
              src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=300" 
              className="absolute right-[-20px] bottom-[-20px] w-48 h-48 object-contain transform -rotate-12 transition group-hover:scale-110" 
              alt="shoe"
            />
        </div>
        <div className="flex-1 bg-green-50 rounded-2xl p-6 flex flex-col justify-center relative overflow-hidden cursor-pointer group">
           <div className="absolute top-4 left-4 z-10">
               <h3 className="text-2xl font-bold text-gray-800">Grocery</h3>
               <p className="text-gray-600">Fresh for less</p>
           </div>
           <img 
              src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=300" 
              className="absolute right-[-20px] bottom-[-20px] w-48 h-48 object-contain transform rotate-12 transition group-hover:scale-110" 
              alt="veggies"
            />
        </div>
      </div>
    </div>
  </section>
);

const CategoryRow = () => (
  <section className="container mx-auto px-4 py-8">
    <h2 className="text-2xl font-bold text-gray-800 mb-6">Get it all right here</h2>
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
      {CATEGORIES.map((cat) => (
        <div key={cat.id} className="flex flex-col items-center gap-3 cursor-pointer group">
          <div className="w-32 h-32 rounded-full overflow-hidden border border-gray-200 shadow-sm group-hover:shadow-md transition">
            <img src={cat.image} alt={cat.title} className="w-full h-full object-cover" />
          </div>
          <span className="font-medium text-gray-700 underline-offset-4 group-hover:underline">{cat.title}</span>
        </div>
      ))}
    </div>
  </section>
);

const ProductCard = ({ product }: { product: Product }) => (
  <div className="flex flex-col min-w-[200px] w-full border border-gray-200 rounded-lg p-4 relative group hover:shadow-lg transition bg-white">
    {product.badge && (
      <span className="absolute top-2 left-2 bg-green-700 text-white text-[10px] font-bold px-2 py-1 rounded">
        {product.badge}
      </span>
    )}
    <button className="absolute top-2 right-2 p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-red-500 transition">
        <Heart className="w-5 h-5" />
    </button>
    
    <div className="h-48 mb-4 flex items-center justify-center">
        <img src={product.image} alt={product.title} className="max-h-full max-w-full object-contain group-hover:scale-105 transition duration-300" />
    </div>

    <div className="flex-1 flex flex-col">
        <div className="flex items-baseline gap-1 mb-1">
            <span className="text-xl font-bold text-green-700">${Math.floor(product.price)}</span>
            <span className="text-xs font-bold text-green-700 align-top">{(product.price % 1).toFixed(2).substring(1)}</span>
        </div>
        
        <h3 className="text-sm text-gray-700 mb-2 line-clamp-2 hover:underline cursor-pointer leading-tight">
            {product.title}
        </h3>

        <div className="flex items-center gap-1 mb-2">
            <div className="flex text-yellow-400">
                {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-3 h-3 ${i < Math.floor(product.rating) ? 'fill-current' : 'text-gray-300'}`} />
                ))}
            </div>
            <span className="text-xs text-gray-500">({product.reviews})</span>
        </div>

        <div className="mt-auto">
            <div className="bg-gray-100 rounded-full px-2 py-1 w-fit mb-3">
                <span className="text-[10px] font-bold text-gray-600">{product.shipping}</span>
            </div>
            <button className="w-full border border-black rounded-full py-1.5 text-sm font-bold hover:bg-black hover:text-white transition flex items-center justify-center gap-1">
                <Plus className="w-4 h-4" /> Add
            </button>
        </div>
    </div>
  </div>
);

const FeaturedSection = () => (
  <section className="container mx-auto px-4 py-8 border-t border-gray-200">
    <div className="flex items-center justify-between mb-6">
        <div>
            <h2 className="text-2xl font-bold text-gray-800">Flash Deals</h2>
            <p className="text-gray-500 text-sm mt-1">Up to 65% off</p>
        </div>
        <a href="#" className="text-sm font-underline hover:no-underline text-gray-700 flex items-center">
            View all <ChevronRight className="w-4 h-4" />
        </a>
    </div>
    
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {DEALS.map(product => (
            <ProductCard key={product.id} product={product} />
        ))}
    </div>
  </section>
);

const MembershipBanner = () => (
    <section className="container mx-auto px-4 py-8">
        <div className="bg-[#0071dc] rounded-2xl p-6 md:p-10 flex flex-col md:flex-row items-center justify-between text-white relative overflow-hidden">
             <div className="z-10 relative max-w-xl">
                 <h2 className="text-3xl font-bold mb-2">Walmart+</h2>
                 <p className="text-lg mb-6">Members get free shipping with no order minimum. Terms apply.</p>
                 <button className="bg-white text-[#0071dc] px-6 py-3 rounded-full font-bold hover:bg-gray-100 transition">
                     Start your free 30-day trial
                 </button>
             </div>
             {/* Decorative circle */}
             <div className="hidden md:block absolute right-[-50px] top-[-50px] w-64 h-64 rounded-full bg-blue-400 opacity-20"></div>
             <div className="hidden md:block absolute right-20 bottom-[-20px] w-32 h-32 rounded-full bg-yellow-400 opacity-20"></div>
        </div>
    </section>
)

const Footer = () => (
    <footer className="bg-[#e6f1fc] mt-12 py-10 border-t border-blue-200">
        <div className="container mx-auto px-4 text-center">
            <p className="text-sm text-gray-600 mb-4">We’d love to hear what you think!</p>
            <button className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-full text-sm font-bold mb-8 hover:bg-gray-50">
                Give feedback
            </button>
            <div className="flex flex-wrap justify-center gap-6 text-xs text-gray-600 mb-8">
                <a href="#" className="hover:underline">All Departments</a>
                <a href="#" className="hover:underline">Store Directory</a>
                <a href="#" className="hover:underline">Careers</a>
                <a href="#" className="hover:underline">Our Company</a>
                <a href="#" className="hover:underline">Sell on Walmart.com</a>
                <a href="#" className="hover:underline">Help</a>
                <a href="#" className="hover:underline">COVID-19 Vaccine Scheduler</a>
            </div>
            <p className="text-[10px] text-gray-500">© 2024 Walmart. All Rights Reserved.</p>
        </div>
    </footer>
)

// --- Main Component ---
export default function WalmartHomepage() {
  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      <Header />
      <main>
        <Hero />
        <CategoryRow />
        <FeaturedSection />
        <MembershipBanner />
        {/* Additional generic spacer content to simulate scroll length */}
        <div className="h-12"></div>
      </main>
      <Footer />
    </div>
  );
}