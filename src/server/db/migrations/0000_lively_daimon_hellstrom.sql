CREATE TYPE "public"."fuel_type" AS ENUM('GASOLINE', 'DIESEL', 'LPG', 'HYBRID', 'EV');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('DUE_SOON', 'OVERDUE', 'SEASONAL', 'TEST');--> statement-breakpoint
CREATE TYPE "public"."odometer_source" AS ENUM('ONBOARDING', 'MANUAL', 'MAINTENANCE');--> statement-breakpoint
CREATE TYPE "public"."record_source" AS ENUM('ONBOARDING', 'MANUAL');--> statement-breakpoint
CREATE TYPE "public"."season" AS ENUM('SPRING', 'SUMMER', 'FALL', 'WINTER');--> statement-breakpoint
CREATE TABLE "accounts" (
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "calibration_dismissals" (
	"vehicle_id" text PRIMARY KEY NOT NULL,
	"dismissed_at_reading_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "demo_push_sends" (
	"endpoint_hash" text PRIMARY KEY NOT NULL,
	"last_sent_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maintenance_items" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"map_keyword" text,
	"shop_keyword" text,
	"sort_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maintenance_records" (
	"id" text PRIMARY KEY NOT NULL,
	"vehicle_id" text NOT NULL,
	"item_code" text NOT NULL,
	"date" date NOT NULL,
	"km" integer NOT NULL,
	"cost" integer,
	"memo" text,
	"odometer_reading_id" text,
	"source" "record_source" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maintenance_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"item_code" text NOT NULL,
	"fuel_type" "fuel_type" NOT NULL,
	"vehicle_model_id" text,
	"interval_km" integer,
	"interval_months" integer,
	CONSTRAINT "maintenance_rules_item_fuel_model_uq" UNIQUE NULLS NOT DISTINCT("item_code","fuel_type","vehicle_model_id")
);
--> statement-breakpoint
CREATE TABLE "notification_prefs" (
	"user_id" text PRIMARY KEY NOT NULL,
	"due_soon" boolean DEFAULT true NOT NULL,
	"overdue" boolean DEFAULT true NOT NULL,
	"seasonal" boolean DEFAULT true NOT NULL,
	"all_off" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"vehicle_id" text,
	"type" "notification_type" NOT NULL,
	"item_code" text,
	"dedupe_key" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone,
	CONSTRAINT "notifications_dedupe_key_unique" UNIQUE("dedupe_key")
);
--> statement-breakpoint
CREATE TABLE "odometer_readings" (
	"id" text PRIMARY KEY NOT NULL,
	"vehicle_id" text NOT NULL,
	"date" date NOT NULL,
	"km" integer NOT NULL,
	"source" "odometer_source" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_success_at" timestamp with time zone,
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "seasonal_checks" (
	"vehicle_id" text NOT NULL,
	"season_key" text NOT NULL,
	"seasonal_item_id" text NOT NULL,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "seasonal_checks_vehicle_id_season_key_seasonal_item_id_pk" PRIMARY KEY("vehicle_id","season_key","seasonal_item_id")
);
--> statement-breakpoint
CREATE TABLE "seasonal_items" (
	"id" text PRIMARY KEY NOT NULL,
	"season" "season" NOT NULL,
	"label" text NOT NULL,
	"excluded_fuel_types" "fuel_type"[] DEFAULT '{}' NOT NULL,
	"sort_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"email_verified" timestamp,
	"image" text,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vehicle_models" (
	"id" text PRIMARY KEY NOT NULL,
	"maker" text NOT NULL,
	"name" text NOT NULL,
	"generation" text,
	"year_from" integer NOT NULL,
	"year_to" integer,
	"fuel_types" "fuel_type"[] NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"vehicle_model_id" text,
	"custom_model_name" text,
	"model_year" integer NOT NULL,
	"fuel_type" "fuel_type" NOT NULL,
	"nickname" text,
	"daily_km" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calibration_dismissals" ADD CONSTRAINT "calibration_dismissals_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calibration_dismissals" ADD CONSTRAINT "calibration_dismissals_dismissed_at_reading_id_odometer_readings_id_fk" FOREIGN KEY ("dismissed_at_reading_id") REFERENCES "public"."odometer_readings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_item_code_maintenance_items_code_fk" FOREIGN KEY ("item_code") REFERENCES "public"."maintenance_items"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_odometer_reading_id_odometer_readings_id_fk" FOREIGN KEY ("odometer_reading_id") REFERENCES "public"."odometer_readings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_rules" ADD CONSTRAINT "maintenance_rules_item_code_maintenance_items_code_fk" FOREIGN KEY ("item_code") REFERENCES "public"."maintenance_items"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_rules" ADD CONSTRAINT "maintenance_rules_vehicle_model_id_vehicle_models_id_fk" FOREIGN KEY ("vehicle_model_id") REFERENCES "public"."vehicle_models"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_prefs" ADD CONSTRAINT "notification_prefs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "odometer_readings" ADD CONSTRAINT "odometer_readings_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seasonal_checks" ADD CONSTRAINT "seasonal_checks_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seasonal_checks" ADD CONSTRAINT "seasonal_checks_seasonal_item_id_seasonal_items_id_fk" FOREIGN KEY ("seasonal_item_id") REFERENCES "public"."seasonal_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_vehicle_model_id_vehicle_models_id_fk" FOREIGN KEY ("vehicle_model_id") REFERENCES "public"."vehicle_models"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "maintenance_records_vehicle_item_date_idx" ON "maintenance_records" USING btree ("vehicle_id","item_code","date");--> statement-breakpoint
CREATE INDEX "notifications_user_created_idx" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "odometer_readings_vehicle_date_idx" ON "odometer_readings" USING btree ("vehicle_id","date");--> statement-breakpoint
CREATE INDEX "push_subscriptions_user_idx" ON "push_subscriptions" USING btree ("user_id");