import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Server-side only – uses service role key which is never exposed to the browser
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let pwd = 'KB@';
  for (let i = 0; i < 8; i++) {
    pwd += chars[Math.floor(Math.random() * chars.length)];
  }
  return pwd;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { applicationId, action, email, name, type } = body;

    if (!applicationId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // ────────────────────────────────────────────────
    // REJECT flow
    // ────────────────────────────────────────────────
    if (action === 'reject') {
      const { error } = await supabaseAdmin
        .from('platform_applications')
        .update({ status: 'rejected' })
        .eq('id', applicationId);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      // Send rejection email via Supabase invite trick – instead, just return details
      // so the admin modal shows the template
      return NextResponse.json({
        success: true,
        action: 'rejected',
        emailTemplate: {
          to: email,
          subject: 'Your Kabutar Media Application Status',
          body: `Dear ${name},\n\nThank you for applying to Kabutar Media Agency.\n\nAfter reviewing your application, we regret to inform you that we are unable to approve your request at this time.\n\nIf you have any queries, please contact our support team:\n📧 kabutarmedia@gmail.com\n📞 +91 9726530209\n\nBest regards,\nKabutar Media Team`
        }
      });
    }

    // ────────────────────────────────────────────────
    // APPROVE flow
    // ────────────────────────────────────────────────
    if (action === 'approve') {
      if (!email || !name || !type) {
        return NextResponse.json({ error: 'Missing email, name, or type for approval' }, { status: 400 });
      }

      const generatedPassword = generatePassword();

      // 1. Create auth user (email confirmed immediately)
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: generatedPassword,
        email_confirm: true,
        user_metadata: { full_name: name }
      });

      if (createError) {
        // If user already exists in auth, just update the app status
        if (createError.message.includes('already been registered')) {
          await supabaseAdmin
            .from('platform_applications')
            .update({ status: 'approved' })
            .eq('id', applicationId);

          return NextResponse.json({
            success: false,
            error: `An account with email "${email}" already exists in the system.`
          }, { status: 409 });
        }
        return NextResponse.json({ error: createError.message }, { status: 500 });
      }

      const userId = newUser.user.id;

      // 2. The handle_new_user trigger creates a public.users row with role='buyer'
      //    Wait briefly then update the role if reporter
      await new Promise(r => setTimeout(r, 500));

      const roleToSet = type === 'reporter' ? 'reporter' : 'buyer';

      const { error: roleError } = await supabaseAdmin
        .from('users')
        .upsert({
          id: userId,
          role: roleToSet,
          status: 'approved'
        }, { onConflict: 'id' });

      if (roleError) {
        console.error('Role update error:', roleError);
        // Not fatal – trigger may have set buyer role already
      }

      // 3. Update application status to approved
      await supabaseAdmin
        .from('platform_applications')
        .update({ status: 'approved' })
        .eq('id', applicationId);

      // 4. Generate a magic login link so the user can set their own session
      const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email
      });

      const loginLink = linkData?.properties?.action_link || `${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('.supabase.co', '')}/login`;

      return NextResponse.json({
        success: true,
        action: 'approved',
        credentials: {
          email,
          password: generatedPassword,
          loginLink: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://kabutarmedia.vercel.app'}/login`
        },
        emailTemplate: {
          to: email,
          subject: 'Welcome to Kabutar Media — Your Account is Approved! ✅',
          body: `Dear ${name},\n\nCongratulations! Your application to join Kabutar Media Agency has been APPROVED.\n\nHere are your login credentials:\n\n📧 Email: ${email}\n🔑 Password: ${generatedPassword}\n\n👉 Login here: https://kabutarmedia.vercel.app/login\n\nWe recommend you change your password after your first login.\n\nFor any support:\n📧 kabutarmedia@gmail.com\n📞 +91 9726530209\n\nBest regards,\nKabutar Media Team`
        }
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (err: any) {
    console.error('process-application error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
