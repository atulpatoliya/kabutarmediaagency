import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabaseServer';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const BUCKET = 'profile-images';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Server env is missing Supabase credentials.' }, { status: 500 });
    }

    const serverClient = await createServerClient();
    const {
      data: { user },
      error: userError,
    } = await serverClient.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const rawName = (formData.get('name') as string | null) ?? '';
    const name = rawName.trim();
    const rawPhone = (formData.get('phone') as string | null) ?? '';
    const phone = rawPhone.trim();
    const rawCity = (formData.get('city') as string | null) ?? '';
    const city = rawCity.trim();
    const rawBio = (formData.get('bio') as string | null) ?? '';
    const bio = rawBio.trim();
    const image = formData.get('image') as File | null;

    if (!name && !phone && !city && !bio && !image) {
      return NextResponse.json({ error: 'No changes to save.' }, { status: 400 });
    }

    if (name && name.length < 2) {
      return NextResponse.json({ error: 'Name must be at least 2 characters long.' }, { status: 400 });
    }

    if (phone && phone.length < 6) {
      return NextResponse.json({ error: 'Phone number looks too short.' }, { status: 400 });
    }

    const adminClient = createAdminClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    let avatarUrl = (user.user_metadata?.avatar_url as string | undefined) || '';

    if (image) {
      const { data: bucketData, error: bucketError } = await adminClient.storage.getBucket(BUCKET);
      if (bucketError || !bucketData) {
        const { error: createBucketError } = await adminClient.storage.createBucket(BUCKET, {
          public: true,
          fileSizeLimit: 5 * 1024 * 1024,
          allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
        });
        if (createBucketError) {
          return NextResponse.json({ error: `Bucket setup failed: ${createBucketError.message}` }, { status: 500 });
        }
      }

      const safeName = image.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `${user.id}/${Date.now()}-${safeName}`;
      const { error: uploadError } = await adminClient.storage.from(BUCKET).upload(filePath, image, { upsert: true });

      if (uploadError) {
        return NextResponse.json({ error: `Image upload failed: ${uploadError.message}` }, { status: 500 });
      }

      const { data: publicUrlData } = adminClient.storage.from(BUCKET).getPublicUrl(filePath);
      avatarUrl = publicUrlData.publicUrl;
    }

    const mergedMetadata = {
      ...(user.user_metadata || {}),
      ...(name ? { full_name: name } : {}),
      ...(phone ? { phone } : {}),
      ...(city ? { city } : {}),
      ...(bio ? { bio } : {}),
      ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
    };

    const { data: updated, error: updateError } = await adminClient.auth.admin.updateUserById(user.id, {
      user_metadata: mergedMetadata,
    });

    if (updateError) {
      return NextResponse.json({ error: `Profile update failed: ${updateError.message}` }, { status: 500 });
    }

    // For reporter/both roles, keep reporter_profiles in sync with latest editable fields.
    const { data: roleRow } = await adminClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (roleRow?.role === 'reporter' || roleRow?.role === 'both') {
      const fullNameForProfile = name || String(mergedMetadata.full_name || '').trim() || 'Not provided';
      const phoneForProfile = phone || String(mergedMetadata.phone || '').trim() || 'Not provided';
      const cityForProfile = city || String(mergedMetadata.city || '').trim() || 'Not provided';

      const { data: existingReporterProfile } = await adminClient
        .from('reporter_profiles')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      // Ensure row exists, then apply latest user-edited values.
      if (!existingReporterProfile) {
        await adminClient
          .from('reporter_profiles')
          .insert({
            user_id: user.id,
            full_name: fullNameForProfile,
            phone: phoneForProfile,
            city: cityForProfile,
            id_proof_url: '',
            bank_name: 'Not provided',
            account_number: 'Not provided',
            ifsc_code: 'Not provided',
            agreement_accepted: false,
          });
      }

      const profilePatch: Record<string, string> = {};
      if (name) profilePatch.full_name = fullNameForProfile;
      if (phone) profilePatch.phone = phoneForProfile;
      if (city) profilePatch.city = cityForProfile;

      if (Object.keys(profilePatch).length > 0) {
        await adminClient
          .from('reporter_profiles')
          .update(profilePatch)
          .eq('user_id', user.id);
      }
    }

    return NextResponse.json({
      success: true,
      fullName: (updated.user.user_metadata?.full_name as string | undefined) || '',
      avatarUrl: (updated.user.user_metadata?.avatar_url as string | undefined) || '',
      phone: (updated.user.user_metadata?.phone as string | undefined) || '',
      city: (updated.user.user_metadata?.city as string | undefined) || '',
      bio: (updated.user.user_metadata?.bio as string | undefined) || '',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unexpected server error.' }, { status: 500 });
  }
}
