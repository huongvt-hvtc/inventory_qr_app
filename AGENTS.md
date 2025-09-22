# AGENTS.md

## Build/Test/Lint Commands
- `pnpm run dev` - Start development server
- `pnpm run build` - Build production app
- `pnpm run start` - Start production server
- `pnpm run lint` - Run ESLint
- No automated tests configured - use `/test-db` page for manual database testing

## Architecture & Database
- Next.js 14.2 app router with TypeScript
- Supabase backend (PostgreSQL) with tables: `users`, `assets`, `inventory_records`, `activity_logs`
- PWA-enabled with next-pwa
- Key libraries: Radix UI, Tailwind CSS, html5-qrcode, react-hot-toast

## Code Style Guidelines
- Use `@/` path alias for src imports
- 'use client' directive for client components
- TypeScript strict mode enabled
- ESLint warnings for unused vars, explicit any, unescaped entities
- camelCase for variables/functions, PascalCase for components
- Tailwind classes with cn() utility for conditional styling
- Error handling with try/catch and toast notifications
- Use Supabase client from `@/lib/supabase`
