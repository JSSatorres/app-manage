import { redirect } from "next/navigation";
import { WAITLIST_PATH } from "@/lib/constants";

export default function RegisterPage() {
  return redirect(WAITLIST_PATH);
}
