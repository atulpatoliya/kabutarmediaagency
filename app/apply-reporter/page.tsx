"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, IndianRupee, FileText, Star, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabaseClient';

const benefits = [
  { icon: IndianRupee, text: 'Set your own prices and earn ₹10,000–₹50,000+ per story' },
  { icon: FileText, text: 'Sell complete exclusive rights to top media agencies' },
  { icon: Star, text: 'Gain recognition from premium publishers across India' },
];

export default function ApplyReporter() {
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
          type: 'reporter',
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
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold mb-3 text-gray-900">Application Received!</h2>
          <p className="text-gray-600 mb-6">Thank you for your interest in joining Kabutar Media as a Reporter. Our team will review your application and contact you directly via phone or email to set up your account.</p>
          <Link href="/" className={buttonVariants({ className: "bg-primary text-white w-full" })}>
            Return to Homepage
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-gray-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Become a Reporter</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Join our verified network of journalists and sell your exclusive news stories directly to premium media agencies.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-10 items-start">
          {/* Benefits */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Why Join Us?</h2>
            <div className="space-y-4">
              {benefits.map((b, i) => (
                <div key={i} className="flex items-start gap-4 p-5 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <b.icon className="h-6 w-6 text-green-700" />
                  </div>
                  <p className="text-gray-700 font-medium pt-3">{b.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Application Form */}
          <Card className="shadow-lg border-green-700/10">
            <CardHeader className="bg-white rounded-t-xl pb-4">
              <CardTitle className="text-2xl text-gray-900">Reporter Application</CardTitle>
              <CardDescription className="text-md">Fill out the form below to start selling news</CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
                    {error}
                  </div>
                )}

                <div>
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    required
                    className="mt-1"
                    placeholder="E.g., Sanjay Kumar"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                    className="mt-1"
                    placeholder="yourname@gmail.com"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number (WhatsApp Active)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    required
                    className="mt-1"
                    placeholder="+91 9123456780"
                  />
                </div>
                <div>
                  <Label htmlFor="message">Experience / Brief Bio</Label>
                  <Textarea
                    id="message"
                    rows={4}
                    placeholder="Tell us about yourself, your location, and what kind of news you usually cover..."
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    required
                    className="mt-1 resize-none"
                  />
                </div>
                <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 h-12 text-white text-lg" disabled={isLoading}>
                  {isLoading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Submitting...</> : 'Apply as Reporter'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}