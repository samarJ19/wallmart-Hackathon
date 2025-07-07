import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { UserButton, useUser } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Home, Package, User, Store, Heart, UserPlus } from "lucide-react";
import { useChat } from "@/context/ChatContext";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const { user } = useUser();

  const navigation = [
    { name: "Home", href: "/", icon: Home },
    { name: "Profile", href: "/profile", icon: User },
    { name: "For You", href: "/foryou", icon: Heart },
    { name: "Social Sync", href: "/", icon: null },
    { name:"Create Group/Invite Users", href:"/manageusers", icon:UserPlus}
  ];

  const isActive = (path: string) => {
    return location.pathname === path;
  };
  const { toggleChat, isChatOpen } = useChat();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-2">
                <Store className="h-8 w-8 text-blue-600" />
                <span className="text-xl font-bold text-gray-900">
                  WallMart Sphere
                </span>
              </Link>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex space-x-8">
              {navigation.map((item) => {
                const Icon = item.icon;

                // Special handling for Social Sync button
                if (item.name === "Social Sync") {
                  return (
                    <button
                      key={item.name}
                      onClick={toggleChat}
                      className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isChatOpen
                          ? "bg-blue-100 text-blue-700"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                      }`}
                    >
                      <img
                        src="/src/assets/social_sync.svg"
                        className="h-4 w-4"
                      />
                      <span>{item.name}</span>
                    </button>
                  );
                }

                // Regular navigation links
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive(item.href)
                        ? "bg-blue-100 text-blue-700"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    }`}
                  >
                    {Icon && <Icon className="h-4 w-4" />}
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            {/* User section */}
            <div className="flex items-center space-x-4">
              {/* Cart button with badge */}
              <Link to="/cart">
                <Button variant="outline" size="sm" className="relative">
                  <ShoppingCart className="h-4 w-4" />
                  <Badge
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                  >
                    3
                  </Badge>
                </Button>
              </Link>

              {/* User button from Clerk */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  Hi, {user?.firstName || "User"}
                </span>
                <UserButton
                  afterSignOutUrl="/sign-in"
                  appearance={{
                    elements: {
                      avatarBox: "h-8 w-8",
                    },
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile navigation */}
        <div className="md:hidden border-t">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-8 py-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium ${
                      isActive(item.href)
                        ? "bg-blue-100 text-blue-700"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    {Icon ? (
                      <Icon className="h-4 w-4" />
                    ) : (
                      <img
                        src="/src/assets/social_sync.svg"
                        className="h-4 w-4"
                      />
                    )}
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;
