CREATE TYPE "public"."etrade_env" AS ENUM('sandbox', 'production');--> statement-breakpoint
CREATE TABLE "etrade_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"env" "etrade_env" DEFAULT 'sandbox' NOT NULL,
	"access_token_enc" text NOT NULL,
	"access_token_secret_enc" text NOT NULL,
	"connected_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "etrade_connections_household_id_unique" UNIQUE("household_id")
);
--> statement-breakpoint
CREATE TABLE "positions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"batch_id" uuid NOT NULL,
	"as_of" timestamp with time zone NOT NULL,
	"symbol" text NOT NULL,
	"description" text,
	"quantity" numeric(18, 6) NOT NULL,
	"market_value" numeric(14, 2) NOT NULL,
	"cost_basis" numeric(14, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "etrade_connections" ADD CONSTRAINT "etrade_connections_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "positions" ADD CONSTRAINT "positions_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;