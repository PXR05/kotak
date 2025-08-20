ALTER TABLE "file" ADD COLUMN "encrypted_dek" text;--> statement-breakpoint
ALTER TABLE "file_share" ADD COLUMN "decrypted_dek" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "encrypted_umk" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "key_salt" text;