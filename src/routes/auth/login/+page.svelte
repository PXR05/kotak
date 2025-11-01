<script lang="ts">
  import { enhance } from "$app/forms";
  import * as Card from "$lib/components/ui/card";
  import { Input } from "$lib/components/ui/input";
  import { Button } from "$lib/components/ui/button";
  import { Label } from "$lib/components/ui/label";
  import type { ActionData } from "./$types";
  import type { SubmitFunction } from "@sveltejs/kit";
  import { goto } from "$app/navigation";
  import { toast } from "svelte-sonner";
  import { LoaderIcon } from "@lucide/svelte";
  import { page } from "$app/state";
  import { validateEmail, validateLoginPassword } from "$lib/validation";
  import AppIcon from "$lib/components/shared/AppIcon.svelte";

  let { form }: { form: ActionData } = $props();

  let loading = $state(false);
  let email = $state("");
  let password = $state("");
  let emailError = $state("");
  let passwordError = $state("");

  let submitted = $state(false);

  $effect(() => {
    const serverError = (form as any)?.errors?.email?.[0];
    emailError = serverError || (submitted ? validateEmail(email) : "");
  });

  $effect(() => {
    const serverError = (form as any)?.errors?.password?.[0];
    passwordError =
      serverError || (submitted ? validateLoginPassword(password) : "");
  });

  const canSubmit = $derived(!loading);

  function handleSubmit(input: {
    action: URL;
    formData: FormData;
    formElement: HTMLFormElement;
    controller: AbortController;
    submitter: HTMLElement | null;
    cancel: () => void;
  }): ReturnType<SubmitFunction> {
    submitted = true;

    const emailValidation = validateEmail(email);
    const passwordValidation = validateLoginPassword(password);

    if (emailValidation || passwordValidation) {
      input.cancel();
      return () => {};
    }

    loading = true;
    return async ({ result }) => {
      switch (result.type) {
        case "redirect":
          const target = page.url.searchParams.get("redirect");
          goto(target ?? result.location, {
            invalidateAll: true,
          });
          break;
        case "failure":
          loading = false;
          if (!result.data) {
            toast.error("An error occurred. Please try again.");
            console.error(result);
          } else {
            toast.error(
              result.data.message || "An error occurred. Please try again."
            );
          }
          break;
        default:
          loading = false;
      }
    };
  }
</script>

<div class="min-h-dvh flex items-center justify-center bg-background px-4">
  <Card.Root class="w-full max-w-md">
    <Card.Header class="items-center justify-between flex flex-row">
      <Card.Title class="text-2xl font-serif font-normal">Sign In</Card.Title>
      <AppIcon class="size-8" />
    </Card.Header>
    <Card.Content>
      <form method="post" use:enhance={handleSubmit} class="space-y-6">
        <div class="space-y-2">
          <Label for="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            placeholder="Enter your email"
            bind:value={email}
            aria-invalid={!!emailError}
          />
          {#if emailError}
            <p class="text-xs text-destructive">{emailError}</p>
          {/if}
        </div>
        <div class="space-y-2">
          <Label for="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            placeholder="Enter your password"
            bind:value={password}
            aria-invalid={!!passwordError}
          />
          {#if passwordError}
            <p class="text-xs text-destructive">{passwordError}</p>
          {/if}
        </div>
        {#if form?.message}
          <div class="text-sm text-destructive text-center">{form.message}</div>
        {/if}
        <Button type="submit" class="w-full" disabled={!canSubmit}>
          {#if loading}
            <LoaderIcon class="animate-spin size-4" />
          {/if}
          Sign In
        </Button>
      </form>
    </Card.Content>
    <Card.Footer class="text-center">
      <p class="text-sm text-muted-foreground">
        Don't have an account?
        <a
          href="/auth/register"
          class="text-foreground hover:text-muted-foreground underline"
        >
          Sign up
        </a>
      </p>
    </Card.Footer>
  </Card.Root>
</div>
