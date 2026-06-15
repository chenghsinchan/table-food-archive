import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";

export default function NotFound() {
  return (
    <div className="table-container">
      <EmptyState
        title="That memory is not here"
        description="It may have been moved, deleted, or not added yet."
        action={<Link href="/">Return home</Link>}
      />
    </div>
  );
}
