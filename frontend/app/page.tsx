import { redirect } from "next/navigation";

export default function Home({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  if (searchParams.error) {
    redirect(`/dashboard/performance?error=${searchParams.error}`);
  }
  redirect("/dashboard/performance");
}