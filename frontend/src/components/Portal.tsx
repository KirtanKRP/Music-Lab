"use client";

import { type ReactNode } from "react";
import { createPortal } from "react-dom";

interface PortalProps {
  children: ReactNode;
}

/**
 * Renders children directly under document.body using React Portal.
 * This ensures modals, drawers, and fixed overlays always appear above
 * everything regardless of parent stacking context (overflow, z-index).
 */
export default function Portal({ children }: PortalProps) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}
