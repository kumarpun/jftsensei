"use client";

import { deleteCustomer } from "@/app/actions";

export default function DeleteCustomerButton({ id }) {
  return (
    <form
      action={deleteCustomer}
      onSubmit={(e) => {
        if (!confirm("Delete this customer and all their results?")) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button className="sm danger">Delete</button>
    </form>
  );
}
