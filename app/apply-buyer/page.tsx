"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Shield, Building, Zap, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabaseClient';

const benefits = [
  { icon: Shield, text: 'Exclusive rights to every news story you buy' },
  { icon: Building, text: 'Custom agency dashboard & member tools' },
  { icon: Zap, text: 'Instant access and high-resolution media downloads' },
];

export default function ApplyBuyer() {
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', message: '' });
  
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const { error: insertError } = await supabase
        .from('platform_applications')
        .insert([{
          type: 'buyer',
          full_name: form.full_name,
          email: form.email,
          phone: form.phone,
          message: form.message
        }]);

      if (insertError) {
        throw insertError;
      }
      setSubmitted(true);
    } catch (err: any) {
      console.error(err);
      setError('An error occurred submitting your application. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="max-w-md w-full text-center p-8 shadow-md">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold mb-3 text-gray-900">Application Received!</h2>
          <p className="text-gray-600 mb-6">Thank you for your interest in joining Kabutar Media as a Media Agency / Buyer. Our team will review your details and contact you shortly to set up your account.</p>
          <Link href="/">
            <Button className="bg-primary text-white w-full">Return to Homepage</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Join as a Media Agency</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Get exclusive access to verified, breaking news stories from our network of professional reporters.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-10 items-start">
          {/* Benefits */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Why source with us?</h2>
            <div className="space-y-4">
              {benefits.map((b, i) => (
                <div key={i} className="flex items-start gap-4 p-5 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <b.icon className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-gray-700 font-medium pt-3">{b.text}</p>
                </div>
              ))}
            </div>
            
            <div className="mt-10 p-6 bg-blue-900 rounded-xl text-white">
              <h3 className="font-semibold text-lg mb-2">Notice</h3>
              <p className="text-blue-100 text-sm leading-relaxed">
                Currently, all Buyer accounts are heavily vetted. Please fill out the form carefully, and our support team will reach out directly. Sign-ups are disabled to ensure quality.
              </p>
            </div>
          </div>

          {/* Application Form */}
          <Card className="shadow-lg border-primary/10">
            <CardHeader className="bg-white rounded-t-xl pb-4">
              <CardTitle className="text-2xl">Buyer Application Form</CardTitle>
              <CardDescription className="text-md">Submit your details and we will contact you</CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
                    {error}
                  </div>
                )}
                
                <div>
                  <Label htmlFor="full_name">Full Name / Agency Representative</Label>
                  <Input 
                    id="full_name" 
                    value={form.full_name} 
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })} 
                    required 
                    className="mt-1" 
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Work Email Address</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={form.email} 
                    onChange={(e) => setForm({ ...form, email: e.target.value })} 
                    required 
                    className="mt-1" 
                    placeholder="agency@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input 
                    id="phone" 
                    type="tel" 
                    value={form.phone} 
                    onChange={(e) => setForm({ ...form, phone: e.target.value })} 
                    required 
                    className="mt-1" 
                    placeholder="+91 9876543210"
                  />
                </div>
                <div>
                  <Label htmlFor="message">Message / Agency Details</Label>
                  <Textarea 
                    id="message" 
                    rows={4} 
                    placeholder="Tell us about the publications or agency you represent..." 
                    value={form.message} 
                    onChange={(e) => setForm({ ...form, message: e.target.value })} 
                    required 
                    className="mt-1 resize-none" 
                  />
                </div>
                <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white h-12 text-lg" disabled={isLoading}>
                  {isLoading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Submitting...</> : 'Submit Application'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
