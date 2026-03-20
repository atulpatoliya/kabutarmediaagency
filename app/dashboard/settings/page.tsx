'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { User, Mail, Phone, Image, Loader2, Check } from 'lucide-react';
import { createClient } from '@/lib/supabaseClient';

const UserProfileManagement = () => {
    const [name, setName] = useState('');
    const [initialName, setInitialName] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [profileImage, setProfileImage] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string>('');
    const [userEmail, setUserEmail] = useState('');
    const [userMobile, setUserMobile] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const supabase = createClient();

    // Fetch user data on mount
    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    setCurrentUserId(user.id);
                    setUserEmail(user.email || '');
                    
                    // Fetch user phone from metadata or database
                    const phone = user.user_metadata?.phone || user.phone || '+1234567890';
                    setUserMobile(phone);

                    // Fetch user profile
                    const { data: profile } = await supabase
                        .from('reporter_profiles')
                        .select('full_name, profile_image')
                        .eq('user_id', user.id)
                        .single();

                    if (profile?.full_name) {
                        setName(profile.full_name);
                        setInitialName(profile.full_name);
                    }

                    if (profile?.profile_image) {
                        setPreviewUrl(profile.profile_image);
                    }
                }
            } catch (error) {
                console.error('Error fetching user data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUserData();
    }, []);

    // Check if there are unsaved changes
    const hasChanges = name !== initialName || profileImage !== null;

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setName(value);
        if (value.length < 2 && value.length > 0) {
            setErrorMessage('Name must be at least 2 characters long.');
        } else {
            setErrorMessage('');
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setProfileImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!errorMessage && name.length >= 2 && currentUserId && hasChanges) {
            setIsSaving(true);
            try {
                // Update full_name in database
                const { error } = await supabase
                    .from('reporter_profiles')
                    .update({ full_name: name })
                    .eq('user_id', currentUserId);

                if (error) {
                    throw error;
                }

                setInitialName(name);
                setProfileImage(null);
                setSaveSuccess(true);
                
                // Reset success message after 2 seconds
                setTimeout(() => setSaveSuccess(false), 2000);

                // Trigger a page reload to update the navbar
                window.location.href = '/dashboard/settings';
            } catch (error) {
                console.error('Error saving profile:', error);
                setErrorMessage('Failed to save profile. Please try again.');
            } finally {
                setIsSaving(false);
            }
        }
    };

    const handleReset = () => {
        setName(initialName);
        setProfileImage(null);
        setErrorMessage('');
        if (previewUrl && !profileImage) {
            // Keep the original preview
        } else {
            setPreviewUrl('');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-2xl">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
                    <p className="text-gray-600 mt-2">Manage your profile and account settings</p>
                </div>

                {/* Success Message */}
                {saveSuccess && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                        <Check className="w-5 h-5 text-green-600" />
                        <span className="text-green-700 font-medium">Profile updated successfully!</span>
                    </div>
                )}

                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Profile Picture Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Image className="w-5 h-5 text-blue-600" />
                                    Profile Picture
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-col items-center gap-6">
                                    <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border-4 border-gray-300">
                                        {previewUrl ? (
                                            <img src={previewUrl} alt="Profile" className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="w-16 h-16 text-gray-400" />
                                        )}
                                    </div>
                                    <label className="w-full">
                                        <Input
                                            type="file"
                                            onChange={handleImageUpload}
                                            accept="image/*"
                                            className="cursor-pointer"
                                        />
                                        <p className="text-xs text-gray-500 mt-2">PNG, JPG up to 5MB</p>
                                    </label>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Personal Information Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <User className="w-5 h-5 text-blue-600" />
                                    Personal Information
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Full Name *
                                    </label>
                                    <Input
                                        type="text"
                                        placeholder="Enter your full name"
                                        value={name}
                                        onChange={handleNameChange}
                                        required
                                    />
                                    {errorMessage && (
                                        <p className="text-red-500 text-sm mt-2">{errorMessage}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        <Mail className="w-4 h-4 inline mr-1" />
                                        Email Address
                                    </label>
                                    <Input
                                        type="email"
                                        value={userEmail}
                                        readOnly
                                        className="bg-gray-100 cursor-not-allowed"
                                    />
                                    <p className="text-xs text-gray-500 mt-2">Email cannot be changed</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        <Phone className="w-4 h-4 inline mr-1" />
                                        Mobile Number
                                    </label>
                                    <Input
                                        type="tel"
                                        value={userMobile}
                                        readOnly
                                        className="bg-gray-100 cursor-not-allowed"
                                    />
                                    <p className="text-xs text-gray-500 mt-2">Contact support to change mobile</p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-4">
                            <Button
                                type="submit"
                                disabled={!hasChanges || isSaving || name.length < 2}
                                className={`flex-1 flex items-center justify-center gap-2 ${
                                    !hasChanges || isSaving || name.length < 2
                                        ? 'bg-gray-400 cursor-not-allowed'
                                        : 'bg-blue-600 hover:bg-blue-700'
                                }`}
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    'Save Changes'
                                )}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                className="flex-1"
                                onClick={handleReset}
                                disabled={isSaving}
                            >
                                Reset
                            </Button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default UserProfileManagement;