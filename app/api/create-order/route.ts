import { NextResponse } from 'next/server';
import { razorpay } from '@/lib/razorpay';
import { createClient } from '@/lib/supabaseServer';

export async function POST(req: Request) {
  try {
    const { newsId } = await req.json();
    if (!newsId) return NextResponse.json({ error: 'News ID required' }, { status: 400 });

    const supabase = await createClient();
    
    // Validate user is logged in
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Fetch news item to get prices
    const { data: news, error: newsError } = await supabase
      .from('news')
      .select('selling_price, status')
      .eq('id', newsId)
      .single();

    if (newsError || !news) return NextResponse.json({ error: 'News not found' }, { status: 404 });
    if (news.status !== 'published') return NextResponse.json({ error: 'News not available for purchase' }, { status: 400 });

    // Create Razorpay order
    const amount = Number(news.selling_price) * 100; // in paise
    const options = {
      amount,
      currency: 'INR',
      receipt: `receipt_news_${newsId}_buyer_${user.id}`,
    };

    const order = await razorpay.orders.create(options);

    return NextResponse.json({ order });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
