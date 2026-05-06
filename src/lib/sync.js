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

        // Deduct stock in Supabase products table
        for (const item of itemsToSync) {
          // Fetch current stock from cloud to prevent race condition overrides if possible
          const { data: prodData } = await supabase.from('products').select('stock_qty').eq('id', item.product_id).single();
          if (prodData) {
            const newStock = Math.max(0, (prodData.stock_qty || 0) - item.qty);
            await supabase.from('products').update({ stock_qty: newStock }).eq('id', item.product_id);
          }
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

export const pullSalesAndCache = async (businessId) => {
  if (!navigator.onLine) return;

  try {
    // 1. Fetch all sales for this business
    const { data: cloudSales, error: salesError } = await supabase
      .from('sales')
      .select('*')
      .eq('business_id', businessId);

    if (salesError) throw salesError;
    if (!cloudSales || cloudSales.length === 0) return;

    // 2. Fetch all sale items for this business
    const { data: cloudItems, error: itemsError } = await supabase
      .from('sale_items')
      .select('*, sales!inner(business_id)')
      .eq('sales.business_id', businessId);
    
    // Note: If the inner join fails due to PostgREST config, we could fetch items using an in-clause:
    // .in('sale_id', cloudSales.map(s => s.id))
    let itemsToSync = cloudItems;
    if (itemsError || !cloudItems) {
      console.warn("Inner join fetch failed for sale_items, falling back to IN clause", itemsError);
      const saleIds = cloudSales.map(s => s.id);
      if (saleIds.length > 0) {
        // Chunk saleIds to prevent URI Too Long errors
        itemsToSync = [];
        const chunkSize = 200;
        for (let i = 0; i < saleIds.length; i += chunkSize) {
          const chunk = saleIds.slice(i, i + chunkSize);
          const { data: fallbackItems } = await supabase
            .from('sale_items')
            .select('*')
            .in('sale_id', chunk);
          if (fallbackItems) {
            itemsToSync.push(...fallbackItems);
          }
        }
      } else {
        itemsToSync = [];
      }
    } else {
      // Remove the joined sales object from items if it exists
      itemsToSync = cloudItems.map(item => {
        const { sales, ...rest } = item;
        return rest;
      });
    }

    // 3. Merge into local DB
    await db.transaction('rw', db.sales, db.sale_items, async () => {
      // Keep only unsynced sales and their items
      const unsyncedSales = await db.sales.where('synced').equals(0).toArray();
      const unsyncedSaleIds = new Set(unsyncedSales.map(s => s.id));
      
      const allLocalItems = await db.sale_items.toArray();
      const unsyncedItems = allLocalItems.filter(item => unsyncedSaleIds.has(item.sale_id));

      // Clear local tables
      await db.sales.clear();
      await db.sale_items.clear();

      // Put back unsynced local data
      if (unsyncedSales.length > 0) {
        await db.sales.bulkPut(unsyncedSales);
      }
      if (unsyncedItems.length > 0) {
        await db.sale_items.bulkPut(unsyncedItems);
      }
      
      // Put cloud data
      const cloudSalesToAdd = cloudSales.map(cs => ({ ...cs, synced: 1 }));
      if (cloudSalesToAdd.length > 0) {
        await db.sales.bulkPut(cloudSalesToAdd);
      }
      
      if (itemsToSync.length > 0) {
        await db.sale_items.bulkPut(itemsToSync);
      }
    });

    console.log('Successfully pulled sales from cloud');
  } catch (error) {
    console.error('Error pulling sales:', error);
  }
};
