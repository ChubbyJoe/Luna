"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

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
        <h1 className="text-title-sm md:text-title">Style guide</h1>
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
