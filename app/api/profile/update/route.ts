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
    const image = formData.get('image') as File | null;

    if (!name && !image) {
      return NextResponse.json({ error: 'No changes to save.' }, { status: 400 });
    }

    if (name && name.length < 2) {
      return NextResponse.json({ error: 'Name must be at least 2 characters long.' }, { status: 400 });
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
      ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
    };

    const { data: updated, error: updateError } = await adminClient.auth.admin.updateUserById(user.id, {
      user_metadata: mergedMetadata,
    });

    if (updateError) {
      return NextResponse.json({ error: `Profile update failed: ${updateError.message}` }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      fullName: (updated.user.user_metadata?.full_name as string | undefined) || '',
      avatarUrl: (updated.user.user_metadata?.avatar_url as string | undefined) || '',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unexpected server error.' }, { status: 500 });
  }
}
