# Supabase Pharmacy IT Management System

This directory contains the permanent, Supabase-based replacement for the pharmacy IT management application. It provides an approved-account workspace for helpdesk tickets, equipment assets, access-control requests, procurement controls, renewals, meeting minutes, scoped Google Drive documents, operational CSV exports, and system administration.

## Security model

The application uses Supabase Authentication and row-level security. The supplied migrations create the operational tables, role model, immutable access audit trail, server-generated asset codes, and three-way invoice-match rules. Google Drive actions run only on the server and are limited to one configured Drive folder.

> Do not commit credentials. Configure all values through the hosting platform's secret manager.

## Required environment values

Copy `.env.example` into your platform's secure environment-variable settings. Supabase browser credentials are safe to expose to the frontend; the service role and Google service-account values must stay server-only.

## Setup sequence

1. Install dependencies with `pnpm install`.
2. Apply the SQL files in `supabase/migrations/` to the target Supabase project in numeric order.
3. Configure Supabase Auth with Google enabled and add the deployed website domain to **Site URL** and **Redirect URLs**.
4. Configure the scoped Google Drive service account and folder ID as server-only values.
5. Run `pnpm check` and `pnpm test` before deployment.

The initial administrator login is created only through the controlled provisioning step. Change its temporary password immediately after the first access.

## Current validation status

The source passed TypeScript checking and 12 automated tests, including credential validation for the configured Supabase and scoped Google Drive integration. The administrator password account was verified through the Supabase authentication API. Google OAuth provider settings were enabled and its redirect configuration was corrected for the temporary preview; final browser verification must be repeated on the permanent deployment domain.
