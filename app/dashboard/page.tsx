"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Newspaper, ShoppingCart, Eye, TrendingUp, IndianRupee, Clock } from 'lucide-react';

const stats = [
  { label: 'Published Stories', value: '12', icon: Newspaper, color: 'text-blue-600', bg: 'bg-blue-50' },
  { label: 'Total Earnings', value: '₹1,24,500', icon: IndianRupee, color: 'text-green-600', bg: 'bg-green-50' },
  { label: 'Total Views', value: '15,240', icon: Eye, color: 'text-purple-600', bg: 'bg-purple-50' },
  { label: 'Pending Review', value: '3', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
];

const recentActivity = [
  { title: 'Political Rally Coverage', status: 'Sold', amount: '₹25,000', date: '2 hours ago' },
  { title: 'Corporate Fraud Exposed', status: 'Under Review', amount: '₹18,000', date: '1 day ago' },
  { title: 'Olympic Qualifier Results', status: 'Published', amount: '₹12,000', date: '3 days ago' },
  { title: 'New Medical Discovery', status: 'Sold', amount: '₹35,000', date: '1 week ago' },
];

const statusColors: Record<string, string> = {
  Sold: 'bg-green-100 text-green-700',
  'Under Review': 'bg-amber-100 text-amber-700',
  Published: 'bg-blue-100 text-blue-700',
  Rejected: 'bg-red-100 text-red-700',
};

export default function DashboardPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="text-gray-600 text-sm mt-1">Welcome back! Here&apos;s what&apos;s happening.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <Card key={stat.label} className="bg-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-500">{stat.label}</span>
                <div className={`w-8 h-8 ${stat.bg} rounded-lg flex items-center justify-center`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.map((item, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.date}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-900">{item.amount}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[item.status] || 'bg-gray-100 text-gray-600'}`}>
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
