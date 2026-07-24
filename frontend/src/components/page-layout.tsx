import * as React from "react"

import { cn } from "@/lib/utils"

function Page({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="page"
      className={cn("app-page", className)}
      {...props}
    />
  )
}

function PageHeader({ className, ...props }: React.ComponentProps<"header">) {
  return (
    <header
      data-slot="page-header"
      className={cn("app-page-header", className)}
      {...props}
    />
  )
}

function PageHeading({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="page-heading"
      className={cn("min-w-0", className)}
      {...props}
    />
  )
}

function PageTitle({ className, ...props }: React.ComponentProps<"h1">) {
  return (
    <h1
      data-slot="page-title"
      className={cn("app-page-title", className)}
      {...props}
    />
  )
}

function PageDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="page-description"
      className={cn("app-page-description", className)}
      {...props}
    />
  )
}

function PageActions({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="page-actions"
      className={cn("flex shrink-0 flex-wrap items-center gap-2", className)}
      {...props}
    />
  )
}

function PageToolbar({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="page-toolbar"
      className={cn("app-toolbar", className)}
      {...props}
    />
  )
}

function PageSurface({ className, ...props }: React.ComponentProps<"section">) {
  return (
    <section
      data-slot="page-surface"
      className={cn("app-surface", className)}
      {...props}
    />
  )
}

export {
  Page,
  PageActions,
  PageDescription,
  PageHeader,
  PageHeading,
  PageSurface,
  PageTitle,
  PageToolbar,
}
