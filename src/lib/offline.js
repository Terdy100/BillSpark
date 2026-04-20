import Dexie from 'dexie';

export const db = new Dexie('BillSparkOfflineDB');

db.version(1).stores({
  sales: '++id, business_id, cashier_id, total, payment_type, amount_received, change_due, synced, created_at',
  sale_items: '++id, sale_id, product_id, qty, price',
  products_cache: 'id, business_id, name, sku, barcode, sell_price, cost_price, stock_qty, parent_id',
  open_baskets: '++id, name, items, updated_at'
});

export const saveSaleOffline = async (saleData, itemsData) => {
  return await db.transaction('rw', db.sales, db.sale_items, db.products_cache, async () => {
    // 1. Record the Sale
    const saleId = await db.sales.add({
      ...saleData,
      synced: 0,
      created_at: new Date().toISOString()
    });
    
    // 2. Record the Sale Items
    const itemsWithSaleId = itemsData.map(item => ({
      ...item,
      sale_id: saleId
    }));
    await db.sale_items.bulkAdd(itemsWithSaleId);

    // 3. Deduct Stock Levels
    for (const item of itemsData) {
      const product = await db.products_cache.get(item.product_id);
      if (product) {
        const newStock = (product.stock_qty || 0) - item.qty;
        await db.products_cache.update(item.product_id, { stock_qty: newStock });
      }
    }
    
    return saleId;
  });
};

export const getUnsyncedSales = async () => {
  return await db.sales.where('synced').equals(0).toArray();
};

export const markSaleSynced = async (id) => {
  return await db.sales.update(id, { synced: 1 });
};
