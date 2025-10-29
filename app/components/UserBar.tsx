import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";

export default async function UserBar() {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  return (
    <div className="flex items-center justify-between mb-4">
      <div className="text-sm opacity-80">
        {user?.email}
        {user?.role ? ` · ${user.role}` : ""}
      </div>
      <form action="/api/auth/signout" method="post">
        <input type="hidden" name="callbackUrl" value="/login" />
        <button className="text-sm underline">Sign out</button>
      </form>
    </div>
  );
}
