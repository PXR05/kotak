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

  let { form }: { form: ActionData } = $props();

  let loading = $state(false);
  let password = $state("");
  let confirmPassword = $state("");

  const passwordsMatch = $derived(
    password.length >= 6 && password === confirmPassword
  );
  const canSubmit = $derived(passwordsMatch && !loading);

  function handleSubmit(): ReturnType<SubmitFunction> {
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

<div class="min-h-screen flex items-center justify-center bg-background px-4">
  <Card.Root class="w-full max-w-md">
    <Card.Header class="text-center">
      <Card.Title class="text-2xl font-serif font-normal"
        >Create Account</Card.Title
      >
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
          />
        </div>
        <div class="space-y-2">
          <Label for="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            placeholder="Create a password"
            bind:value={password}
          />
          <p class="text-xs text-muted-foreground">
            Password must be at least 6 characters long
          </p>
        </div>
        <div class="space-y-2">
          <Label for="confirm-password">Confirm Password</Label>
          <Input
            id="confirm-password"
            name="confirm-password"
            type="password"
            required
            placeholder="Confirm your password"
            bind:value={confirmPassword}
          />
          {#if confirmPassword.length > 0 && !passwordsMatch}
            <p class="text-xs text-destructive">Passwords do not match</p>
          {/if}
        </div>
        {#if form?.message}
          <div class="text-sm text-destructive text-center">{form.message}</div>
        {/if}
        <Button type="submit" class="w-full" disabled={!canSubmit}>
          {#if loading}
            <LoaderIcon class="animate-spin size-4" />
          {/if}
          Create Account
        </Button>
      </form>
    </Card.Content>
    <Card.Footer class="text-center">
      <p class="text-sm text-muted-foreground">
        Already have an account?
        <a
          href="/auth/login"
          class="text-foreground hover:text-muted-foreground underline"
        >
          Sign in
        </a>
      </p>
    </Card.Footer>
  </Card.Root>
</div>
