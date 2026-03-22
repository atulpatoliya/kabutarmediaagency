import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  TrendingUp,
  Shield,
  Clock,
  CheckCircle,
  Newspaper,
  ArrowRight,
  Users,
  Star,
  Zap
} from 'lucide-react';
import { createClient } from '@/lib/supabaseServer';

const features = [
  {
    icon: Shield,
    title: 'Exclusive Rights',
    description: 'Every news story sold grants complete exclusive rights to the buyer.',
  },
  {
    icon: Clock,
    title: '30-Day Access',
    description: 'Buyers get 30 days to access and download purchased content.',
  },
  {
    icon: CheckCircle,
    title: 'Verified Reporters',
    description: 'All reporters are vetted and approved before publishing.',
  },
  {
    icon: TrendingUp,
    title: 'Fair Pricing',
    description: 'Reporters set their price, platform takes a small commission.',
  },
  {
    icon: Zap,
    title: 'Instant Payment',
    description: 'Reporters receive payment within 24 hours of a successful sale.',
  },
  {
    icon: Users,
    title: 'Growing Community',
    description: 'Join thousands of reporters and media agencies on our platform.',
  },
];

export default async function Home() {
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug, parent_id')
    .eq('status', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  const categoryRows = categories || [];
  const byId = new Map(categoryRows.map((category) => [category.id, category]));
  const labelFor = (category: { id: string; name: string; parent_id: string | null }) => {
    const parts: string[] = [];
    let current: { id: string; name: string; parent_id: string | null } | undefined = category;
    let guard = 0;

    while (current && guard < 10) {
      parts.unshift(current.name);
      current = current.parent_id ? byId.get(current.parent_id) : undefined;
      guard += 1;
    }

    return parts.join(' > ');
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-linear-to-br from-blue-50 via-white to-gray-50 py-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <Badge className="mb-6 bg-blue-100 text-blue-700 border-blue-200 px-4 py-1 text-sm">
            India&apos;s #1 Exclusive News Marketplace
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Buy &amp; Sell
            <span className="text-primary"> Exclusive </span>
            News Stories
          </h1>
          <p className="text-xl text-gray-600 mb-10 max-w-3xl mx-auto">
            Connect reporters with media agencies. Sell your breaking news stories
            exclusively and get paid fairly for your journalism.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/apply-buyer" className={buttonVariants({ size: "lg", className: "bg-primary hover:bg-primary/90 text-white px-8 py-6 text-lg" })}>
              <Search className="mr-2 h-5 w-5" />
              Join as Buyer
            </Link>
            <Link href="/apply-reporter" className={buttonVariants({ variant: "outline", size: "lg", className: "border-primary text-primary hover:bg-blue-50 px-8 py-6 text-lg" })}>
              <Newspaper className="mr-2 h-5 w-5" />
              Join as Reporter
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">Simple, transparent, and fast. Start buying or selling news in minutes.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Reporter Submits Story', desc: 'Verified reporters upload exclusive news stories with a price tag.' },
              { step: '02', title: 'Admin Reviews & Approves', desc: 'Our team verifies authenticity and quality before listing.' },
              { step: '03', title: 'Buyer Purchases Exclusive Rights', desc: 'Media agencies buy stories gaining complete exclusive rights.' },
            ].map((item) => (
              <div key={item.step} className="text-center p-6">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-primary font-bold text-lg">{item.step}</span>
                </div>
                <h3 className="text-xl font-semibold mb-3 text-gray-900">{item.title}</h3>
                <p className="text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Us</h2>
            <p className="text-gray-600">Everything you need to buy and sell news stories professionally.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-3">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-sm">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Browse by Category</h2>
            <p className="text-gray-600">News stories across all major beats and sectors.</p>
          </div>
          <div className="flex flex-wrap gap-3 justify-center">
            {categoryRows.map((cat) => (
              <Link key={cat.slug} href={`/marketplace?category=${cat.slug}`}>
                <Badge
                  variant="outline"
                  className="px-5 py-2 text-sm cursor-pointer hover:bg-primary hover:text-white hover:border-primary transition-colors"
                >
                  {labelFor(cat)}
                </Badge>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 bg-linear-to-r from-primary to-secondary text-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { label: 'Active Reporters', value: '500+' },
              { label: 'Stories Sold', value: '2,000+' },
              { label: 'Media Agencies', value: '150+' },
              { label: 'Categories', value: '20+' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-4xl font-bold mb-2">{stat.value}</div>
                <div className="text-white/80">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gray-900 text-white text-center">
        <div className="max-w-3xl mx-auto">
          <Star className="h-10 w-10 text-accent mx-auto mb-6" />
          <h2 className="text-4xl font-bold mb-6">Ready to Get Started?</h2>
          <p className="text-gray-400 text-lg mb-10">
            Join hundreds of reporters and media agencies already using our platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/apply-reporter" className={buttonVariants({ size: "lg", className: "bg-primary hover:bg-primary/90 px-8 py-6 text-lg" })}>
              <Newspaper className="mr-2 h-5 w-5" />
              Apply as Reporter
            </Link>
            <Link href="/apply-buyer" className={buttonVariants({ variant: "outline", size: "lg", className: "border-white text-white hover:bg-white hover:text-gray-900 px-8 py-6 text-lg" })}>
              Apply as Buyer
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}