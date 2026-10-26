# استقرار مستقل TalaCard Presentation روی Ubuntu

این نسخه Node.js را داخل Docker اجرا می‌کند؛ Nginx استاتیک جایگزین بک‌اند نیست. ورود، نقش‌ها، نشست‌ها، محتوا و رسانه‌ها در همین سرور نگهداری می‌شوند. در حالت `self-hosted` هیچ درخواست همگام‌سازی به ChatGPT Sites یا R2 اجرا نمی‌شود. فایل‌های `cloud/auth.js` و `cloud/local-auth.mjs` منطق مشترک ورود و آداپتور فایل محلی‌اند؛ برای این حالت هیچ Cloudflare Binding یا حساب خارجی لازم نیست.

## ساختار و حفاظت داده‌ها

Volume ثابت `talacard_presentation_selfhost_v1` به `/data` متصل است:

| مسیر داخل کانتینر | محتوا |
| --- | --- |
| `/data/content.json` | محتوای واقعی و قابل ویرایش ارائه‌ها |
| `/data/media/` | رسانه‌های اولیه و تمام آپلودهای جدید |
| `/data/private/accounts.json` | نام‌های کاربری، نقش و هش‌های salted؛ بدون رمز خام |
| `/data/private/auth-store/` | نشست‌های هش‌شده و محدودیت تلاش ورود |
| `/data/private/content.previous.json` | نسخهٔ پیش از آخرین ذخیره |
| `/data/.initialized` | جلوگیری از بازسازی ناخواستهٔ محتوای حذف‌شده |

مدیر با نقش `admin` و بیننده با نقش `viewer` کار می‌کنند. رکورد قدیمی با نقش `editor` بدون تغییر هش وارد می‌شود و در این سرور دسترسی `admin` می‌گیرد. نشست‌ها هشت‌ساعته‌اند؛ کوکی HttpOnly/Secure/SameSite=Strict است. Logout نشست سمت سرور را حذف می‌کند. تغییر آگاهانهٔ رکورد حساب، نشست‌های آن حساب را نامعتبر می‌کند.

دایرکتوری خصوصی 0700 و فایل حساب‌ها/نشست‌ها 0600 هستند. هیچ مسیر داده یا حسابی به‌صورت عمومی سرو نمی‌شود. تمام درخواست‌ها، از جمله محتوا و ویدیو، از بک‌اند عبور می‌کنند؛ Viewer نمی‌تواند با نشانی مستقیم `/edit.html`، `/index.html` یا API ذخیره به ادیتور برسد. از `file_server`، `root` یا مسیر موازی Nginx برای دور زدن بک‌اند استفاده نکنید.

در شروع اولیه فقط فایل‌های موجودنبودۀ رسانه از Image کپی می‌شوند. `content.json` موجود و حساب‌های موجود بازنویسی نمی‌شوند. اگر Volume قبلاً مقداردهی شده ولی محتوا گم شده باشد، سرور به‌جای جایگزینی با محتوای Git، متوقف می‌شود تا بکاپ بازیابی شود. اجرای تک‌نمونهٔ سرویس پشتیبانی می‌شود؛ این پیاده‌سازی برای چند Replica هم‌زمان طراحی نشده است.

## متغیرهای محیطی

یک فایل خارج از Git بسازید، مثلاً `/etc/talacard-presentation.env`:

```dotenv
TALACARD_PUBLIC_URL=https://presentation.talacard.com
TALACARD_BIND_PORT=4188
TALACARD_SESSION_SECONDS=28800
TALACARD_TRUSTED_PROXIES=127.0.0.1/32,::1/128,172.16.0.0/12
```

4188 برای بررسی نسخهٔ جدید است؛ فقط پس از تأیید، آن را به 4187 تغییر دهید. پورت همواره روی `127.0.0.1` میزبان منتشر می‌شود. Compose مقادیر ثابت `NODE_ENV=production`، `TALACARD_MODE=self-hosted`، `TALACARD_HOST=0.0.0.0`، `TALACARD_PORT=4187` و `TALACARD_DATA_DIR=/data` را داخل کانتینر تنظیم می‌کند.

برای رمزها هیچ متغیر محیطی لازم نیست. حساب‌ها در فایل خصوصی Volume وارد می‌شوند. گزینهٔ پیشرفتهٔ `TALACARD_ACCOUNTS_FILE` برای اجرای مستقیم Node وجود دارد؛ در صورت استفاده از فایل خارجی باید آن را نیز جداگانه و خصوصی پشتیبان بگیرید.

HTTPS از `TALACARD_PUBLIC_URL` گرفته می‌شود، نه از هدر قابل جعل `X-Forwarded-Proto`. Caddy باید Host اصلی را حفظ کند؛ تنظیم پیش‌فرض `reverse_proxy` این کار را می‌کند. IP کاربر فقط از آخرین بخش `X-Forwarded-For` و فقط برای اتصال رسیده از پراکسی‌های قابل اعتماد خوانده می‌شود. اگر شبکهٔ Docker شما خارج از CIDR بالا است، فقط CIDR واقعی همان شبکه را اضافه کنید؛ همهٔ اینترنت را Trusted نکنید.

## حفظ استقرار فعلی و دریافت کد

دستورات با دسترسی مناسب Docker و مسیرهای خصوصی اجرا شوند؛ مثال‌های `/root` برای Shell مدیریتی هستند.

```sh
cd /srv/talacard-presentation
git status --short
docker ps --filter publish=4187 --format 'table {{.ID}}\t{{.Names}}\t{{.Ports}}'
```

قبل از Pull، فایل Docker/Compose فعلی و محتوای فعلی را در یک مسیر خصوصی خارج از Git پشتیبان بگیرید. اگر تغییر محلی دارید، آن را حفظ و اختلاف را بررسی کنید؛ از `git reset --hard` یا `git clean` استفاده نکنید. اگر Dockerfile قبلی untracked باشد و Pull را متوقف کند، پس از بکاپ آن را خصوصی منتقل کنید؛ فایل قبلی را بی‌بررسی حذف نکنید.

```sh
git pull --ff-only origin main
docker compose --env-file /etc/talacard-presentation.env -f compose.selfhosted.yaml build
```

Compose جدید نام پروژهٔ جداگانه دارد و سرویس قدیمی، Caddy و `compare.talacard.com` را متوقف نمی‌کند. برای کوتاه‌کردن دستورات همین Shell:

```sh
dc() { docker compose --env-file /etc/talacard-presentation.env -f /srv/talacard-presentation/compose.selfhosted.yaml "$@"; }
```

## انتقال خصوصی همان حساب‌های قبلی

روش ترجیحی: فایل خصوصی اصلی `auth.json` با ساختار `{ "accounts": [...] }` را با SCP از دستگاه مالک به مسیری مانند `/root/talacard-accounts.json` منتقل کنید و مجوز آن را 0600 قرار دهید. فقط رکورد حساب‌ها لازم است؛ توکن انتشار و فایل تنظیمات Cloud را منتقل نکنید. فایل شامل username، role، salt، hash و iterations است. آن را داخل مخزن یا Image نگذارید.

```sh
chmod 600 /root/talacard-accounts.json
dc run --rm -T --no-deps presentation node scripts/accounts.mjs import-hashes --stdin < /root/talacard-accounts.json
```

این دستور نام‌ها، salt، hash و iterations قبلی را دقیق نگه می‌دارد؛ حساب جدید یا رمز جدید تولید نمی‌کند. اگر فایل حساب در Volume وجود داشته باشد، عملیات با خطا متوقف می‌شود و هیچ حسابی جایگزین نمی‌شود. هیچ گزینهٔ Force برای تعویض بی‌اجازه وجود ندارد.

اگر هش‌ها در دسترس نبودند، همان نام‌ها و رمزهای قبلی را فقط در یک فایل JSON خصوصی با ساختار زیر وارد کنید. مقادیر زیر placeholder هستند؛ نام یا رمز واقعی در سورس قرار ندارد:

```json
{"accounts":[
  {"username":"YOUR_EXISTING_ADMIN","role":"admin","password":"YOUR_EXISTING_PASSWORD"},
  {"username":"YOUR_EXISTING_VIEWER","role":"viewer","password":"YOUR_EXISTING_PASSWORD"}
]}
```

نام واقعی باید مطابق حساب قبلی، با حروف کوچک انگلیسی، عدد، `_` یا `-` باشد. فایل را با ویرایشگر خصوصی بسازید، نه با نوشتن رمز در آرگومان Shell. سپس:

```sh
chmod 600 /root/talacard-password-input.json
dc run --rm -T --no-deps presentation node scripts/accounts.mjs import-passwords --stdin < /root/talacard-password-input.json
```

این روش همان رمزها را با PBKDF2-SHA256 و 600000 iteration هش می‌کند؛ رمز خام ذخیره یا چاپ نمی‌شود. ورودی خام را پس از انتقال امن، طبق سیاست نگهداری خودتان مدیریت کنید. حساب‌های خارجی/قبلی تغییر نمی‌کنند. به‌علت تفاوت دامنه، کاربر باید یک بار با همان اطلاعات در دامنهٔ جدید وارد شود؛ Cookie دامنهٔ قبلی منتقل نمی‌شود.

## انتقال محتوای فعلی Nginx

ابتدا از خروجی دستور `docker ps`، شناسهٔ دقیق کانتینر ارائهٔ فعلی را انتخاب کنید؛ نام یا شناسهٔ سرویس دیگری را حدس نزنید:

```sh
LEGACY_CONTAINER='PASTE_ONLY_THE_PRESENTATION_CONTAINER_ID'
install -d -m 755 /root/talacard-legacy/public
docker cp "$LEGACY_CONTAINER:/usr/share/nginx/html/." /root/talacard-legacy/public/
```

اگر مسیر Document Root قدیمی متفاوت است، همان مسیر واقعی را به‌کار ببرید. این Copy سرویس فعلی را تغییر نمی‌دهد. تغییرات ذخیره‌شده فقط در LocalStorage مرورگر، داخل خروجی Nginx نیستند؛ در این حالت ابتدا از منوی پروژه JSON خروجی بگیرید و به‌صورت `content.json` کنار پوشهٔ `media` در همین ورودی خصوصی قرار دهید. رسانه‌های اضافه‌شده خارج از Git نیز باید منتقل شوند. این یک مرحلهٔ مهاجرت است؛ سرور جدید در زمان اجرا چیزی از Sites یا R2 دانلود نمی‌کند.

قبل از اولین اجرای بک‌اند، روی Volume تازه:

```sh
dc run --rm -T --no-deps -v /root/talacard-legacy/public:/import:ro presentation node scripts/data.mjs import --from /import --offline
```

اسکریپت `content.json` یا `default-content.json` و رسانه‌های ورودی را اعتبارسنجی می‌کند و برای رسانه‌های اولیهٔ جاافتاده از Image استفاده می‌کند. فایل‌های فعلی ورودی بر Seed اولویت دارند. در صورت وجود محتوا در Volume، Import متوقف می‌شود؛ اگر رسانهٔ موردنیاز کم باشد، خطا می‌دهد و محتوای ناقص را فعال نمی‌کند. برای بررسی مجدد، فایل‌های کمبود را اضافه کنید و بدون حذف حساب‌ها دوباره Import کنید.

اگر هیچ محتوای قدیمی قابل انتقالی وجود ندارد، فقط در Volume تازه می‌توان این مرحله را حذف کرد؛ در آن صورت محتوای موجود در Git، Seed شروع اولیه خواهد بود.

## بررسی نسخهٔ کاندید بدون دست‌زدن به سرویس فعلی

با `TALACARD_BIND_PORT=4188` در فایل محیط:

```sh
dc up -d --no-build presentation
dc ps
curl --fail http://127.0.0.1:4188/healthz
curl -i -H 'Host: presentation.talacard.com' http://127.0.0.1:4188/
```

Health باید 200 باشد؛ صفحهٔ بدون ورود باید 302 به `/login` بدهد. 503 در Health یعنی پیکربندی حساب‌ها کامل نیست؛ `/api/auth/login` نباید 404 باشد. برای دیدن Cookieهای Secure در مرورگر باید از HTTPS/Caddy استفاده شود؛ اتصال مستقیم HTTP به پورت staging، جایگزین HTTPS نهایی نیست.

تست کانتینری ایزوله، با Volume و پورت تصادفی و حساب‌های کاملاً آزمایشی:

```sh
npm test
npm run test:docker
```

تست دوم Image را Build می‌کند، ورود دو نقش، منع ویرایش Viewer، آپلود/Range، ذخیره/بازیابی، Restart، Rebuild و حفظ نشست/داده، Logout و انقضا را بررسی می‌کند. فقط منابع موقت خودش را پاک می‌کند؛ به Volume یا پورت سرویس واقعی دست نمی‌زند. برای اجرای آن Node.js نسخهٔ 22 یا بالاتر و Docker روی میزبان لازم است؛ Node داخل Image به‌تنهایی برای اجرای فرمان `npm` روی میزبان کافی نیست.

## جابه‌جایی نهایی؛ فقط پس از تست و تأیید مالک

تا این مرحله Caddy، DNS، SSL و کانتینر Nginx فعلی تغییر نکرده‌اند. پس از تأیید، فقط کانتینر مشخص‌شدهٔ ارائه را متوقف کنید. اگر از نام آن مطمئن نیستید ادامه ندهید. هیچ دستور Stop/Down برای Compare یا پروژهٔ عمومی سرور لازم نیست.

```sh
docker stop "$LEGACY_CONTAINER"
```

سپس در `/etc/talacard-presentation.env` مقدار `TALACARD_BIND_PORT` را از 4188 به 4187 تغییر دهید:

```sh
dc up -d --no-build presentation
curl --fail http://127.0.0.1:4187/healthz
```

Caddy موجود باید همچنان تمام مسیرهای همین دامنه را به `127.0.0.1:4187` بفرستد؛ بلوک فعلی را نگه دارید. شکل مرجع زیر فقط همان upstream را نشان می‌دهد، نه دستور جایگزینی فایل Caddy:

```caddyfile
presentation.talacard.com {
    reverse_proxy 127.0.0.1:4187
}
```

اگر Caddy داخل Docker و روی شبکهٔ مشترک است، اتصال فعلی آن را بررسی و فقط سرویس ارائه را به همان شبکهٔ خارجی متصل کنید؛ upstream داخل آن شبکه پورت 4187 بک‌اند است. `127.0.0.1` داخل کانتینر Caddy به خود Caddy اشاره می‌کند. پیکربندی `compare.talacard.com`، DNS و گواهی‌ها را تغییر ندهید.

برای Rollback، ابتدا سرویس **جدید** را متوقف کنید، پورت آن را دوباره 4188 قرار دهید و سپس همان کانتینر قدیمی را Start کنید. Volume جدید و تغییرات ذخیره‌شده در آن را حذف نکنید:

```sh
dc stop presentation
docker start "$LEGACY_CONTAINER"
```

## به‌روزرسانی‌های بعدی

```sh
cd /srv/talacard-presentation
git pull --ff-only origin main
dc build
dc up -d --no-deps presentation
```

Volume نام ثابت دارد و فایل Seed روی محتوای ذخیره‌شده نوشته نمی‌شود. در این فرایند کاربران و نشست‌ها نیز باقی می‌مانند؛ نشست منقضی‌شده به‌طور طبیعی نیاز به ورود دوباره دارد. از `docker compose down -v`، `docker volume rm` یا حذف `/data` برای به‌روزرسانی استفاده نکنید. `npm run export` فقط خروجی استاتیک می‌سازد و نباید به‌جای سرویس Node برای Production سرو شود.

## پشتیبان‌گیری و بازیابی

بکاپ شامل محتوا، تمام رسانه‌ها، حساب‌ها و نشست‌هاست. بکاپ هم محرمانه است. برای یک Snapshot سازگار، فقط همین سرویس را کوتاه‌مدت متوقف کنید؛ گزینهٔ `--offline` تأیید شماست که نوشتن هم‌زمان متوقف شده است. نام فولدر بکاپ باید تازه باشد:

```sh
install -d -m 700 -o 1000 -g 1000 /srv/backups/talacard-presentation
dc stop presentation
dc run --rm -T --no-deps -v /srv/backups/talacard-presentation:/backup presentation node scripts/data.mjs backup --output /backup/snapshot-YYYYMMDD-HHMM --offline
dc up -d --no-build presentation
```

Snapshot یک پوشه با `backup-manifest.json` و SHA-256 همهٔ فایل‌هاست. نسخهٔ خارج از سرور را در فضای رمزگذاری‌شدهٔ مورد اعتماد نگه دارید. برای انتقال فشرده می‌توانید پوشهٔ بکاپ خودتان را Archive کنید؛ ابزار Restore پوشهٔ معتبرشده را می‌گیرد، نه یک Archive ناشناس.

Restore فقط روی Volume **تازه و خالی** مجاز است. برای آزمایش، این override خصوصی را در `/root/talacard-restore.override.yaml` قرار دهید؛ نام مقصد باید تازه باشد:

```yaml
volumes:
  presentation_data:
    name: talacard_presentation_restore_YYYYMMDD
```

یک پروژه و پورت جدا برای بازیابی به کار ببرید تا سرویس فعال یا Volume آن جایگزین نشود:

```sh
restore_dc() { TALACARD_BIND_PORT=4189 docker compose --project-name talacard-presentation-restore --env-file /etc/talacard-presentation.env -f /srv/talacard-presentation/compose.selfhosted.yaml -f /root/talacard-restore.override.yaml "$@"; }
restore_dc run --rm -T --no-deps -v /srv/backups/talacard-presentation:/backup:ro presentation node scripts/data.mjs restore --from /backup/snapshot-YYYYMMDD-HHMM --offline
restore_dc up -d --no-build presentation
```

فهرست فایل‌ها، هش‌ها، حساب‌ها و ارجاع رسانه‌ها قبل از Restore بررسی می‌شوند. روی مقصد پر، بازیابی رد می‌شود و دادهٔ موجود حفظ می‌شود. بکاپ را در مسیر عمومی Caddy/Nginx یا در Git نگذارید.

## نتیجهٔ اعتبارسنجی در محیط توسعه

۵۴ تست Node پاس شده‌اند؛ تست‌های اختصاصی شامل ممانعت دسترسی ناشناس/Viewer، HTTPS/CSRF، ورود با همان هش/رمز، ذخیره و آپلود، Logout/انقضا، حفظ داده و نشست پس از بستن و ساخت مجدد سرور با پوشهٔ سورس متفاوت، مهاجرت و Backup/Restore هستند. نبود تماس خروجی Cloud نیز با مسدودکردن `fetch` سمت سرور تست شده است.

Docker Engine در محیط توسعهٔ فعلی موجود نبود؛ اجرای واقعی Build/Restart/Rebuild کانتینر و بررسی Caddy فعلی هنوز باید با `npm run test:docker` و مراحل staging روی Ubuntu انجام شود. هیچ استقرار فعلی یا تنظیم DNS/SSL در این مرحله تغییر نکرده است.

مراجع زیرساخت: [Docker volumes](https://docs.docker.com/compose/gettingstarted/)، [Caddy reverse_proxy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy).
