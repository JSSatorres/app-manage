import { redirect } from "next/navigation";
import { WAITLIST_PATH } from "@/lib/constants";

export default function RegisterPage() {
  redirect(WAITLIST_PATH);
}
