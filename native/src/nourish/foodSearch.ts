// Food search over Open Food Facts — a free, open food database (no key, no AI). Turns manual macro
// entry into search-and-tap. Returns per-100g values; the person adjusts for their portion. Pure REST.
export type FoodResult = { name: string; kcalPer100: number; proteinPer100: number };

const ENDPOINT = 'https://world.openfoodfacts.org/cgi/search.pl';

type OFFProduct = { product_name?: string; brands?: string; nutriments?: Record<string, number> };

export async function searchFoods(query: string): Promise<FoodResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const url =
    `${ENDPOINT}?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1` +
    `&page_size=15&fields=product_name,brands,nutriments`;
  try {
    const r = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'ToTry/1.0 (self-improvement app)' } });
    if (!r.ok) return [];
    const d = (await r.json()) as { products?: OFFProduct[] };
    return (d.products || [])
      .map((p): FoodResult => {
        const n = p.nutriments || {};
        const kcal = n['energy-kcal_100g'] ?? (n['energy_100g'] ? n['energy_100g'] / 4.184 : 0);
        const protein = n['proteins_100g'] ?? 0;
        const brand = p.brands ? ` (${p.brands.split(',')[0].trim()})` : '';
        const name = ((p.product_name || '').trim() + brand).trim();
        return { name, kcalPer100: Math.round(kcal || 0), proteinPer100: Math.round(protein || 0) };
      })
      .filter((f) => f.name.length > 1 && f.kcalPer100 > 0)
      .slice(0, 12);
  } catch {
    return [];
  }
}
