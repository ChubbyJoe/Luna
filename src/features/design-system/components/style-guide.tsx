"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import {
  FeedbackDemos,
  OverlayDemos,
  StateDemos,
  ThemeSwitch,
} from "./style-guide-demos";

// Literal class names so Tailwind generates every swatch.
const COLOR_TOKENS = [
  { name: "background", className: "bg-background", use: "Page surface" },
  { name: "foreground", className: "bg-foreground", use: "Body text" },
  { name: "popover", className: "bg-popover", use: "Menus, dialogs, toasts" },
  { name: "primary", className: "bg-primary", use: "Primary button fill" },
  {
    name: "primary-foreground",
    className: "bg-primary-foreground",
    use: "Text on primary",
  },
  { name: "muted", className: "bg-muted", use: "Hover and subtle fills" },
  {
    name: "muted-foreground",
    className: "bg-muted-foreground",
    use: "Secondary text",
  },
  { name: "border", className: "bg-border", use: "Decorative dividers" },
  { name: "input", className: "bg-input", use: "Field borders" },
  { name: "ring", className: "bg-ring", use: "Keyboard focus" },
  { name: "link", className: "bg-link", use: "Link text" },
  { name: "selection", className: "bg-selection", use: "Text selection" },
  { name: "destructive", className: "bg-destructive", use: "Destructive" },
  { name: "sidebar", className: "bg-sidebar", use: "Sidebar surface" },
  {
    name: "sidebar-foreground",
    className: "bg-sidebar-foreground",
    use: "Sidebar text",
  },
  {
    name: "sidebar-accent",
    className: "bg-sidebar-accent",
    use: "Sidebar row hover",
  },
] as const;

const TYPE_STEPS = [
  { name: "text-title", className: "text-title-sm md:text-title" },
  { name: "text-h1", className: "text-h1" },
  { name: "text-h2", className: "text-h2" },
  { name: "text-h3", className: "text-h3" },
  { name: "text-body", className: "text-body" },
  { name: "text-sm", className: "text-sm" },
  { name: "text-xs", className: "text-xs" },
] as const;

// Chrome uses 1 to 3, page layout 4 to 16 (Tailwind's 4px scale).
const SPACING_STEPS = [
  { name: "1", px: 4, className: "w-1" },
  { name: "1.5", px: 6, className: "w-1.5" },
  { name: "2", px: 8, className: "w-2" },
  { name: "3", px: 12, className: "w-3" },
  { name: "4", px: 16, className: "w-4" },
  { name: "6", px: 24, className: "w-6" },
  { name: "8", px: 32, className: "w-8" },
  { name: "12", px: 48, className: "w-12" },
  { name: "16", px: 64, className: "w-16" },
] as const;

const RADIUS_STEPS = [
  { name: "rounded-sm", use: "Small controls", className: "rounded-sm" },
  { name: "rounded-md", use: "Buttons, inputs", className: "rounded-md" },
  { name: "rounded-lg", use: "Menus, cards", className: "rounded-lg" },
  { name: "rounded-xl", use: "Dialogs", className: "rounded-xl" },
] as const;

const BUTTON_VARIANTS = [
  "default",
  "outline",
  "secondary",
  "ghost",
  "destructive",
  "link",
] as const;

export function StyleGuide() {
  return (
    <div className="flex flex-col gap-16">
      <header className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-title-sm md:text-title">Style guide</h1>
          <ThemeSwitch />
        </div>
        <p className="text-body text-muted-foreground">
          Every token and base component in Luna, in the current theme. The
          written rules live in{" "}
          <code className="font-mono">docs/design.md</code>.
        </p>
      </header>

      <Section title="Color">
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {COLOR_TOKENS.map((token) => (
            <li key={token.name} className="flex flex-col gap-2">
              <div
                className={cn("h-12 rounded-lg border", token.className)}
                aria-hidden="true"
              />
              <div className="flex flex-col">
                <span className="font-mono text-xs">--{token.name}</span>
                <span className="text-xs text-muted-foreground">
                  {token.use}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Type">
        <ul className="flex flex-col gap-4">
          {TYPE_STEPS.map((step) => (
            <li key={step.name} className="flex flex-col gap-1">
              <span className="font-mono text-xs text-muted-foreground">
                {step.name}
              </span>
              <span className={step.className}>
                A calm place for your pages
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Spacing">
        <ul className="flex flex-col gap-2">
          {SPACING_STEPS.map((step) => (
            <li key={step.name} className="flex items-center gap-4">
              <span className="w-24 font-mono text-xs text-muted-foreground">
                {step.name} · {step.px}px
              </span>
              <span
                className={cn("h-4 rounded-sm bg-ring", step.className)}
                aria-hidden="true"
              />
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Radius">
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {RADIUS_STEPS.map((step) => (
            <li key={step.name} className="flex flex-col gap-2">
              <div
                className={cn("h-16 border bg-muted", step.className)}
                aria-hidden="true"
              />
              <span className="font-mono text-xs">{step.name}</span>
              <span className="text-xs text-muted-foreground">{step.use}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Links">
        <p className="text-body">
          Body text with{" "}
          <a
            href="#main"
            className="rounded-sm text-link underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring"
          >
            an inline link
          </a>
          , the only place color appears besides the focus ring.
        </p>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-col gap-4">
          <Row label="Variants">
            {BUTTON_VARIANTS.map((variant) => (
              <Button key={variant} variant={variant}>
                {variant[0].toUpperCase() + variant.slice(1)}
              </Button>
            ))}
          </Row>
          <Row label="Sizes">
            <Button size="xs">Extra small</Button>
            <Button size="sm">Small</Button>
            <Button>Default</Button>
            <Button size="lg">Large</Button>
          </Row>
          <Row label="Disabled">
            <Button disabled>Default</Button>
            <Button variant="outline" disabled>
              Outline
            </Button>
          </Row>
        </div>
      </Section>

      <Section title="Fields">
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="sg-default">Default</Label>
            <Input id="sg-default" placeholder="you@example.com" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="sg-disabled">Disabled</Label>
            <Input id="sg-disabled" placeholder="Not editable" disabled />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="sg-invalid">Invalid</Label>
            <Input
              id="sg-invalid"
              defaultValue="not an email"
              aria-invalid
              aria-describedby="sg-invalid-error"
            />
            <p
              id="sg-invalid-error"
              className="text-sm text-destructive"
              role="alert"
            >
              Enter a valid email.
            </p>
          </div>
        </div>
      </Section>

      <Section title="Menus and overlays">
        <OverlayDemos />
      </Section>

      <Section title="Feedback">
        <FeedbackDemos />
      </Section>

      <Section title="States">
        <StateDemos />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-h2">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}
