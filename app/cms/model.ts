export type RecordItem = { id: string; [key: string]: string };
export type PageContent = { fields: Record<string, string>; lists: Record<string, RecordItem[]> };
export type Content = Record<string, PageContent>;
export type Snapshot = { content: Content; revision: number; updatedAt: string | null; publishedAt: string | null };

export const definitions = {
  home: { label: "الرئيسية", path: "/", fields: { kicker: "التعريف", title: "الاسم والعنوان", tagline: "العنوان الفرعي", copy: "الوصف", button: "نص زر الاستكشاف", image: "صورة الغلاف", circleLabel: "عنوان قسم الإبداعات", circleTitle: "عنوان الرؤية" }, lists: { pillars: { label: "أبعاد الإبداع", fields: { icon: "الرمز", eyebrow: "التصنيف", title: "العنوان", href: "رابط الصفحة" } } } },
  about: { label: "نبذة", path: "/about", fields: { kicker: "التعريف", title: "العنوان", tagline: "العنوان الفرعي", copy: "الوصف", image: "صورة الغلاف", journeyLabel: "عنوان المسيرة", journeyTitle: "عنوان القسم" }, lists: { stats: { label: "الإحصائيات", fields: { value: "القيمة", label: "الوصف" } }, journey: { label: "المسيرة", fields: { year: "الفترة", text: "الوصف" } } } },
  ventures: { label: "المشاريع", path: "/ventures", fields: { kicker: "التعريف", title: "العنوان", copy: "الوصف", note: "ملاحظة أسفل المشاريع" }, lists: { items: { label: "المشاريع", fields: { name: "الاسم", cat: "التصنيف", desc: "الوصف", image: "صورة المشروع", href: "رابط الموقع (اختياري)" } } } },
  writings: { label: "المقالات", path: "/writings", fields: { kicker: "التعريف", title: "العنوان", copy: "الوصف", image: "صورة الغلاف" }, lists: { items: { label: "المقالات", fields: { title: "العنوان", date: "التاريخ", cat: "التصنيف", body: "نص المقال" } } } },
  media: { label: "الإعلام", path: "/media", fields: { kicker: "التعريف", title: "العنوان", copy: "الوصف", image: "صورة الغلاف", featuredLabel: "عنوان الجهات الإعلامية" }, lists: { stats: { label: "الإحصائيات", fields: { value: "القيمة", label: "الوصف" } }, publications: { label: "الجهات الإعلامية", fields: { name: "الاسم" } } } },
  contact: { label: "التواصل", path: "/contact", fields: { kicker: "التعريف", title: "العنوان", copy: "الوصف", email: "البريد الإلكتروني", phone: "الهاتف", location: "الموقع", image: "صورة الغلاف" }, lists: {} },
  settings: { label: "إعدادات الموقع", path: "/", fields: { title: "اسم الموقع", description: "وصف محركات البحث", siteUrl: "رابط الموقع", shareImage: "صورة المشاركة", footer: "نص حقوق الملكية" }, lists: {} },
} as const;

const rows = (prefix: string, keys: string[], values: string[][]): RecordItem[] => values.map((values, index) => ({ id: `${prefix}-${index + 1}`, ...Object.fromEntries(keys.map((key, i) => [key, values[i] ?? ""])) }));

export const initialContent: Content = {
  home: { fields: { kicker: "Entrepreneur · Author · Creator", title: "MA’AMOUN\nAL OTAIBI", tagline: "Entrepreneur. Author. Creator.", copy: "Building businesses, systems, and original intellectual properties across real estate, technology, design, media and other ventures.", button: "Discover my world", image: "/reference/home-hero.jpg", circleLabel: "Maestro Creation Circle", circleTitle: "Four Dimensions. One Vision." }, lists: { pillars: rows("pillar", ["icon", "eyebrow", "title", "href"], [["Ⅰ", "Knowledge", "Principles of\nReal Estate", "/writings"], ["Ⅱ", "Philosophy", "The Unspoken\nGame Trilogy", "/about"], ["Ⅲ", "Power", "The Laws of\nReal Estate Power", "/writings"], ["Ⅳ", "Experience", "Deals — صفقات", "/ventures"]]) } },
  about: { fields: { kicker: "The story behind the work", title: "About\nMa’amoun.", tagline: "Operator. Observer. Thinker. Creator.", copy: "Three decades of building, operating, and investing across industries. A lifelong interest in people, systems, and the forces that shape decisions and outcomes.", image: "/images/about-hero-v2.png", journeyLabel: "My journey", journeyTitle: "Built over decades.\nGuided by curiosity." }, lists: { stats: rows("about-stat", ["value", "label"], [["30+", "Years experience"], ["20+", "Businesses built"], ["5", "Industries"], ["4", "Books & IPs"]]), journey: rows("journey", ["year", "text"], [["1990s", "Early exposure to business, real estate, and markets."], ["2000s", "Building and operating companies in real estate and construction."], ["2010s", "Expanding into technology, design, and new ventures."], ["2020s", "Creating intellectual properties and sharing insights with the industry."]]) } },
  ventures: { fields: { kicker: "Enterprise & investment", title: "Ventures", copy: "Businesses and investments across industries.", note: "More ventures and investments are in development." }, lists: { items: rows("venture", ["name", "cat", "desc", "image", "href"], [["CRA", "Real Estate", "Consolidated Realtors & Alliance"], ["UNIVES", "Design & Creative", "Creative & Communications Group"], ["ONEPASS", "Technology", "Technology Platforms & Solutions"], ["PROPTECH SOLUTIONS", "Technology", "Technology & Software"], ["DESIGN LAB", "Design & Creative", "Design & Development Studio"], ["CRA LIVING", "Real Estate", "Living & Experiential Development"]]) } },
  writings: { fields: { kicker: "Notes from the field", title: "Writings & Ideas", copy: "Thoughts on business, power,\nstrategy, and human behavior.", image: "/images/writings-hero-v2.png" }, lists: { items: rows("article", ["date", "title", "cat", "body"], [["May 28, 2024", "The Illusion of Control in Real Estate", "Real Estate"], ["May 12, 2024", "Power is Invisible, But Always Working", "Power & Negotiation"], ["Apr 28, 2024", "Why Most Deals Fail Before They Start", "Strategy"], ["Apr 14, 2024", "Leverage: The Quiet Multiplier", "Power & Negotiation"], ["Apr 1, 2024", "Long-Term Thinking in a Short-Term World", "Strategy"]]) } },
  media: { fields: { kicker: "Ideas in conversation", title: "Media &\nSpeaking", copy: "Interviews, appearances,\nand speaking engagements.", image: "/images/media-hero-v2.png", featuredLabel: "Featured in" }, lists: { stats: rows("media-stat", ["value", "label"], [["50+", "Interviews"], ["30+", "Podcasts"], ["20+", "Conferences"], ["10+", "Countries"]]), publications: rows("publication", ["name"], [["The Global Journal"], ["Business Perspectives"], ["Leadership Chronicles"], ["The Innovation Review"], ["Visionary Today"]]) } },
  contact: { fields: { kicker: "Contact", title: "Let’s Connect", copy: "For media, speaking, partnerships\nor other inquiries.", email: "hello@maamounalotaibi.com", phone: "+971 50 123 4567", location: "Dubai, United Arab Emirates", image: "/images/contact-hero-v2.png" }, lists: {} },
  settings: { fields: { title: "Ma’amoun Al Otaibi", description: "Entrepreneur, author, and creator building businesses and original intellectual properties across industries.", siteUrl: "https://maamoun-al-otaibi-prototype.mayaralmalla33.chatgpt.site", shareImage: "/og-share-v2.jpg", footer: "© 2026 Ma’amoun Al Otaibi. All rights reserved." }, lists: {} },
};

export function validLink(value: string, image = false): boolean {
  if (!value) return true;
  if (value.startsWith("/") && !value.startsWith("//") && !/[\\\s"<>]/.test(value)) return true;
  try { const url = new URL(value); return ["https:", ...(image ? [] : ["http:"])].includes(url.protocol) && !url.username && !url.password; } catch { return false; }
}

export function validateContent(value: unknown): asserts value is Content {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("محتوى غير صالح.");
  const content = value as Content;
  if (Object.keys(content).sort().join() !== Object.keys(definitions).sort().join()) throw new Error("صفحات المحتوى غير مكتملة.");
  for (const [page, definition] of Object.entries(definitions)) {
    const section = content[page];
    if (!section || !section.fields || !section.lists) throw new Error("بيانات الصفحة غير مكتملة.");
    if (Object.keys(section.fields).sort().join() !== Object.keys(definition.fields).sort().join() || Object.keys(section.lists).sort().join() !== Object.keys(definition.lists).sort().join()) throw new Error("حقول الصفحة غير صالحة.");
    const check = (key: string, text: unknown) => {
      if (typeof text !== "string" || text.length > (key === "body" ? 50000 : 5000)) throw new Error("نص غير صالح أو أطول من الحد المسموح.");
      if (["image", "shareImage", "href", "siteUrl"].includes(key) && !validLink(text, key.includes("mage"))) throw new Error("استخدم رابطاً صالحاً أو مسار صورة محلياً.");
      if (key === "siteUrl") { try { if (!/^https?:$/.test(new URL(text).protocol)) throw new Error(); } catch { throw new Error("رابط الموقع يجب أن يكون رابط HTTP أو HTTPS كاملاً."); } }
    };
    for (const key of Object.keys(definition.fields)) check(key, section.fields[key]);
    for (const [key, list] of Object.entries(definition.lists)) {
      const items = section.lists[key];
      if (!Array.isArray(items) || items.length > 100) throw new Error("الحد الأقصى 100 عنصر لكل قائمة.");
      const ids = new Set<string>();
      for (const item of items) {
        if (!item || typeof item.id !== "string" || !/^[\w-]{1,80}$/.test(item.id) || ids.has(item.id)) throw new Error("معرّف عنصر غير صالح أو مكرر.");
        ids.add(item.id);
        if (Object.keys(item).sort().join() !== ["id", ...Object.keys(list.fields)].sort().join()) throw new Error("حقول العنصر غير صالحة.");
        for (const field of Object.keys(list.fields)) check(field, item[field]);
      }
    }
  }
}

export const background = (url: string) => url ? { backgroundImage: `url(${JSON.stringify(url)})` } : undefined;
