/**
 * Starter menus (MENU_BUILDER_SPEC §2.1) — the highest-value, lowest-effort way
 * to beat the self-serve gate: a restaurant with 60 items typed on a phone
 * abandons halfway, so seed ~20 common dishes it can edit and delete instead of
 * typing from scratch. Keyed by restaurant_type; prices are IQD placeholders the
 * owner adjusts. Nothing is locked — every imported row is a normal editable item.
 *
 * Keys match RESTAURANT_TYPE_KEYS so a signed-up restaurant's type maps straight
 * to a template; the picker also lets an owner choose a different one.
 */
export type TemplateCategory = {
  name: string;
  items: { name: string; price: number }[];
};

export type MenuTemplate = { categories: TemplateCategory[] };

export const MENU_TEMPLATES: Record<string, MenuTemplate> = {
  nashami: {
    categories: [
      {
        name: "مشاوي",
        items: [
          { name: "كباب", price: 12000 },
          { name: "تكة دجاج", price: 10000 },
          { name: "تكة لحم", price: 13000 },
          { name: "فيليه دجاج", price: 11000 },
          { name: "برستد", price: 9000 },
          { name: "مسكوف", price: 25000 },
        ],
      },
      {
        name: "أطباق عراقية",
        items: [
          { name: "دولمة", price: 7000 },
          { name: "تشريب", price: 8000 },
          { name: "شاورما", price: 4000 },
          { name: "شوربة عدس", price: 3000 },
        ],
      },
      {
        name: "مقبلات",
        items: [
          { name: "سلطة", price: 2000 },
          { name: "طرشي", price: 1000 },
          { name: "حمص", price: 3000 },
          { name: "متبل", price: 3000 },
          { name: "خبز تنور", price: 500 },
        ],
      },
      {
        name: "مشروبات",
        items: [
          { name: "مشروب غازي", price: 1000 },
          { name: "لبن", price: 1000 },
          { name: "عصير", price: 2000 },
          { name: "شاي", price: 500 },
          { name: "ماء", price: 500 },
        ],
      },
    ],
  },

  iraqi: {
    categories: [
      {
        name: "أطباق رئيسية",
        items: [
          { name: "تشريب", price: 8000 },
          { name: "دولمة", price: 7000 },
          { name: "برياني", price: 9000 },
          { name: "قوزي", price: 15000 },
          { name: "بامية", price: 6000 },
          { name: "مرقة فاصوليا", price: 6000 },
        ],
      },
      {
        name: "مقبلات",
        items: [
          { name: "سلطة", price: 2000 },
          { name: "طرشي", price: 1000 },
          { name: "حمص", price: 3000 },
          { name: "متبل", price: 3000 },
        ],
      },
      {
        name: "حلويات",
        items: [
          { name: "زلابية", price: 2000 },
          { name: "برمة", price: 3000 },
        ],
      },
      {
        name: "مشروبات",
        items: [
          { name: "شاي", price: 500 },
          { name: "لبن", price: 1000 },
          { name: "عصير", price: 2000 },
          { name: "مشروب غازي", price: 1000 },
          { name: "ماء", price: 500 },
        ],
      },
    ],
  },

  fastfood: {
    categories: [
      {
        name: "برغر",
        items: [
          { name: "برغر لحم", price: 6000 },
          { name: "برغر دجاج", price: 5000 },
          { name: "برغر دبل", price: 9000 },
        ],
      },
      {
        name: "ساندويتشات",
        items: [
          { name: "شاورما دجاج", price: 3000 },
          { name: "شاورما لحم", price: 4000 },
          { name: "هوت دوغ", price: 3000 },
          { name: "فلافل", price: 2000 },
        ],
      },
      {
        name: "إضافات",
        items: [
          { name: "بطاطا", price: 2000 },
          { name: "بطاطا كبيرة", price: 3000 },
          { name: "أجنحة دجاج", price: 5000 },
        ],
      },
      {
        name: "مشروبات وحلويات",
        items: [
          { name: "مشروب غازي", price: 1000 },
          { name: "عصير", price: 2000 },
          { name: "آيس كريم", price: 2000 },
          { name: "ماء", price: 500 },
        ],
      },
    ],
  },

  drinks_sweets: {
    categories: [
      {
        name: "مشروبات ساخنة",
        items: [
          { name: "شاي", price: 500 },
          { name: "قهوة", price: 2000 },
          { name: "نسكافيه", price: 2000 },
          { name: "كابتشينو", price: 3000 },
        ],
      },
      {
        name: "مشروبات باردة",
        items: [
          { name: "عصير برتقال", price: 3000 },
          { name: "عصير مانجو", price: 3000 },
          { name: "ميلك شيك", price: 4000 },
          { name: "موهيتو", price: 3000 },
        ],
      },
      {
        name: "حلويات",
        items: [
          { name: "كيك", price: 3000 },
          { name: "كنافة", price: 5000 },
          { name: "بقلاوة", price: 4000 },
          { name: "آيس كريم", price: 2000 },
        ],
      },
    ],
  },
};

/** Templates offered in the picker, with their total item count. */
export function templateKeys(): string[] {
  return Object.keys(MENU_TEMPLATES);
}

export function templateItemCount(key: string): number {
  const template = MENU_TEMPLATES[key];
  if (!template) return 0;
  return template.categories.reduce((sum, category) => sum + category.items.length, 0);
}
