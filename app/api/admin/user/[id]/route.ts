import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function resetPasswordEmailHTML(name: string, resetLink: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#1a56db,#6366f1);padding:40px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:700;">🕊️ Kabutar Media</h1>
              <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px;">News Marketplace Platform</p>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 40px;">
              <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 20px;">
                Dear <strong>${name}</strong>,
              </p>
              <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 28px;">
                We received a request to reset the password for your Kabutar Media account.
              </p>
              <div style="text-align:center;margin-bottom:28px;">
                <a href="${resetLink}" style="display:inline-block;background:linear-gradient(135deg,#1a56db,#6366f1);color:#ffffff;text-decoration:none;padding:14px 48px;border-radius:50px;font-size:16px;font-weight:700;letter-spacing:0.5px;">
                  Reset Your Password →
                </a>
              </div>
              <p style="color:#6b7280;font-size:13px;margin:0;">
                If you did not request a password reset, please ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const userId = resolvedParams.id;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // 1. Get role and status from public.users
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 500 });
    }

    // 2. Get auth email and metadata
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    // 3. Get profile
    const { data: profileData } = await supabaseAdmin
      .from('reporter_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    // 4. Get news & transactions depending on role
    let newsList = [];
    let transactionsList = [];

    if (userData.role === 'reporter') {
      const { data: news } = await supabaseAdmin
        .from('news')
        .select('*')
        .eq('reporter_id', userId)
        .order('created_at', { ascending: false });
      newsList = news || [];
    } else if (userData.role === 'buyer') {
      const { data: txns } = await supabaseAdmin
        .from('transactions')
        .select('*, news:news_id(*)')
        .eq('buyer_id', userId)
        .order('purchase_date', { ascending: false });
      transactionsList = txns || [];
    }

    return NextResponse.json({
      user: {
        ...userData,
        email: authData?.user?.email,
        metadata: authData?.user?.user_metadata || {},
        profile: profileData
      },
      news: newsList,
      transactions: transactionsList
    });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const userId = resolvedParams.id;
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const { email, password, sendResetLink, name } = await request.json();

    if (sendResetLink) {
      if (!email) {
        return NextResponse.json({ error: 'Email required to send reset link.' }, { status: 400 });
      }

      // Generate the password recovery link
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: email,
      });

      if (linkError) {
         return NextResponse.json({ error: linkError.message }, { status: 500 });
      }

      // Send via Resend
      const resendApiKey = process.env.RESEND_API_KEY;
      if (resendApiKey) {
        const resend = new Resend(resendApiKey);
        try {
          await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'Kabutar Media <onboarding@resend.dev>',
            to: [email],
            subject: 'Reset Your Kabutar Media Password',
            html: resetPasswordEmailHTML(name || 'User', linkData.properties.action_link)
          });
          return NextResponse.json({ success: true, emailSent: true });
        } catch (emailErr: any) {
          console.error('Password reset email error:', emailErr);
          return NextResponse.json({ error: 'Failed to send automated email: ' + emailErr.message }, { status: 500 });
        }
      } else {
        // Return the link directly to the admin so they can copy-paste it
        return NextResponse.json({ 
          success: true, 
          emailSent: false, 
          resetLink: linkData.properties.action_link 
        });
      }
    }

    if (!email && !password) {
       return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const updates: any = {};
    if (email) updates.email = email;
    if (password) updates.password = password;

    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      updates
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, user: data.user });

  } catch (error: any) {
    console.error('Update Creds API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
