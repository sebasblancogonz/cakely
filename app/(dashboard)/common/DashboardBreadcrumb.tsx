'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb';

import { DashboardBreadcrumbProps } from '@types';


function DashboardBreadcrumb({ items }: DashboardBreadcrumbProps) {
    const pathname = usePathname();
    const pathSegments = pathname.split('/').filter(Boolean);
  
    const filteredItems = items.filter(item => 
      pathSegments.includes(item.href.split('/').filter(Boolean).pop()!)
    );
  
    return (
      <Breadcrumb className="hidden md:flex">
        <BreadcrumbList>
          {filteredItems.map((item, index) => (
            <React.Fragment key={index}>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href={item.href}>{item.label}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              {index < filteredItems.length - 1 && <BreadcrumbSeparator />}
            </React.Fragment>
          ))}
          <BreadcrumbItem>
            <BreadcrumbPage>{filteredItems[filteredItems.length - 1]?.label || 'Current Page'}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

export default DashboardBreadcrumb;
