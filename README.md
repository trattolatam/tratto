# Tratto — Reseñas verificadas para LATAM

Plataforma de reseñas verificadas con comprobante para servicios del hogar, belleza y profesionales independientes en América Latina.

## Estructura

```
tratto/
├── backend/     ← API Fastify + TypeScript + Prisma
└── frontend/    ← Next.js 14 + Tailwind CSS
```

## Stack

- **Backend:** Fastify, TypeScript, Prisma, PostgreSQL (Supabase)
- **Frontend:** Next.js 14, React, Tailwind CSS, Zustand
- **Pagos:** Stripe + MercadoPago
- **IA:** Claude API (Anthropic)
- **Storage:** Supabase Storage
- **Hosting:** Render (backend) + Netlify (frontend)

## Primeros pasos

### Backend

```bash
cd backend
cp .env.example .env
# completar .env con tus credenciales de Supabase, Stripe, etc.
npm install
npx prisma migrate dev --name init
npm run seed
npm run dev
```

API disponible en `http://localhost:3000`

### Frontend

```bash
cd frontend
cp .env.example .env.local
# completar con NEXT_PUBLIC_API_URL=http://localhost:3000
npm install
npm run dev
```

Frontend disponible en `http://localhost:3000` (o el puerto que indique Next.js)

## Documentación adicional

Dentro de `backend/` hay varios documentos de referencia:

- `GO_TO_MARKET.md` — plan de lanzamiento y guión de contacto con empresas
- `VALIDATION_GUIDE.md` — guía para validar precio con usuarios reales
- `MODERATION_POLICY.md` — criterios internos de moderación de reseñas
- `COST_CONTROLS.md` — checklist de límites de gasto antes de producción
- `SCHEMA_ADDITIONS.md` — notas sobre el schema de Prisma

## Credenciales de prueba (después de correr el seed)

- Admin: `admin@tratto.lat` / `admin123456`
- Usuario de ejemplo: `reviewer1@example.com` / `reviewer123`
