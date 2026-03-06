"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings as SettingsIcon } from 'lucide-react';

export default function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
        <p className="text-gray-600 mt-1">Manage your profile, password, and preferences</p>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
           <CardTitle className="flex items-center gap-2">
             <SettingsIcon className="h-5 w-5 text-gray-500" />
             Work in Progress
           </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
             The settings panel is currently under construction. Please check back later!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
