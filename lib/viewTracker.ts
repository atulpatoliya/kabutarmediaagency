import { createClient } from '@/lib/supabaseServer';

export async function trackNewsView(newsId: string, ipAddress: string) {
  const supabase = await createClient();
  
  // Call the Postgres function we created in schema.sql
  const { error } = await supabase.rpc('record_news_view', {
    p_news_id: newsId,
    p_ip_address: ipAddress
  });

  if (error) {
    console.error('Error tracking view:', error);
  }
}
