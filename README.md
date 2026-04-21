# Dancepro

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.7.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

## Supabase setup (local only)

The file `src/environments/environment.local.ts` is ignored by Git and can safely contain your local Supabase credentials.

1. Open `src/environments/environment.local.ts`.
2. Set `supabaseUrl` to your Supabase project URL.
3. Keep `supabaseAnonKey` there (already set).

In development mode (`ng serve`), Angular uses this local file automatically via file replacement.

For code access, use the helper in `src/app/core/supabase.client.ts`:

```ts
import { getSupabaseClient } from './app/core/supabase/supabase.client';

const supabase = getSupabaseClient();
```

## Supabase roles and permissions (current state)

The current role model was validated with the RLS matrix script (`npm run test:rls`).

### Tested roles

- owner
- admin
- reception
- instructor
- accounting
- customer

### Effective permissions

- own_profile_read:
	- allow: owner, admin, reception, instructor, accounting, customer
- customer_insert:
	- allow: owner, admin, reception
	- deny: instructor, accounting, customer
- course_update:
	- allow: owner, admin, reception, instructor
	- deny: accounting, customer
- invoice_insert:
	- allow: owner, admin, accounting
	- deny: reception, instructor, customer

### Running the RLS matrix locally

In PowerShell:

```powershell
$env:TEST_USER_PASSWORD="dp2026!"
npm run test:rls
```

The script is located at `scripts/rls-matrix.mjs`.
