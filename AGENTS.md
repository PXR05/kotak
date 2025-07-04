# LocalDrive Agent Instructions

## Commands
- **dev**: `npm run dev` - Start development server
- **build**: `npm run build` - Build for production
- **preview**: `npm run preview` - Preview production build
- **check**: `npm run check` - Type check TypeScript/Svelte files
- **check:watch**: `npm run check:watch` - Type check in watch mode
- **db:push**: `npm run db:push` - Push database schema changes
- **db:migrate**: `npm run db:migrate` - Run database migrations
- **db:studio**: `npm run db:studio` - Open Drizzle Studio

## Tech Stack & Framework Rules
- **Svelte 5** with runes (`$state`, `$derived`, `$effect`, `$props`) - NO Svelte 4 syntax
- **SvelteKit** for routing/SSR - use filesystem routing (`+page.svelte`, `+layout.svelte`)
- **TypeScript** strict mode - all new files must use TypeScript with proper typing
- **TailwindCSS** for styling with tailwind-variants for component variants
- **Drizzle ORM** with LibSQL for database operations
- **shadcn-svelte** components with bits-ui primitives

## Code Style & Conventions
- Use **tabs** for indentation (not spaces)
- **Double quotes** for strings in TypeScript/JavaScript
- Import order: external packages → `$lib` imports → relative imports with `.js` extensions
- Use `$lib/` alias for shared code (`$lib/components/ui/`, `$lib/types/`)
- File naming: `PascalCase.svelte` for components, `kebab-case.ts` for utilities
- Props: `let { prop1, prop2 } = $props()` syntax for component props
- Events: `onclick={handler}` not `on:click={handler}` in Svelte 5
- Always import TypeScript interfaces/types from `$lib/types/file.ts`

## Architecture Patterns
- **Database**: Drizzle schema in `src/lib/server/db/schema.ts`
- **Forms**: sveltekit-superforms with formsnap for form handling
- **File management**: JSZip for archives, file operations via server endpoints
- **Error handling**: Use `error()` and `fail()` from `@sveltejs/kit`
- **State management**: Use Svelte 5 runes, shared state via `$lib/dialog-state.ts`