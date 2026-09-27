# DORIXONA BOSHQARUV TIZIMI — SaaS (Multi-tenant)

Ko‘p dorixonalar bir vaqtning o‘zida foydalanishi mumkin bo‘lgan zamonaviy, xavfsiz va to‘liq **o‘zbek tilida** ishlovchi **SaaS Dorixona Boshqaruv Tizimi**.

---

## 🚀 ASOSIY IMKONIYATLAR

1. **100% O‘zbek Tili:**
   - Barcha foydalanuvchi interfeysi, tugmalar, menyular, jadvallar, ogohlantirishlar va cheklar qat’iy o‘zbek tilida.

2. **Multi-tenant Arxitektura va Ma’lumotlar Izolyatsiyasi:**
   - Har bir dorixonaning dorilari, ombori, sotuvlari, mijozlari, ta'minotchilari va xodimlari alohida `pharmacyId` orqali qat’iy ajratilgan.
   - Dorixona A foydalanuvchisi Dorixona B ma'lumotlarini hech qachon ko‘ra olmaydi.

3. **7 Kunlik Bepul Sinov (Trial) va 30 Kunlik Oylik Obuna:**
   - Yangi dorixona qo‘shilganda avtomatik 7 kunlik trial beriladi.
   - Trial yoki obuna tugashiga 7 kun, 3 kun, 1 kun qolganda tizimda ogohlantirishlar beriladi.
   - Muddat tugagach dorixona avtomatik **Bloklangan** holatga o‘tadi (ma'lumotlar o‘chirilmaydi!).
   - Super Admin bitta tugma bilan (`[ OBUNANI FAOLLASHTIRISH ]`) dorixonani qayta ochishi mumkin.

4. **Shtrix-kod va QR-kod Integratsiyasi:**
   - **Telefon Kamerasi:** Brauzer orqali ruxsat so‘raladi, kamera orqali 1D va QR kodlar bir zumda o‘qiladi.
   - **Noutbuk USB Skaneri:** Klaviaturadagi tezkor ketma-ketlik va Enter tugmasi orqali to‘g‘ridan-to‘g‘ri dori topiladi va savatga tushadi.

5. **FEFO (First Expired, First Out) Partiyalar Hisobi:**
   - Bir xil dori bir nechta partiyada kelganda, yaroqlilik muddati eng yaqin partiya birinchi sotuvga chiqariladi.
   - Muddati o‘tgan partiyani sotish tizim tomonidan qat’iyan bloklanadi!

6. **Tezkor POS Terminal va Chop Etiladigan Chek (Thermal Receipt):**
   - Kassir uchun qulay, sensorli va klaviaturaga mos savdo oynasi.
   - Chegirma, to‘lov turlari (Naqd, Karta, Elektron to‘lov) va qaytim hisoblash.
   - Chekni brauzer orqali to‘g‘ridan-to‘g‘ri chop etish (`window.print()`).

7. **Tranzaksion Xavfsizlik:**
   - Sotuv, qoldiqni kamaytirish, partiyadan chiqarish, chek yaratish va audit log Prisma atomik tranzaksiyasi ichida bajariladi.

---

## 🛠 TEXNOLOGIYALAR

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Lucide React, HTML5-QRCode
- **Backend:** Next.js Route Handlers (Node.js REST API), Zod validation
- **Database & ORM:** PostgreSQL / SQLite (Prisma ORM)
- **Autentifikatsiya:** JWT (HttpOnly Secure Cookies), bcryptjs

---

## 🎨 DIZAYN TIZIMI

- **Asosiy Yashil:** `#16A34A`
- **To‘q Ko‘k (Navy):** `#0F172A`
- **Fon Rangi:** `#F8FAFC`
- **Oq:** `#FFFFFF`
- **Matn:** `#334155`

---

## 🔑 TEST VA BOSHLANG‘ICH HISOBLAR

Ma’lumotlar bazasiga seed orqali yuklangan sinov hisoblari:

| Rol | Login | Parol | Dorixona / Holat |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `superadmin` | `superpassword123` | Barcha platforma boshqaruvi |
| **Dorixona Mudiri** | `shifo_admin` | `admin123` | SHIFO NUR DORIXONA (Aktiv, 30 kun) |
| **Bosh Omborchi** | `shifo_omborchi` | `omborchi123` | SHIFO NUR DORIXONA (Kirim, partiyalar) |
| **Kassir (POS)** | `shifo_kassir` | `kassir123` | SHIFO NUR DORIXONA (Savdo terminali) |
| **Sinovdagi Admin** | `malham_admin` | `admin123` | MALHAM FARM DORIXONA (5 kun trial qolgan) |
| **Bloklangan Admin** | `hayot_admin` | `admin123` | YANGI HAYOT DORIXONA (Obunasi tugagan) |

---

## 📦 O‘RNATISH VA ISHGA TUSHIRISH

### 1. Bog‘liqliklarni o‘rnatish:
```bash
npm install
```

### 2. Environment sozlamalari:
`.env` faylini tekshiring:
```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="dorixona_saas_jwt_super_secret_key_2026_xyz"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```
*(PostgreSQL bilan ulash uchun `DATABASE_URL="postgresql://user:parol@localhost:5432/dorixona_db?schema=public"` ko‘rinishida o‘zgartirish yetarli)*

### 3. Ma’lumotlar bazasini yaratish va namunaviy ma'lumotlarni yuklash (Seed):
```bash
npx prisma db push
node scripts/seed.mjs
```

### 4. Development serverni ishga tushirish:
```bash
npm run dev
```
Dastur brauzerda ochiladi: **`http://localhost:3000`**

### 5. Production Build tekshiruvi:
```bash
npm run build
npm start
```
