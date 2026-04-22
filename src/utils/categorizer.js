/**
 * Smart Categorizer for BillSpark
 * Uses keyword matching and historical data to suggest categories.
 */

const CATEGORY_KEYWORDS = {
  'Drinks': [
    'water', 'cola', 'fanta', 'sprite', 'juice', 'malt', 'wine', 'beer', 'soda', 'beverage', 'drink', 'energy', 
    'pepsi', 'monster', 'redbull', 'sobeya', 'yoghurt', 'milkshake', 'vitamilk', 'verna', 'awake', 'voltic', 
    'alcohol', 'spirit', 'whisky', 'bel-aqua', 'tampico', 'don simon', 'star', 'club', 'guinness', 
    'kasapreko', 'alomo', 'adonko', 'sobolo', 'bissap', 'lamugin', 'origin', 'smirnoff', 'savanna', 'heineken',
    'coca-cola', 'mirinda', 'teem', '7up', 'schweppes', 'alvaro', 'proudly', 'rush', 'planet', 'gordons', 'hennessy'
  ],
  'Bakery': [
    'bread', 'cake', 'pastry', 'biscuit', 'cookie', 'doughnut', 'pie', 'muffin', 'loaf', 'bun', 'croissant', 
    'sugarbread', 'butterbread', 'tea bread', 'a1 bread', 'meat pie', 'spring roll', 'samosa', 'bofrot', 'donut'
  ],
  'Toiletries': [
    'soap', 'shampoo', 'paste', 'brush', 'tissue', 'detergent', 'pads', 'diaper', 'lotion', 'cream', 'deodorant', 
    'perfume', 'sanitizer', 'gel', 'pampers', 'detol', 'geisha', 'pepsodent', 'close-up', 'key soap', 
    'sunlight', 'bf soap', 'viva', 'madar', 'klin', 'ariel', 'always', 'kotex', 'pax', 'dettol', 'colgate',
    'oral-b', 'gillette', 'nivea', 'dove', 'rexona', 'lux', 'lifebuoy', 'protex'
  ],
  'Groceries': [
    'rice', 'oil', 'sugar', 'milk', 'flour', 'salt', 'bean', 'pasta', 'yam', 'garri', 'egg', 'butter', 
    'margarine', 'ketchup', 'mayo', 'spice', 'pepper', 'onion', 'tomato', 'sardine', 'indomie', 'noodle', 
    'minimie', 'obaapa', 'gino', 'padi', 'frytol', 'devon', 'tasty tom', 'maggi', 'onga', 'cerelac', 'milo', 
    'nido', 'bournvita', 'tom brown', 'shito', 'kenkey', 'banku', 'fufu', 'yam', 'plantain', 'canned',
    'blue band', 'royco', 'knorr', 'ajinomoto', 'lactogen', 'peak', 'ideal', 'carnation'
  ],
  'Electronics': [
    'phone', 'charger', 'cable', 'battery', 'bulb', 'plug', 'adapter', 'earphone', 'headset', 'usb', 
    'power', 'lamp', 'fan', 'iron', 'television', 'radio', 'remote', 'mouse', 'keyboard', 'samsung',
    'apple', 'iphone', 'tecno', 'infinix', 'itel', 'nokia', 'sony', 'lg', 'nasco', 'binatone'
  ],
  'Stationery': [
    'pen', 'book', 'paper', 'pencil', 'folder', 'tape', 'glue', 'marker', 'eraser', 'stapler', 'envelope', 
    'exercise', 'ruler', 'calculator'
  ],
  'Medicine': [
    'paracetamol', 'tablet', 'syrup', 'balm', 'plaster', 'capsule', 'vitamin', 'pain', 'cold', 
    'panadol', 'paracitamol', 'apc', 'ebalin', 'blood', 'tonic'
  ],
  'Confectionery': [
    'chocolate', 'candy', 'sweet', 'gum', 'lollipop', 'toffee', 'wafer', 'mentos', 'clorets', 'kingsbite'
  ],
  'Cleaning': [
    'mop', 'broom', 'bleach', 'cleaner', 'scrub', 'bucket', 'wipe', 'spray', 'insecticide', 'raid', 'parazone',
    'jik', 'domestos', 'harpic', 'morning fresh'
  ],
};

// Simple Levenshtein distance to handle typos
const getLevenshteinDistance = (a, b) => {
  const matrix = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
    }
  }
  return matrix[a.length][b.length];
};

const isCloseMatch = (str1, str2) => {
  if (str1 === str2) return true;
  const distance = getLevenshteinDistance(str1, str2);
  if (str1.length <= 4) return distance <= 1;
  return distance <= 2;
};

/**
 * Suggests a category based on the product name and existing products.
 * @param {string} name - Product name
 * @param {Array} existingProducts - List of existing product objects { name, category }
 * @returns {string} Suggested category
 */
export const suggestCategory = (name, existingProducts = []) => {
  if (!name || name.length < 2) return '';

  const lowerName = name.trim().toLowerCase();
  const words = lowerName.split(/[^a-zA-Z0-9]/).filter(w => w.length > 0);

  // 1. Check for precise or fuzzy brand/item matches
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => {
      const kwLower = kw.toLowerCase();
      // Check for direct presence or fuzzy match on any word
      return words.some(w => isCloseMatch(w, kwLower)) || 
             lowerName.startsWith(kwLower + ' ') || 
             lowerName.endsWith(' ' + kwLower) ||
             (kwLower.length > 4 && lowerName.includes(kwLower));
    })) {
      return category;
    }
  }

  // 2. Fallback: Suffix/Pattern Matching (Smart Grouping)
  const patternMatch = {
    'Drinks': ['water', 'juice', 'drink', 'wine', 'beer', 'ade', 'milk', 'cola'],
    'Bakery': ['bread', 'cake', 'pie', 'roll', 'biscuit'],
    'Groceries': ['oil', 'sauce', 'mix', 'flour', 'rice', 'bean', 'spice'],
    'Electronics': ['phone', 'cable', 'led', 'charger'],
    'Cleaning': ['cleaner', 'soap', 'bleach', 'spray'],
  };

  for (const [category, suffixes] of Object.entries(patternMatch)) {
    if (suffixes.some(s => lowerName.endsWith(s) || lowerName.includes(' ' + s))) {
      return category;
    }
  }

  // 3. Historical Match (The Learning Part)
  if (existingProducts.length > 0) {
    const significantWords = words.filter(w => w.length > 3);
    for (const w of significantWords) {
      const match = existingProducts.find(p => p.category && p.name.toLowerCase().includes(w));
      if (match) return match.category;
    }
  }

  // 4. Default Fallback (Only if we have a reasonably long name to be sure it's unknown)
  if (lowerName.length > 5 || words.length > 1) {
    return 'General';
  }
  
  return '';
};
