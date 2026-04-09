import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { createClient as createServerClient } from '@/lib/supabaseServer';

const __SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const __SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
if (!__SUPABASE_URL || !__SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Server env missing: SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY');
}
const supabaseAdmin = createClient(__SUPABASE_URL, __SUPABASE_SERVICE_ROLE_KEY);
const MASTER_ADMIN_EMAIL = (process.env.NEXT_PUBLIC_MASTER_ADMIN_EMAIL || 'directoratulpatoliya@gmail.com').toLowerCase();
const APP_BASE_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://kabutarmedia.vercel.app').replace(/\/$/, '');

export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const { data: roleRow } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const isAdminByRole = roleRow?.role === 'admin';
  const isMasterAdminEmail = (user.email || '').toLowerCase() === MASTER_ADMIN_EMAIL;

  if (!isAdminByRole && !isMasterAdminEmail) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { userId: user.id };
}

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let pwd = 'KB@';
  for (let i = 0; i < 8; i++) {
    pwd += chars[Math.floor(Math.random() * chars.length)];
  }
  return pwd;
}

// ─── HTML Email Templates ────────────────────────────────────────────────────

function approvalEmailHTML(name: string, email: string, password: string, role: string): string {
  const loginUrl = `${APP_BASE_URL}/login`;
  const settingsUrl = `${APP_BASE_URL}/dashboard/settings`;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a56db,#6366f1);padding:40px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:700;">🕊️ Kabutar Media</h1>
              <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px;">News Marketplace Platform</p>
            </td>
          </tr>

          <!-- Green approved banner -->
          <tr>
            <td style="background:#f0fdf4;padding:24px;text-align:center;border-bottom:1px solid #bbf7d0;">
              <div style="display:inline-block;background:#22c55e;border-radius:50%;padding:12px;margin-bottom:12px;">
                <span style="font-size:28px;">✅</span>
              </div>
              <h2 style="color:#15803d;margin:0;font-size:24px;font-weight:700;">Application Approved!</h2>
              <p style="color:#166534;margin:8px 0 0;font-size:15px;">Your ${role} account has been activated.</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 20px;">
                Dear <strong>${name}</strong>,
              </p>
              <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 28px;">
                Congratulations! Your profile is now approved on <strong>Kabutar Media Agency</strong> as a <strong>${role}</strong>. Here are your login credentials:
              </p>

              <!-- Credentials Box -->
              <div style="background:#f8fafc;border:2px solid #e2e8f0;border-radius:12px;padding:24px;margin-bottom:28px;">
                <h3 style="color:#1e293b;margin:0 0 16px;font-size:16px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">🔑 Your Login Details</h3>
                <table cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;">
                      <span style="color:#64748b;font-size:13px;font-weight:600;">EMAIL ADDRESS</span><br>
                      <span style="color:#1e293b;font-size:16px;font-weight:700;">${email}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:10px 0;">
                      <span style="color:#64748b;font-size:13px;font-weight:600;">PASSWORD</span><br>
                      <span style="color:#1e293b;font-size:20px;font-weight:700;letter-spacing:2px;font-family:monospace;background:#f1f5f9;padding:4px 12px;border-radius:6px;">${password}</span>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Login Button -->
              <div style="text-align:center;margin-bottom:28px;">
                <a href="${loginUrl}" style="display:inline-block;background:linear-gradient(135deg,#1a56db,#6366f1);color:#ffffff;text-decoration:none;padding:14px 48px;border-radius:50px;font-size:16px;font-weight:700;letter-spacing:0.5px;">
                  Login to Your Account →
                </a>
              </div>

              <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:16px;margin-bottom:18px;">
                <h4 style="margin:0 0 8px;color:#1e3a8a;font-size:14px;">Next Step: Complete Your General Profile Details</h4>
                <p style="margin:0;color:#1e40af;font-size:13px;line-height:1.5;">
                  After login, please fill/update your general details (phone, city, bio, profile photo) from Settings.
                </p>
                <div style="margin-top:12px;">
                  <a href="${settingsUrl}" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;font-size:13px;font-weight:700;">
                    Open Settings
                  </a>
                </div>
              </div>

              <p style="color:#6b7280;font-size:13px;background:#fffbeb;border-left:4px solid #f59e0b;padding:12px 16px;border-radius:0 8px 8px 0;margin:0;">
                ⚠️ <strong>Security Tip:</strong> Please change your password after your first login for account security.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:24px 40px;text-align:center;">
              <p style="color:#6b7280;font-size:13px;margin:0;">Need help? Contact our team:<br>
                📧 <a href="mailto:kabutarmedia@gmail.com" style="color:#1a56db;text-decoration:none;">kabutarmedia@gmail.com</a> &nbsp;|&nbsp;
                📞 <a href="tel:+919726530209" style="color:#1a56db;text-decoration:none;">+91 9726530209</a>
              </p>
              <p style="color:#9ca3af;font-size:12px;margin:12px 0 0;">© 2025 Kabutar Media Agency. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function rejectionEmailHTML(name: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a56db,#6366f1);padding:40px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:700;">🕊️ Kabutar Media</h1>
              <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px;">News Marketplace Platform</p>
            </td>
          </tr>

          <!-- Red rejection banner -->
          <tr>
            <td style="background:#fef2f2;padding:24px;text-align:center;border-bottom:1px solid #fecaca;">
              <h2 style="color:#dc2626;margin:0;font-size:22px;font-weight:700;">Application Status Update</h2>
              <p style="color:#991b1b;margin:8px 0 0;font-size:15px;">We are unable to approve your request at this time.</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 20px;">
                Dear <strong>${name}</strong>,
              </p>
              <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 20px;">
                Thank you for your interest in joining <strong>Kabutar Media Agency</strong>. We appreciate the time you took to submit your application.
              </p>
              <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 28px;">
                After careful review, we regret to inform you that we are unable to approve your application at this time. This may be due to eligibility criteria or current platform capacity.
              </p>

              <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:20px;margin-bottom:28px;text-align:center;">
                <p style="color:#c2410c;font-size:15px;font-weight:600;margin:0 0 8px;">Have Questions?</p>
                <p style="color:#9a3412;font-size:14px;margin:0;">Feel free to reach out to our support team and we will be happy to assist you.</p>
              </div>

              <!-- Contact Box -->
              <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;padding:20px;">
                <h3 style="color:#0369a1;margin:0 0 12px;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">📞 Contact Our Support Team</h3>
                <p style="margin:6px 0;color:#374151;font-size:14px;">📧 <a href="mailto:kabutarmedia@gmail.com" style="color:#1a56db;text-decoration:none;font-weight:600;">kabutarmedia@gmail.com</a></p>
                <p style="margin:6px 0;color:#374151;font-size:14px;">📞 <a href="tel:+919726530209" style="color:#1a56db;text-decoration:none;font-weight:600;">+91 9726530209</a></p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:24px 40px;text-align:center;">
              <p style="color:#9ca3af;font-size:12px;margin:0;">© 2025 Kabutar Media Agency. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Main Handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) {
      return auth.error;
    }

    const body = await request.json();
    const { applicationId, action, email, name, type } = body;

    if (!applicationId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Initialize Resend only when API key is available
    const resendApiKey = process.env.RESEND_API_KEY;
    const resend = resendApiKey ? new Resend(resendApiKey) : null;
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'Kabutar Media <onboarding@resend.dev>';

    // ────────────────────────────────────────────────
    // REJECT flow
    // ────────────────────────────────────────────────
    if (action === 'reject') {
      const { error } = await supabaseAdmin
        .from('platform_applications')
        .update({ status: 'rejected' })
        .eq('id', applicationId);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      // Send rejection email if Resend is configured
      if (resend && email) {
        try {
          await resend.emails.send({
            from: fromEmail,
            to: [email],
            subject: 'Your Kabutar Media Application Status Update',
            html: rejectionEmailHTML(name || 'Applicant')
          });
        } catch (emailErr) {
          console.error('Rejection email error (non-fatal):', emailErr);
        }
      }

      return NextResponse.json({
        success: true,
        action: 'rejected',
        emailSent: !!resend
      });
    }

    // ────────────────────────────────────────────────
    // APPROVE flow
    // ────────────────────────────────────────────────
    if (action === 'approve') {
      const { data: applicationRow, error: applicationRowError } = await supabaseAdmin
        .from('platform_applications')
        .select('id, type, full_name, email, phone, status')
        .eq('id', applicationId)
        .maybeSingle();

      if (applicationRowError) {
        return NextResponse.json({ error: applicationRowError.message }, { status: 500 });
      }

      if (!applicationRow) {
        return NextResponse.json({ error: 'Application not found.' }, { status: 404 });
      }

      const finalType = String(applicationRow.type || type || '').toLowerCase();
      const finalEmail = String(applicationRow.email || email || '').trim();
      const finalName = String(applicationRow.full_name || name || '').trim();
      const finalPhone = String(applicationRow.phone || body.phone || '').trim();
      const finalMessage = String(body.message || '').trim();

      if (!finalEmail || !finalName || !finalType) {
        return NextResponse.json({ error: 'Missing email, name, or type' }, { status: 400 });
      }

      const roleToSet = finalType === 'reporter' ? 'reporter' : 'buyer';
      const generatedPassword = generatePassword();

      // 1. Create auth user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: finalEmail,
        password: generatedPassword,
        email_confirm: true,
        user_metadata: {
          full_name: finalName,
          phone: finalPhone,
          city: String(body.city || '').trim(),
          bio: finalMessage,
          application_type: finalType,
        }
      });

      if (createError) {
        if (createError.message.includes('already been registered')) {
          // Existing auth user: still enforce role/profile based on approved application.
          const { data: existingAuthUsersData, error: existingAuthUsersError } = await supabaseAdmin.auth.admin.listUsers();
          if (existingAuthUsersError) {
            return NextResponse.json({ error: existingAuthUsersError.message }, { status: 500 });
          }

          const existingAuthUser = (existingAuthUsersData.users || []).find(
            (u) => (u.email || '').toLowerCase() === finalEmail.toLowerCase()
          );

          if (existingAuthUser) {
            const existingMetadata = existingAuthUser.user_metadata || {};
            await supabaseAdmin.auth.admin.updateUserById(existingAuthUser.id, {
              user_metadata: {
                ...existingMetadata,
                full_name: finalName,
                phone: finalPhone,
                city: String(body.city || existingMetadata.city || '').trim(),
                bio: finalMessage || String(existingMetadata.bio || ''),
                application_type: finalType,
              },
            });

            await supabaseAdmin
              .from('users')
              .upsert({ id: existingAuthUser.id, role: roleToSet, status: 'approved' }, { onConflict: 'id' });

            if (finalType === 'reporter') {
              const { error: profileError } = await supabaseAdmin
                .from('reporter_profiles')
                .upsert({
                  user_id: existingAuthUser.id,
                  full_name: finalName,
                  phone: finalPhone || 'Not provided',
                  city: body.city || 'Not provided',
                  id_proof_url: body.id_proof_url || '',
                  bank_name: body.bank_name || 'Not provided',
                  account_number: body.account_number || 'Not provided',
                  ifsc_code: body.ifsc_code || 'Not provided',
                  agreement_accepted: true
                }, { onConflict: 'user_id' });

              if (profileError) {
                console.error('Error upserting reporter profile for existing auth user:', profileError);
              }
            }
          }

          await supabaseAdmin
            .from('platform_applications')
            .update({ status: 'approved' })
            .eq('id', applicationId);

          return NextResponse.json({
            success: true,
            action: 'approved',
            alreadyExists: true,
            message: `Account with email "${finalEmail}" already exists. Application marked as approved.`
          });
        }
        if (createError.message === 'Database error creating new user') {
          return NextResponse.json({
            error: 'Auth signup trigger failed in Supabase. Update the public.handle_new_user() function from the latest schema.sql, then try approve again.'
          }, { status: 500 });
        }
        return NextResponse.json({ error: createError.message }, { status: 500 });
      }

      const userId = newUser.user.id;
      await new Promise(r => setTimeout(r, 500));

      // 1a. Create user record
      await supabaseAdmin
        .from('users')
        .upsert({ id: userId, role: roleToSet, status: 'approved' }, { onConflict: 'id' });

      // 1b. If reporter, create reporter_profiles entry
      if (finalType === 'reporter') {
        const { error: profileError } = await supabaseAdmin
          .from('reporter_profiles')
          .upsert({
            user_id: userId,
            full_name: finalName,
            phone: finalPhone || 'Not provided',
            city: body.city || 'Not provided',
            id_proof_url: body.id_proof_url || '',
            bank_name: body.bank_name || 'Not provided',
            account_number: body.account_number || 'Not provided',
            ifsc_code: body.ifsc_code || 'Not provided',
            agreement_accepted: true,
            generated_password: generatedPassword
          }, { onConflict: 'user_id' });

        if (profileError) {
          console.error('Error creating reporter profile:', profileError);
        }
      }

      // 2. Update application status
      await supabaseAdmin
        .from('platform_applications')
        .update({ status: 'approved' })
        .eq('id', applicationId);

      // 3. Send approval email with credentials
      let emailSent = false;
      if (resend && finalEmail) {
        try {
          await resend.emails.send({
            from: fromEmail,
            to: [finalEmail],
            subject: `✅ Profile Approved - Login Details & Next Steps`,
            html: approvalEmailHTML(finalName, finalEmail, generatedPassword, roleToSet)
          });
          emailSent = true;
        } catch (emailErr) {
          console.error('Approval email error (non-fatal):', emailErr);
        }
      }

      return NextResponse.json({
        success: true,
        action: 'approved',
        emailSent,
        credentials: {
          email: finalEmail,
          password: generatedPassword,
          loginLink: `${APP_BASE_URL}/login`
        }
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (err: any) {
    console.error('process-application error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
