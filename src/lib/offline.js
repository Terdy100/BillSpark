import Dexie from 'dexie';

export const db = new Dexie('BillSparkOfflineDB');

db.version(1).stores({
  sales: '++id, business_id, cashier_id, total, payment_type, amount_received, change_due, synced, created_at',
  sale_items: '++id, sale_id, product_id, qty, price',
  products_cache: 'id, business_id, name, sku, barcode, sell_price, cost_price, stock_qty, parent_id',
  open_baskets: '++id, name, items, updated_at'
});

export const saveSaleOffline = async (saleData, itemsData) => {
  return await db.transaction('rw', db.sales, db.sale_items, async () => {
    const saleId = await db.sales.add({
      ...saleData,
      synced: 0,
      created_at: new Date().toISOString()
    });
    
    const itemsWithSaleId = itemsData.map(item => ({
      ...item,
      sale_id: saleId
    }));
    
    await db.sale_items.bulkAdd(itemsWithSaleId);
    return saleId;
  });
};

export const getUnsyncedSales = async () => {
  return await db.sales.where('synced').equals(0).toArray();
};

export const markSaleSynced = async (id) => {
  return await db.sales.update(id, { synced: 1 });
};
