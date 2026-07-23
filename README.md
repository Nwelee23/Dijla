# دجلة — Dijla

منصة طلبات وتشغيل للمطاعم العراقية. اشتراك شهري ثابت، **بدون عمولة على الطلبات**.

A commission-free ordering & operations platform for Iraqi restaurants, built for Najaf first.

## السطوح الثلاثة

| السطح | المسار | الحالة |
|---|---|---|
| صفحة الهبوط التسويقية | `/` | مبني ✓ |
| الزبون — قائمة QR للطاولة | `/t/[qr_token]` | مبني ✓ |
| الزبون — رابط التوصيل | `/r/[slug]` | مبني ✓ |
| لوحة المطعم (طلبات · قائمة · طاولات · سائقون · تقارير · إعدادات) | `/dashboard` | مبني ✓ |
| تطبيق السائق | `/driver` | مبني ✓ |
| لوحة المشرف | `/admin` | مبني ✓ |

**الحالة:** المراحل 0–5 + مقاييس النموّ مبنيّة ومنشورة، وكل المواصفات المذكورة أدناه مطبَّقة. الهجرات مطبَّقة حتى `0025`. الخطوة التالية طيّار في مطعم نجفي حقيقي، لا مزيد من البناء.

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
| `npm test` | اختبارات الوحدة (Vitest) لمسارات المال |
| `npm run test:watch` | اختبارات الوحدة بوضع المراقبة |
| `npm run db:types` | توليد أنواع TypeScript من مخطط Supabase (يقرأ `SUPABASE_PROJECT_ID` من `.env.local`) |
| `npm run icons` | توليد أيقونات PWA من `scripts/generate-icons.mjs` |

الاختبارات: وحدات نقيّة في `tests/` (Vitest)، وسكربتات تكامل مقابل Supabase حقيقي في `coverage/` (متجاهَلة من git). فحص التكامل المستمر (CI) في `.github/workflows/ci.yml`: `tsc` · `eslint` · `test` · `build`.

## المواصفات والتوثيق

المواصفات تحلّ محلّ المهام المقابلة في ملفّات `PHASE_*_BUILD`:

- `AUTH_UI_SPEC.md` — المصادقة والتسجيل (يحلّ محلّ 1.1–1.2).
- `MENU_BUILDER_SPEC.md` — منشئ القائمة والطاولات/QR (يحلّ محلّ 1.5/1.6/2.2/2.3).
- `ORDERS_DASHBOARD_SPEC.md` — لوحة الطلبات الحيّة (يحلّ محلّ 2.6).
- `DRIVER_REPORTS_ADMIN_SPEC.md` — السائق/التقارير/المشرف (يحلّ محلّ 4.4/4.5/4.8 و5.1/5.2/5.4/5.5).
- `REMAINING_SCREENS_SPEC.md` — checkout التوصيل + الهبوط + الشاشات المساندة (يحلّ محلّ 3.2/3.3 ويغطّي 1.7/2.8/5.10).
- `AGENTS.md` — ذاكرة المشروع وقسم «Current status» المُحدَّث بعد كل مرحلة.

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
