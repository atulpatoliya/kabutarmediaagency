import { createClient } from '@/lib/supabaseServer';

export async function checkBuyerAccess(newsId: string, userId: string): Promise<boolean> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('transactions')
    .select('access_expiry_date')
    .eq('news_id', newsId)
    .eq('buyer_id', userId)
    .single();

  if (error || !data) return false;

  const expiryDate = new Date(data.access_expiry_date);
  const now = new Date();

  return now <= expiryDate;
}
