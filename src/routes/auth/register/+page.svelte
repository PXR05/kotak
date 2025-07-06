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

  let { form }: { form: ActionData } = $props();

  let loading = $state(false);

  function handleSubmit(e: {
    action: URL;
    formData: FormData;
    formElement: HTMLFormElement;
    controller: AbortController;
    submitter: HTMLElement | null;
    cancel: () => void;
  }): ReturnType<SubmitFunction> {
    loading = true;
    return async ({ result }) => {
      switch (result.type) {
        case "redirect":
          goto(result.location, {
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
      <Card.Title class="text-2xl">Create Account</Card.Title>
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
          />
          <p class="text-xs text-muted-foreground">
            Password must be at least 6 characters long
          </p>
        </div>
        {#if form?.message}
          <div class="text-sm text-destructive text-center">{form.message}</div>
        {/if}
        <Button type="submit" class="w-full" disabled={loading}>
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
