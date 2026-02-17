import { supabase } from './supabase';

export interface HouseConfig {
  address: string;
  totalApartments: number;
}

export async function fetchHouseConfig(): Promise<HouseConfig> {
  const { data, error } = await supabase
    .from('house_config')
    .select('*')
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return { address: '', totalApartments: 24 };
  }

  return {
    address: data.address,
    totalApartments: data.total_apartments,
  };
}

export async function updateHouseConfig(config: HouseConfig): Promise<boolean> {
  // Get existing row id first
  const { data: existing } = await supabase
    .from('house_config')
    .select('id')
    .limit(1)
    .maybeSingle();

  if (!existing) {
    // Insert if no row exists
    const { error } = await supabase.from('house_config').insert([{
      address: config.address,
      total_apartments: config.totalApartments,
      updated_at: new Date().toISOString(),
    }]);
    if (error) console.error('house_config insert error:', error);
    return !error;
  }

  // Update existing row
  const { error } = await supabase
    .from('house_config')
    .update({
      address: config.address,
      total_apartments: config.totalApartments,
      updated_at: new Date().toISOString(),
    })
    .eq('id', existing.id);
  return !error;
}
