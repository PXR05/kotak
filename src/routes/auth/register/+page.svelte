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
  import {
    validateEmail,
    validatePassword,
    validateConfirmPassword,
  } from "$lib/validation";

  let { form }: { form: ActionData } = $props();

  let loading = $state(false);
  let email = $state("");
  let password = $state("");
  let confirmPassword = $state("");
  let emailError = $state("");
  let passwordError = $state("");
  let confirmPasswordError = $state("");

  let submitted = $state(false);

  $effect(() => {
    const serverError = (form as any)?.errors?.email?.[0];
    emailError = serverError || (submitted ? validateEmail(email) : "");
  });

  $effect(() => {
    const serverError = (form as any)?.errors?.password?.[0];
    passwordError =
      serverError || (submitted ? validatePassword(password) : "");
  });

  $effect(() => {
    const serverError = (form as any)?.errors?.confirmPassword?.[0];
    confirmPasswordError =
      serverError ||
      (submitted ? validateConfirmPassword(password, confirmPassword) : "");
  });

  const passwordsMatch = $derived(
    password.length >= 8 && password === confirmPassword
  );

  const passwordStrength = $derived(() => {
    if (!password) return 0;
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  });

  const strengthValue = $derived(passwordStrength());

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
    const passwordValidation = validatePassword(password);
    const confirmPasswordValidation = validateConfirmPassword(
      password,
      confirmPassword
    );

    if (emailValidation || passwordValidation || confirmPasswordValidation) {
      input.cancel();
      return ({ result }) => {};
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
            placeholder="Create a password"
            bind:value={password}
            aria-invalid={!!passwordError}
          />
          {#if passwordError}
            <p class="text-xs text-destructive">{passwordError}</p>
          {:else if password}
            <div class="text-xs">
              <div class="flex gap-1 mb-1">
                {#each Array(5) as _, i}
                  <div
                    class="h-1 w-full rounded-full bg-muted {i < strengthValue
                      ? strengthValue <= 2
                        ? '!bg-red-500 dark:!bg-red-400'
                        : strengthValue <= 3
                          ? '!bg-yellow-500 dark:!bg-yellow-400'
                          : '!bg-green-500 dark:!bg-green-400'
                      : ''}"
                  ></div>
                {/each}
              </div>
              <p class="text-muted-foreground">
                Password strength: {strengthValue <= 2
                  ? "Weak"
                  : strengthValue <= 3
                    ? "Medium"
                    : "Strong"}
              </p>
            </div>
          {:else}
            <p class="text-xs text-muted-foreground">
              Password must be at least 8 characters and contain uppercase,
              lowercase, and a number
            </p>
          {/if}
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
            aria-invalid={!!confirmPasswordError}
          />
          {#if confirmPasswordError}
            <p class="text-xs text-destructive">{confirmPasswordError}</p>
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
