"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { households, persons } from "@/db/schema";
import { requireHousehold } from "@/lib/session";

const householdSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  annualExpenses: z.coerce.number().min(0).nullable(),
});

export async function updateHousehold(formData: FormData) {
  const { householdId } = await requireHousehold();
  const parsed = householdSchema.parse({
    name: formData.get("name"),
    annualExpenses: formData.get("annualExpenses") || null,
  });
  await db
    .update(households)
    .set({
      name: parsed.name,
      annualExpenses: parsed.annualExpenses === null ? null : String(parsed.annualExpenses),
    })
    .where(eq(households.id, householdId));
  revalidatePath("/household");
}

const personSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  birthYear: z.coerce.number().int().min(1900).max(2100),
});

export async function addPerson(formData: FormData) {
  const { householdId } = await requireHousehold();
  const parsed = personSchema.parse({
    name: formData.get("name"),
    birthYear: formData.get("birthYear"),
  });
  await db.insert(persons).values({ householdId, name: parsed.name, birthYear: parsed.birthYear });
  revalidatePath("/household");
}

export async function updatePerson(formData: FormData) {
  const { householdId } = await requireHousehold();
  const id = z.string().uuid().parse(formData.get("id"));
  const parsed = personSchema.parse({
    name: formData.get("name"),
    birthYear: formData.get("birthYear"),
  });
  // Scope by household so a member can't edit another household's person.
  await db
    .update(persons)
    .set({ name: parsed.name, birthYear: parsed.birthYear })
    .where(and(eq(persons.id, id), eq(persons.householdId, householdId)));
  revalidatePath("/household");
}

export async function deletePerson(formData: FormData) {
  const { householdId } = await requireHousehold();
  const id = z.string().uuid().parse(formData.get("id"));
  await db.delete(persons).where(and(eq(persons.id, id), eq(persons.householdId, householdId)));
  revalidatePath("/household");
}
