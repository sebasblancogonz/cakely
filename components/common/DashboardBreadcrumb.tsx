import React from 'react';
import Link from 'next/link';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb';

export interface BreadcrumbTrailItem {
  label: string;
  href?: string;
}

interface DashboardBreadcrumbProps {
  trail: BreadcrumbTrailItem[];
}

function DashboardBreadcrumb({ trail }: DashboardBreadcrumbProps) {
  if (!trail || trail.length === 0) {
    return null;
  }

  return (
    <Breadcrumb className="hidden md:flex">
      <BreadcrumbList>
        {trail.map((item, index) => {
          const isLastItem = index === trail.length - 1;

          return (
            <React.Fragment key={item.href || item.label}>
              <BreadcrumbItem>
                {!isLastItem && item.href ? (
                  <BreadcrumbLink asChild>
                    <Link href={item.href}>{item.label}</Link>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{item.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
              {!isLastItem && <BreadcrumbSeparator />}
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export default DashboardBreadcrumb;
