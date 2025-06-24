import { useUser } from '@clerk/clerk-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ShoppingBag, Zap, Shield, Star } from 'lucide-react'
import { Link } from 'react-router-dom'

const Home = () => {
  const { user } = useUser()

  const features = [
    {
      icon: ShoppingBag,
      title: 'Smart Recommendations',
      description: 'AI-powered product suggestions tailored just for you'
    },
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Quick checkout and instant order processing'
    },
    {
      icon: Shield,
      title: 'Secure Shopping',
      description: 'Your data and payments are protected'
    },
    {
      icon: Star,
      title: 'Premium Quality',
      description: 'Only the best products from trusted sellers'
    }
  ]

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="text-center space-y-6">
        <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl">
          Welcome back, {user?.firstName}! 👋
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Discover amazing products with our AI-powered recommendations. 
          Shop smarter, not harder.
        </p>
        <div className="flex justify-center space-x-4">
          <Link to="/products">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
              Start Shopping
            </Button>
          </Link>
          <Link to="/cart">
            <Button variant="outline" size="lg">
              View Cart
            </Button>
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section>
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">
          Why Choose WallMart Sphere?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-600 rounded-lg p-8 text-center text-white">
        <h2 className="text-2xl font-bold mb-4">
          Ready to Transform Your Shopping Experience?
        </h2>
        <p className="text-blue-100 mb-6">
          Join thousands of satisfied customers who trust ShopSmart for their shopping needs.
        </p>
        <Link to="/products">
          <Button size="lg" variant="secondary">
            Explore Products Now
          </Button>
        </Link>
      </section>
    </div>
  )
}

export default Home
