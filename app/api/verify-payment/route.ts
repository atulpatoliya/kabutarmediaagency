import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@/lib/supabaseServer';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, newsId } = body;

    const secret = process.env.RAZORPAY_KEY_SECRET || '';
    
    // Verify signature
    const shasum = crypto.createHmac('sha256', secret);
    shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const digest = shasum.digest('hex');

    if (digest !== razorpay_signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 1. Get news info
    const { data: news, error: newsError } = await supabase
      .from('news')
      .select('reporter_price, selling_price')
      .eq('id', newsId)
      .single();

    if (newsError || !news) return NextResponse.json({ error: 'News not found' }, { status: 404 });

    const platform_margin = Number(news.selling_price) - Number(news.reporter_price);

    const access_expiry_date = new Date();
    access_expiry_date.setDate(access_expiry_date.getDate() + 30); // 30 days access

    // 2. Insert transaction
    const { error: txError } = await supabase
      .from('transactions')
      .insert({
        news_id: newsId,
        buyer_id: user.id,
        reporter_amount: news.reporter_price,
        platform_margin: platform_margin,
        payment_status: 'paid',
        payout_status: 'pending',
        razorpay_order_id,
        razorpay_payment_id,
        access_expiry_date: access_expiry_date.toISOString(),
      });

    if (txError) throw txError;

    // 3. Mark news as sold
    const { error: updateError } = await supabase
      .from('news')
      .update({ status: 'sold' })
      .eq('id', newsId);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, message: 'Payment verified and access granted.' });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
