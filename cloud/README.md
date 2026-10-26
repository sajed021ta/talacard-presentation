# ذخیره و انتشار خودکار

ویرایشگر محلی پس از حدود ۹۰۰ میلی‌ثانیه مکث، تغییرات را در content.json ذخیره می‌کند. سرور محلی پس از ذخیره، انتشار را صف می‌کند؛ رسانه‌های جدید را ابتدا به ذخیره‌سازی پایدار سایت می‌فرستد و سپس نسخهٔ محتوا را به‌صورت شرطی جایگزین می‌کند. فایل‌ها با نام ثابت بازنویسی نمی‌شوند. در قطع اینترنت، نسخهٔ محلی محفوظ می‌ماند و ارسال مجدد انجام می‌شود. پنل وضعیت محلی و آنلاین را جدا نشان می‌دهد.

برای کارکرد خودکار، `node server.mjs` باید روی دستگاه در حال اجرا باشد. بستن تب نمایشگر مشکلی ایجاد نمی‌کند؛ خاموش‌شدن دستگاه یا سرور، ارسال را تا اجرای بعدی متوقف می‌کند. تب عمومی هر پنج ثانیه به‌روزرسانی محتوا را بررسی می‌کند و صفحهٔ فعلی را حفظ می‌کند.

کلید اختصاصی اتصال فقط در `.private/cloud.json` با دسترسی 0600 نگهداری می‌شود و کلید متناظر در متغیر محرمانهٔ Sites با نام `TALACARD_SYNC_TOKEN` قرار دارد. فایل‌های `.private/` در گیت یا خروجی عمومی قرار نمی‌گیرند. هیچ کلیدی در کد مرورگر نیست. وضعیت و حافظهٔ ارسال در `.private/sync-state.json` نگهداری می‌شود.

مخزن GitHub سورس و نسخهٔ پایهٔ محتوا را نگه می‌دارد؛ ذخیرهٔ خودکار یک commit گیت‌هاب برای هر ویرایش ایجاد نمی‌کند. محتوای زندهٔ لینک عمومی مستقل از انتشار کد، در R2 نگهداری می‌شود. تغییر کد همچنان به انتشار نسخهٔ برنامه نیاز دارد.

در چک‌اوت میزبانی، `.openai/hosting.json` همان project_id و مخاطب عمومی را حفظ می‌کند و `r2` برابر `BUCKET` است. `scripts/build.mjs` نمایشگر، فونت‌ها و تصاویر پایه را در Worker خودبسنده قرار می‌دهد؛ ویدیوها از R2 خوانده می‌شوند. سورس زیر `worker/` و `site-assets/` است و `dist/` خروجی تولیدی است.

انتشار محتوا از conditional write استفاده می‌کند؛ تغییر نسخهٔ آنلاین از دستگاه دیگر، ارسال را با وضعیت تداخل متوقف می‌کند تا تغییرات قبلی بازنویسی نشوند. قرارداد R2: [Cloudflare Workers API](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/).

## Presentation login

The live viewer and editor require server-side sessions. `viewer` can view the presentation; `admin` uses the same editor at `/edit.html` and can save/upload directly to R2. Protected assets and content use private/no-store responses. Device synchronization retains its existing bearer authentication.

Run `node scripts/setup-access.mjs` once to generate local account records and a private login handoff file. Existing accounts are never overwritten. Configure `TALACARD_AUTH_ACCOUNTS` as a secret runtime variable using the `accounts` array from `.private/auth.json`; never copy private files into source assets. The hosted Worker fails closed when account configuration or R2 is missing. Local login activates when that private configuration exists.

Sessions last eight hours and are stored under `auth/sessions/` with hashed random tokens. Logout removes the server record. Updating an account's salted password hash invalidates its existing sessions. Login throttling uses conditional R2 writes per account/client address. Passwords are derived with PBKDF2-SHA256 (100,000 iterations); generated passwords contain 144 random bits.
