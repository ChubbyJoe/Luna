"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { useSidebar } from "@/components/ui/sidebar";

// Following a link closes the mobile drawer and puts focus on the new page.
// While the drawer is open its focus trap would undo a focus move, so the
// caller moves focus once the drawer has closed (onDrawerNavigate).
export function CloseDrawerOnNavigate({
  onDrawerNavigate,
}: {
  onDrawerNavigate: () => void;
}) {
  const pathname = usePathname();
  const { openMobile, setOpenMobile } = useSidebar();
  const previous = useRef(pathname);

  useEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;
    if (openMobile) {
      onDrawerNavigate();
      setOpenMobile(false);
    } else {
      focusMain();
    }
  }, [pathname, openMobile, setOpenMobile, onDrawerNavigate]);

  return null;
}

export function focusMain() {
  document.getElementById("main")?.focus();
}
