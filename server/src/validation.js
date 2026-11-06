import { z } from "zod";

export const credentialsSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(10).max(128),
});

const listingImageSchema = z.object({
  url: z.string().url().max(2048).refine((value) => value.startsWith("https://"), "Use a secure HTTPS photo URL."),
  view: z.enum(["front", "rear", "interior", "other"]),
});

export const listingSchema = z.object({
  title: z.string().trim().min(3).max(100),
  description: z.string().trim().max(4000).default(""),
  make: z.string().trim().min(1).max(60),
  model: z.string().trim().min(1).max(60),
  year: z.number().int().min(1980).max(new Date().getFullYear() + 1),
  location: z.string().trim().min(2).max(100),
  transmission: z.enum(["Automatic", "Manual"]),
  fuel: z.enum(["Petrol", "Diesel", "Hybrid", "Electric"]),
  body: z.string().trim().min(2).max(40),
  price: z.number().positive().max(100_000_000),
  type: z.enum(["sale", "rent"]),
  images: z.array(listingImageSchema).min(3).max(10),
  imageUrl: z.string().url().max(2048).refine((value) => value.startsWith("https://"), "Use a secure HTTPS photo URL.").optional(),
}).superRefine((listing, context) => {
  for (const view of ["front", "rear", "interior"]) {
    if (!listing.images.some((image) => image.view === view)) {
      context.addIssue({ code: "custom", path: ["images"], message: "Add front, rear, and interior photos." });
    }
  }
});

export const bookingSchema = z.object({
  listingId: z.string().uuid(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
});
