import { redirect } from "next/navigation";
import ChangePasswordForm from "@/components/ChangePasswordForm";
import { changePasswordAction } from "@/app/actions";
import { getUser } from "@/lib/session";

export default async function ChangePasswordPage() {
  const user = await getUser();
  if (!user) redirect("/login?signedout=1");
  return (
    <div className="auth-wrap">
      <div className="card">
        <h1>Change password</h1>
        <p className="muted">Signed in as {user.email}.</p>
        <ChangePasswordForm action={changePasswordAction} />
      </div>
    </div>
  );
}
