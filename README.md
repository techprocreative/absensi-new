# FaceAttend

FaceAttend adalah sistem absensi berbasis face recognition dengan portal web terintegrasi (Admin, HRD, Employee, Salesman). Repository ini sudah melewati seluruh fase hardening (keamanan, logging, dokumentasi, dan deployment) sehingga siap digunakan di lingkungan produksi maupun Render.

## 🚀 Quick Start (Development)
```bash
npm install           # install dependencies
npm run dev           # jalankan API + frontend pada http://localhost:5000
npx tsc --noEmit      # pastikan tidak ada error TypeScript
```
- API Docs: http://localhost:5000/api-docs
- Health Check: http://localhost:5000/health

### 🔑 Kredensial Development (ubah sebelum produksi)
| Role      | Username | Password |
|-----------|----------|----------|
| Admin     | admin    | admin    |
| HRD       | hrd      | hrd      |
| Employee  | emp      | emp      |
| Salesman  | salesman | salesman |

## 📚 Dokumentasi Terstruktur
Semua dokumen dirapikan di folder [`docs/`](./docs):

| File | Isi Singkat |
|------|-------------|
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | Analisis fungsional & arsitektur penuh (database, modul, alur attendance/face recognition). |
| [`docs/FEATURES.md`](./docs/FEATURES.md) | Rincian fitur dashboard (admin/HRD/employee/salesman) beserta UX highlights. |
| [`docs/SECURITY.md`](./docs/SECURITY.md) | Semua hardening: JWT, hashing, rate limiting, headers, role-based akses. |
| [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) | Panduan production (PM2, Docker, Nginx/SSL, backup). |
| [`docs/PROJECT_STATUS.md`](./docs/PROJECT_STATUS.md) | Ringkasan fase, metrik kualitas, dan checklist keberhasilan. |

Catatan khusus Render tersimpan di [`render.yaml`](./render.yaml); file ini akan digunakan oleh Blueprint Render untuk menyusun web service + database secara otomatis.

## 🧱 Lingkungan & Variables Penting
Salin `.env.example` → `.env` lalu perbarui:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/faceattend
JWT_SECRET=<ganti dgn 32+ karakter acak>
SESSION_SECRET=<ganti dgn 32+ karakter acak>
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development
```
Tambahan untuk Render (set di dashboard): `AUTH_RATE_LIMIT_MAX_REQUESTS`, `RATE_LIMIT_MAX_REQUESTS`, `DISABLE_RATE_LIMIT`, dll.

## 📦 Deployment Singkat (Render)
1. Pastikan `render.yaml` berada di root repo dan sudah di-commit.
2. Push repo ke Git remote → buat Blueprint baru di Render (Import from Git).
3. Render otomatis membuat Postgres (faceattend-db) + web service (faceattend-app).
4. Isi environment variable sensitif (JWT_SECRET, SESSION_SECRET, dll) melalui dashboard Render.
5. Deploy → Render menjalankan `npm install && npm run build` lalu `npm run start`.

Untuk server kustom/on-prem, ikuti panduan detail di [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md).

## 🛡️ Status Keamanan
- Password hashing (bcrypt + auto-migration) ✅
- JWT auth + role-based middleware ✅
- Helmet, CORS whitelist, dan rate limiting ✅
- Structured logging + request ID ✅
- Swagger dan health checks ✅

Detail lengkap + opsi override rate limiting ada di [`docs/SECURITY.md`](./docs/SECURITY.md).

## 📜 Skrip Penting
```bash
npm run dev      # mode pengembangan (API + Vite dev server)
npm run build    # build frontend + bundle server
npm start        # menjalankan server produksi dari folder dist/
npm run check    # compile TypeScript (tsc --noEmit)
npm run db:push  # sinkronisasi schema ke database (Drizzle)
```

## 🤝 Kontribusi / Bantuan
- Periksa log di console atau `dist/` untuk build issues.
- Gunakan Swagger untuk mencoba endpoint sebelum frontend dihubungkan.
- Laporkan isu keamanan/bug dengan menyertakan langkah reproduksi + log.

Selamat menggunakan FaceAttend! 🎉
