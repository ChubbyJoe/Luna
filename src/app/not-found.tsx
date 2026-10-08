import type { Metadata } from "next";

import { NotFoundMessage } from "@/features/shell/components/not-found-message";

export const metadata: Metadata = {
  title: "Not found · Luna",
};

export default function NotFound() {
  return (
    <main id="main" tabIndex={-1} className="flex-1 outline-none">
      <NotFoundMessage />
    </main>
  );
}
