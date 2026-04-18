import { supabase } from './supabase';
import { getUnsyncedSales, markSaleSynced, db } from './offline';

export const syncData = async () => {
  // Check if online
  if (!navigator.onLine) return { success: false, message: 'Offline' };

  try {
    const unsyncedSales = await getUnsyncedSales();
    
    if (unsyncedSales.length === 0) {
      return { success: true, message: 'Already synced' };
    }

    for (const sale of unsyncedSales) {
      const { id: offlineId, ...saleDataToSync } = sale;
      
      // 1. Insert Sale
      const { data: saleRes, error: saleErr } = await supabase
        .from('sales')
        .insert([saleDataToSync])
        .select()
        .single();
        
      if (saleErr) {
        console.error('Error syncing sale:', saleErr);
        continue;
      }
      
      const newSaleId = saleRes.id;
      
      // 2. Insert Sale Items
      const saleItems = await db.sale_items.where('sale_id').equals(offlineId).toArray();
      const itemsToSync = saleItems.map(item => {
        const { id, sale_id, ...itemData } = item;
        return { ...itemData, sale_id: newSaleId };
      });
      
      if (itemsToSync.length > 0) {
        const { error: itemsErr } = await supabase
          .from('sale_items')
          .insert(itemsToSync);
          
        if (itemsErr) {
          console.error('Error syncing sale items:', itemsErr);
          // Potential rollback logic here, keeping simple for MVP
          continue; 
        }
      }
      
      // 3. Mark synced locally
      await markSaleSynced(offlineId);
    }
    
    return { success: true, message: `Synced ${unsyncedSales.length} sales` };
  } catch (error) {
    console.error('Sync error:', error);
    return { success: false, message: error.message };
  }
};

// Also basic function to pull products and cache them
export const pullProductsAndCache = async (businessId) => {
  if (!navigator.onLine) return;
  
  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .eq('business_id', businessId);
    
  if (error) {
    console.error('Error fetching products:', error);
    return;
  }
  
  if (products && products.length > 0) {
    await db.transaction('rw', db.products_cache, async () => {
      await db.products_cache.clear(); // simplistic clear and load
      await db.products_cache.bulkAdd(products);
    });
  }
};
