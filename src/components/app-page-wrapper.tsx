import { cn } from '@/lib/utils'
import { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { SidebarTrigger } from './ui/sidebar'
import { Separator } from './ui/separator'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface TopNavProps {
  breadcrumbs: BreadcrumbItem[]
  children?: ReactNode
}

export function TopNav({ breadcrumbs, children }: TopNavProps) {
  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between gap-2 bg-sidebar px-4 py-4 border-b border-border">
      <div className="flex items-center gap-2 h-full">
        <div className="pointer-events-auto">
          <SidebarTrigger />
        </div>
        <Separator orientation="vertical" className="h-full" />
        <Breadcrumb className="ml-2">
          <BreadcrumbList>
            {breadcrumbs.map((item, index) => {
              const isLast = index === breadcrumbs.length - 1

              return (
                <div key={index} className="contents">
                  <BreadcrumbItem>
                    {isLast ? (
                      <BreadcrumbPage>{item.label}</BreadcrumbPage>
                    ) : item.href ? (
                      <BreadcrumbLink asChild>
                        <Link to={item.href}>{item.label}</Link>
                      </BreadcrumbLink>
                    ) : (
                      <span className="text-muted-foreground">
                        {item.label}
                      </span>
                    )}
                  </BreadcrumbItem>
                  {!isLast && <BreadcrumbSeparator />}
                </div>
              )
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className="flex items-center gap-2">
        {children && <div className="flex items-center gap-2">{children}</div>}
      </div>
    </header>
  )
}

interface AppPageWrapperProps {
  children: ReactNode
}

export function AppPageWrapper({ children }: AppPageWrapperProps) {
  return (
    <div className="flex h-screen flex-col overflow-hidden">{children}</div>
  )
}

interface AppPageContentWrapperProps {
  children: ReactNode
  className?: string
  fullWidth?: boolean
}

export function AppPageContentWrapper({
  children,
  className = '',
  fullWidth = false,
}: AppPageContentWrapperProps) {
  return (
    <div
      className={cn(
        'flex-1 scrollbar scrollbar-thumb-interactive overflow-x-hidden overflow-y-auto p-4 bg-card',
        className,
      )}
    >
      <div className={cn(!fullWidth && 'mx-auto max-w-7xl')}>{children}</div>
    </div>
  )
}
