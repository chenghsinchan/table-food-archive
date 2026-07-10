import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "You're invited"
};

export default function JoinPage() {
  return (
    <div className="grid min-h-dvh place-items-center px-4 py-10">
      <section className="liquid-island w-full max-w-sm rounded-[28px] p-7 text-center">
        <p className="text-xs font-semibold uppercase text-accent">You&apos;re invited</p>
        <h1 className="table-wordmark mt-3 text-5xl text-ink">TABLE</h1>
        <p className="mt-4 text-base leading-7 text-muted">
          A friend invited you to TABLE — a private, shared food archive. Sign in with Google using the
          email address that received this invite.
        </p>
        <Link
          href="/login"
          className="tap-scale mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-ink px-6 text-sm font-semibold text-white"
        >
          Sign in with Google
        </Link>
        <p className="mt-4 text-xs leading-5 text-muted">
          Tip: on iPhone, you can add TABLE to your Home Screen afterwards to use it like an app.
        </p>
      </section>
    </div>
  );
}
