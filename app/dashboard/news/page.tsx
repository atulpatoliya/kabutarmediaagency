"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function MyNews() {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My News Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage all your submitted and published news stories here</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 text-white gap-2">
          <PlusCircle className="h-4 w-4" />
          Submit New Story
        </Button>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              type="text" 
              placeholder="Search news title..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" className="gap-2 w-full sm:w-auto">
            <Filter className="h-4 w-4" />
            Filter Status
          </Button>
        </CardContent>
      </Card>

      {/* Empty State / Content area */}
      <Card className="border-dashed shadow-none">
        <CardContent className="flex flex-col items-center justify-center p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <PlusCircle className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No News Stories Found</h3>
          <p className="text-gray-500 max-w-sm mx-auto mb-6">
            You haven't submitted any news stories yet, or none match your search criteria.
          </p>
          <Button className="bg-primary hover:bg-primary/90 text-white gap-2">
            <PlusCircle className="h-4 w-4" />
            Submit Your First Story
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
