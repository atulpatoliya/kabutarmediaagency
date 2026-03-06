"use client";

import { useState } from 'react';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Eye, Clock, IndianRupee, MapPin, Share2, ShieldCheck, FileCheck, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

// Using the same mock data as the marketplace for seamless transitioning
const mockNews = [
  { id: '1', title: 'Major Political Development in Delhi', category: 'Politics', price: 25000, views: 1200, timeAgo: '2 hours ago', exclusive: true, description: 'Exclusive details about the upcoming political alliance ahead of the assembly elections. Contains insider quotes and signed documents. High impact story appropriate for national television broadcast and front-page news coverage.', location: 'New Delhi, Delhi' },
  { id: '2', title: 'Tech Giant Announces India Expansion', category: 'Technology', price: 18000, views: 980, timeAgo: '4 hours ago', exclusive: true, description: 'A global tech company is set to announce a $1B investment in India. Unreleased press info detailing the new HQ location and mass hiring initiatives planned for Q3.', location: 'Bangalore, Karnataka' },
  { id: '3', title: 'New Sports Stadium for Mumbai', category: 'Sports', price: 12000, views: 756, timeAgo: '6 hours ago', exclusive: true, description: 'Architectural plans and construction timelines for the proposed international sports complex in South Mumbai. Contains exclusive renderings and municipal approvals.', location: 'Mumbai, Maharashtra' },
  { id: '4', title: 'Healthcare Breakthrough at AIIMS', category: 'Health', price: 35000, views: 2100, timeAgo: '1 hour ago', exclusive: true, description: 'Unpublished clinical trial results detailing a new effective treatment approach for targeted disease variations. Interview clips with lead researchers included.', location: 'New Delhi, Delhi' },
  { id: '5', title: 'Economic Survey Results Released', category: 'Business', price: 20000, views: 1500, timeAgo: '3 hours ago', exclusive: true, description: 'Complete pre-release breakdown of the national economic survey, including segment growth predictions and raw data spreadsheets not yet available to the public.', location: 'Mumbai, Maharashtra' },
  { id: '6', title: 'Bollywood Celebrity in Legal Trouble', category: 'Entertainment', price: 15000, views: 3200, timeAgo: '30 minutes ago', exclusive: true, description: 'Verified copies of the legal notices sent to a leading A-list actor regarding the new controversy. Includes video footage and exclusive eyewitness statements.', location: 'Mumbai, Maharashtra' },
];

export default function NewsDetail({ params }: { params: { id: string } }) {
  const [isPurchasing, setIsPurchasing] = useState(false);
  
  // Find the news item from mock data
  const newsItem = mockNews.find(n => n.id === params.id);
  
  if (!newsItem) {
    return notFound();
  }

  const handlePurchase = () => {
    setIsPurchasing(true);
    // Simulate purchase network request
    setTimeout(() => {
      alert("This is a demo! In the final version, this will open the Razorpay checkout overlay to purchase the exclusive rights to this specific news story.");
      setIsPurchasing(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Back Link */}
        <Link href="/marketplace" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-primary mb-6 transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Marketplace
        </Link>
        
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content (Left Side) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-200">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <Badge variant="outline" className="text-sm font-medium border-primary/30 text-primary bg-primary/5 px-3 py-1">
                  {newsItem.category}
                </Badge>
                {newsItem.exclusive && (
                  <Badge className="text-sm font-medium bg-amber-100 text-amber-800 border-amber-200 px-3 py-1">
                    <ShieldCheck className="w-3 h-3 mr-1" /> EXCLUSIVE RIGHTS
                  </Badge>
                )}
              </div>
              
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 leading-tight">
                {newsItem.title}
              </h1>
              
              <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500 mb-8 pb-8 border-b border-gray-100">
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  <span>{newsItem.location}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  <span>{newsItem.timeAgo}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Eye className="h-4 w-4" />
                  <span>{newsItem.views.toLocaleString()} views</span>
                </div>
              </div>
              
              <div className="prose prose-gray max-w-none">
                <h3 className="text-xl font-semibold mb-4 text-gray-900">Story Overview</h3>
                <p className="text-gray-700 leading-relaxed text-lg mb-6">
                  {newsItem.description}
                </p>
                <div className="mt-8 bg-blue-50 border border-blue-100 rounded-xl p-5">
                  <div className="flex items-start gap-4">
                    <div className="mt-1 bg-white p-2 rounded-full shadow-sm">
                      <FileCheck className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">What's included in the package:</h4>
                      <ul className="text-sm text-gray-700 space-y-2">
                        <li>• Full written manuscript/article</li>
                        <li>• High-resolution unwatermarked photos/videos</li>
                        <li>• Supporting documents and verified evidence</li>
                        <li>• Complete commercial and broadcasting rights</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Sidebar / Checkout (Right Side) */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              <Card className="shadow-lg border-2 border-primary/10 overflow-hidden">
                <div className="bg-primary/5 p-6 border-b border-gray-100 text-center">
                  <p className="text-sm text-gray-500 font-medium mb-1">Exclusive Purchase Price</p>
                  <div className="flex items-center justify-center gap-1">
                    <IndianRupee className="h-7 w-7 text-gray-900" />
                    <span className="text-4xl font-extrabold text-gray-900">
                      {newsItem.price.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
                <CardContent className="p-6">
                  <Button 
                    className="w-full bg-primary hover:bg-primary/90 text-white py-6 text-lg font-bold shadow-md"
                    onClick={handlePurchase}
                    disabled={isPurchasing}
                  >
                    {isPurchasing ? (
                      <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing...</>
                    ) : 'Buy Exclusive Rights'}
                  </Button>
                  
                  <p className="text-xs text-center text-gray-500 mt-4 leading-relaxed">
                    By purchasing this story, you agree to our Terms of Service. 
                    The story will be immediately removed from the marketplace upon successful payment.
                  </p>
                </CardContent>
              </Card>
              
              <Card className="shadow-sm border-gray-200">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <ShieldCheck className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 leading-tight">Verified Source</h4>
                    <p className="text-xs text-gray-500 mt-1">This reporter has been KYC authenticated by the Kabutar Media team.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
