"use client";

import { Card, CardContent } from '@/components/ui/card';
import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function Purchases() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Purchases</h1>
        <p className="text-gray-600 mt-1">View the exclusive news stories you've bought</p>
      </div>

      <Card className="border-dashed shadow-none">
        <CardContent className="flex flex-col items-center justify-center p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <ShoppingCart className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Purchases Yet</h3>
          <p className="text-gray-500 max-w-sm mx-auto mb-6">
            You haven't bought any news stories yet. Explore the marketplace to find exclusive scoops!
          </p>
          <Link href="/marketplace">
             <Button className="bg-primary hover:bg-primary/90 text-white">
               Browse Marketplace
             </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
