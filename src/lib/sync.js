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
      // Remove id (Dexie auto-inc) and synced status before cloud insert
      const { id: offlineId, synced, ...saleDataToSync } = sale;
      
      console.log('Syncing sale to cloud...', saleDataToSync);

      // 1. Insert Sale
      const { data: saleRes, error: saleErr } = await supabase
        .from('sales')
        .insert([saleDataToSync])
        .select()
        .single();
        
      if (saleErr) {
        console.error('CRITICAL: Sale sync failed. Check Supabase RLS and Table columns.', saleErr);
        continue;
      }
      
      const newSaleId = saleRes.id;
      
      // 2. Insert Sale Items
      const saleItems = await db.sale_items.where('sale_id').equals(offlineId).toArray();
      const itemsToSync = saleItems.map(item => ({
        sale_id: newSaleId,
        product_id: item.product_id,
        qty: item.qty,
        price: item.price,
        cost_price: item.cost_price || 0
      }));
      
      if (itemsToSync.length > 0) {
        const { error: itemsErr } = await supabase
          .from('sale_items')
          .insert(itemsToSync);
          
        if (itemsErr) {
          console.error('CRITICAL: Sale Items sync failed.', itemsErr);
          // If items fail, we don't mark as synced so we can try again
          continue; 
        }
      }
      
      // 3. Mark synced locally
      console.log('Sync successful for sale:', offlineId);
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
