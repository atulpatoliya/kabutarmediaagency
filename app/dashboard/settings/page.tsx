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
    const [initialPreviewUrl, setInitialPreviewUrl] = useState<string>('');
    const [userEmail, setUserEmail] = useState('');
    const [userMobile, setUserMobile] = useState('');
    const [initialUserMobile, setInitialUserMobile] = useState('');
    const [userCity, setUserCity] = useState('');
    const [initialUserCity, setInitialUserCity] = useState('');
    const [userBio, setUserBio] = useState('');
    const [initialUserBio, setInitialUserBio] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const supabase = createClient();

    // Fetch user data on mount
    useEffect(() => {
        if (!supabase) {
            setIsLoading(false);
            return;
        }

        const fetchUserData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    setCurrentUserId(user.id);
                    setUserEmail(user.email || '');
                    const fullNameFromMeta = (user.user_metadata?.full_name as string | undefined)?.trim();
                    if (fullNameFromMeta) {
                        setName(fullNameFromMeta);
                        setInitialName(fullNameFromMeta);
                    }

                    const avatarUrl = (user.user_metadata?.avatar_url as string | undefined) || '';
                    if (avatarUrl) {
                        setPreviewUrl(avatarUrl);
                        setInitialPreviewUrl(avatarUrl);
                    }

                                        const phoneFromMeta = String(user.user_metadata?.phone || '').trim();
                                        const cityFromMeta = String(user.user_metadata?.city || '').trim();
                                        const bioFromMeta = String(user.user_metadata?.bio || '').trim();

                                        setUserMobile(phoneFromMeta);
                                        setInitialUserMobile(phoneFromMeta);
                                        setUserCity(cityFromMeta);
                                        setInitialUserCity(cityFromMeta);
                                        setUserBio(bioFromMeta);
                                        setInitialUserBio(bioFromMeta);

                                        // Reporter users can also read own reporter profile via RLS.
                                        const { data: selfRole } = await supabase
                                            .from('users')
                                            .select('role')
                                            .eq('id', user.id)
                                            .maybeSingle();

                                        if (selfRole?.role === 'reporter' || selfRole?.role === 'both') {
                                            const { data: profileRow } = await supabase
                                                .from('reporter_profiles')
                                                .select('phone, city, full_name')
                                                .eq('user_id', user.id)
                                                .maybeSingle();

                                            if (profileRow?.full_name && !fullNameFromMeta) {
                                                setName(profileRow.full_name);
                                                setInitialName(profileRow.full_name);
                                            }

                                            if (profileRow?.phone && !phoneFromMeta) {
                                                setUserMobile(profileRow.phone);
                                                setInitialUserMobile(profileRow.phone);
                                            }

                                            if (profileRow?.city && !cityFromMeta) {
                                                setUserCity(profileRow.city);
                                                setInitialUserCity(profileRow.city);
                                            }
                                        }
                }
            } catch (error) {
                console.error('Error fetching user data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUserData();
    }, [supabase]);

    // Check if there are unsaved changes
    const normalizedName = name.trim();
    const normalizedPhone = userMobile.trim();
    const normalizedCity = userCity.trim();
    const normalizedBio = userBio.trim();
    const hasNameChanges = normalizedName !== initialName.trim();
    const hasPhoneChanges = normalizedPhone !== initialUserMobile.trim();
    const hasCityChanges = normalizedCity !== initialUserCity.trim();
    const hasBioChanges = normalizedBio !== initialUserBio.trim();
    const hasImageChanges = profileImage !== null;
    const hasChanges = hasNameChanges || hasPhoneChanges || hasCityChanges || hasBioChanges || hasImageChanges;
    const canSubmit = hasChanges && !isSaving && !errorMessage && (normalizedName.length >= 2 || hasImageChanges);

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
        if (errorMessage || !currentUserId || !hasChanges) {
            return;
        }

        if (normalizedName.length > 0 && normalizedName.length < 2 && !hasImageChanges) {
            setErrorMessage('Name must be at least 2 characters long.');
            return;
        }

        setIsSaving(true);
        try {
            const formData = new FormData();
            if (normalizedName.length >= 2) {
                formData.append('name', normalizedName);
            }
            formData.append('phone', normalizedPhone);
            formData.append('city', normalizedCity);
            formData.append('bio', normalizedBio);
            if (profileImage) {
                formData.append('image', profileImage);
            }

            const response = await fetch('/api/profile/update', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result?.error || 'Profile update failed.');
            }

            const updatedName = (result?.fullName as string | undefined) || normalizedName;
            const updatedAvatarUrl = (result?.avatarUrl as string | undefined) || initialPreviewUrl;
            const updatedPhone = (result?.phone as string | undefined) ?? normalizedPhone;
            const updatedCity = (result?.city as string | undefined) ?? normalizedCity;
            const updatedBio = (result?.bio as string | undefined) ?? normalizedBio;

            setName(updatedName || '');
            setInitialName(updatedName || '');
            setUserMobile(updatedPhone || '');
            setInitialUserMobile(updatedPhone || '');
            setUserCity(updatedCity || '');
            setInitialUserCity(updatedCity || '');
            setUserBio(updatedBio || '');
            setInitialUserBio(updatedBio || '');
            setProfileImage(null);
            setInitialPreviewUrl(updatedAvatarUrl || '');
            setPreviewUrl(updatedAvatarUrl || '');
            window.dispatchEvent(new CustomEvent('profile-updated', {
                detail: {
                    fullName: updatedName || '',
                    avatarUrl: updatedAvatarUrl || '',
                },
            }));
            setSaveSuccess(true);

            // Reset success message after 2 seconds
            setTimeout(() => setSaveSuccess(false), 2000);
        } catch (error) {
            console.error('Error saving profile:', error);
            setErrorMessage('Failed to save profile. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleReset = () => {
        setName(initialName);
        setUserMobile(initialUserMobile);
        setUserCity(initialUserCity);
        setUserBio(initialUserBio);
        setProfileImage(null);
        setErrorMessage('');
        setPreviewUrl(initialPreviewUrl);
    };

    if (!supabase) {
        return (
            <div className="min-h-screen bg-gray-50 p-6">
                <div className="max-w-2xl">
                    <p className="text-red-600">Supabase is not configured. Please check environment variables.</p>
                </div>
            </div>
        );
    }

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
                                        onChange={(e) => setUserMobile(e.target.value)}
                                        placeholder="Enter your mobile number"
                                    />
                                    <p className="text-xs text-gray-500 mt-2">You can update your mobile number here.</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        City
                                    </label>
                                    <Input
                                        type="text"
                                        value={userCity}
                                        onChange={(e) => setUserCity(e.target.value)}
                                        placeholder="Enter your city"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        About / Bio
                                    </label>
                                    <textarea
                                        value={userBio}
                                        onChange={(e) => setUserBio(e.target.value)}
                                        rows={4}
                                        className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs"
                                        placeholder="Tell us about yourself"
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-4">
                            <Button
                                type="submit"
                                disabled={!canSubmit}
                                className={`flex-1 flex items-center justify-center gap-2 ${
                                    !canSubmit
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