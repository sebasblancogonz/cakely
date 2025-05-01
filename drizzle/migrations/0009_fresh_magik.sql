ALTER TABLE "customers" ALTER COLUMN "phone" DROP NOT NULL;
ALTER TABLE "orders" ADD COLUMN "google_calendar_event_id" text;