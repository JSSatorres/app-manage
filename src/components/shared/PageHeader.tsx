"use client"

interface PageHeaderProps {
  title: string
  description?: string
  action?: React.ReactNode
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="mb-[30px] flex items-start justify-between gap-4 border-b-2 border-foreground pb-5">
      <div className="flex-1 min-w-0">
        <h1 className="font-heading text-[30px] font-semibold leading-[.96] tracking-[-0.04em] text-foreground">
          {title}
        </h1>
        {description && (
          <p className="mt-[8px] text-[14px] font-medium text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
