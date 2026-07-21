# دجلة — Dijla

منصة طلبات وتشغيل للمطاعم العراقية. اشتراك شهري ثابت، **بدون عمولة على الطلبات**.

A commission-free ordering & operations platform for Iraqi restaurants, built for Najaf first.

## السطوح الثلاثة

| السطح | المسار | الحالة |
|---|---|---|
| الزبون — قائمة QR للطاولة | `/t/[qr_token]` | المرحلة 2 |
| الزبون — رابط التوصيل | `/r/[slug]` | المرحلة 3 |
| لوحة المطعم | `/dashboard` | المرحلة 1 |
| تطبيق السائق | `/driver` | المرحلة 4 |

## التقنيات

Next.js (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui · Supabase (Postgres + Auth + Realtime + Storage) · PWA

عربي أولاً، RTL بالكامل، ومصمّم للهاتف قبل الحاسبة.

## التشغيل محلياً

```bash
npm install
cp .env.example .env.local   # ثم املأ القيم من لوحة Supabase
npm run dev
```

### الأوامر

| الأمر | الوظيفة |
|---|---|
| `npm run dev` | خادم التطوير |
| `npm run build` | بناء الإنتاج |
| `npm run lint` | فحص ESLint |
| `npm run db:types` | توليد أنواع TypeScript من مخطط Supabase |
| `npm run icons` | توليد أيقونات PWA من `scripts/generate-icons.mjs` |

## قاعدة البيانات

الهجرات في `supabase/migrations/`، تُطبّق بالترتيب عبر SQL Editor في لوحة Supabase:

- `0001_init.sql` — المخطط + الفهارس + مُشغّل `updated_at`
- `0002_rls.sql` — سياسات Row-Level Security

**العزل متعدد المستأجرين مفروض عبر RLS.** كل جدول محمي، ولا يصل أي مستخدم لبيانات مطعم غيره. اقرأ التعليقات داخل `0002_rls.sql` قبل تعديل أي سياسة.

## المتغيرات البيئية

انظر [.env.example](.env.example). مفتاح `SUPABASE_SERVICE_ROLE_KEY` **للخادم فقط** — يتجاوز RLS ولا يُرسل للمتصفح أبداً (محمي بـ `import "server-only"`).

## التوثيق

- [AGENTS.md](AGENTS.md) — ذاكرة المشروع والاصطلاحات
- [DIJLA_PROJECT_PLAN.md](DIJLA_PROJECT_PLAN.md) — الخطة الكاملة
- [PHASE_0_1_BUILD.md](PHASE_0_1_BUILD.md) — خطوات المرحلتين 0 و 1
