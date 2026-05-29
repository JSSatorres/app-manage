"use client"

interface PageHeaderProps {
  title: string
  description?: string
  action?: React.ReactNode
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-[30px]">
      <div className="flex-1 min-w-0">
        <h1 className="text-[27px] font-semibold tracking-[-0.03em] leading-[1.1] text-foreground">
          {title}
        </h1>
        {description && (
          <p className="mt-[7px] text-[14px] font-medium text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
