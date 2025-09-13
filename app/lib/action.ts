"use server";
import { z } from "zod";
import postgres from "postgres";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
const sql = postgres(process.env.POSTGRES_URL!, { ssl: "require" });
export type Invoice = {
  id: string;
  customer_id: string;
  amount: number;
  status: "pending" | "paid";
  date: string;
};

const FormSchema = z.object({
  id: z.string({
    invalid_type_error: "Please select a customer",
  }),
  customerId: z.string(),
  amount: z.coerce
    .number()
    .gt(0, { message: "please enter an amount greater than 80" }),
  status: z.enum(["pending", "paid"], {
    invalid_type_error: "Please select invoice status",
  }),
  date: z.string(),
});
const CreateInvoice = FormSchema.omit({ id: true, date: true });
export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message: string | null;
};
export async function createInvoice(prevState: State, formData: FormData) {
  const validatedFields = CreateInvoice.safeParse({
    customerId: formData.get("customerId"),
    amount: formData.get("amount"),

    status: formData.get("status"),
  });
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Missing Fields. Failed to createInvoice",
    };
  }
  const { amount, status, customerId } = validatedFields.data;
  const amountInCents = amount * 100;
  const date = new Date().toISOString().split("T")[0];
  try {
    await sql`INSERT INTO invoices(customer_id,amount,status,date) values(${customerId},${amountInCents},${status},${date})`;
  } catch (e) {
    console.error(e);
  }

  revalidatePath("/dashboard/invoices");
  redirect("/dashboard/invoices");
}
const UpdateInvoice = FormSchema.omit({ id: true, date: true });
export async function updateInvoice(id: string, formData: FormData) {
  const { customerId, amount, status } = UpdateInvoice.parse({
    customerId: formData.get("customerId"),
    amount: formData.get("amount"),
    status: formData.get("status"),
  });
  const amountInCents = amount * 100;
  try {
    await sql`Update invoices SET customer_id=${customerId},amount=${amountInCents},status=${status} WHERE id=${id}`;
  } catch (e) {
    console.error(e);
  }

  revalidatePath("/dashboard/invoices");
  redirect("/dashboard/invoices");
}
export async function deleteInvoice(id: string) {
  try {
    await sql`DELETE FROM invoices WHERE id=${id}`;
  } catch (e) {
    console.error(e);
  }

  revalidatePath("/dashboard/invoices");

  redirect("/dashboard/invoices");
}
