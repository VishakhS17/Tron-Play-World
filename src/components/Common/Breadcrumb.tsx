"use client";

import type React from "react";

import Link from "next/link";

import { usePathname } from "next/navigation";

// Define the breadcrumb item type
export interface BreadcrumbItem {
  label: string;
  href: string;
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[];
  title?: string;
  homeLabel?: string;
  homeHref?: string;
  separator?: React.ReactNode;
}

const Breadcrumb = ({
  items,
  title,
  homeLabel = "Home",
  homeHref = "/",
  separator = ">",
}: BreadcrumbProps) => {
  const pathname = usePathname();

  // If we're on the homepage, don't render the breadcrumb
  if (pathname === "/") return null;

  // If no items are provided, generate them from the current path
  const breadcrumbItems =
    items || generateBreadcrumbsFromPath(pathname, homeLabel, homeHref);

  return (
    <div className="overflow-hidden pt-[172px] sm:pt-[172px]">
      <div className="bg-gray-2">
        <div className="w-full px-4 mx-auto max-w-7xl sm:px-8 xl:px-0">
          <div className="flex h-12 items-center justify-start">
            <nav aria-label="Breadcrumb">
              <ol className="flex flex-wrap items-center gap-2">
                {breadcrumbItems.map((item, index) => {
                  const isLast = index === breadcrumbItems.length - 1;

                  return (
                    <li key={index} className="inline-flex items-center">
                      {isLast ? (
                        <span
                          className="text-custom-sm font-medium leading-none text-blue"
                          aria-current="page"
                        >
                          {item.label}
                        </span>
                      ) : (
                        <>
                          <Link
                            href={item.href}
                            className="text-custom-sm font-medium leading-none text-gray-600 transition-colors hover:text-blue"
                          >
                            {item.label}
                          </Link>
                          <span className="inline-flex items-center text-meta-3 leading-none">
                            {separator}
                          </span>
                        </>
                      )}
                    </li>
                  );
                })}
              </ol>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Breadcrumb;

export const AdminBreadcrumb = ({
  items,
  title,
  homeLabel = "Admin",
  homeHref = "/admin",
  separator = ">",
}: BreadcrumbProps) => {
  const pathname = usePathname();

  // If we're on the admin homepage, don't render the breadcrumb
  if (pathname === "/admin") return null;

  // If no items are provided, generate them from the current path
  const breadcrumbItems =
    items || generateBreadcrumbsFromPath(pathname, homeLabel, homeHref);

  return (
    <div className="overflow-hidden shadow-breadcrumb pt-[100px]">
      <div className="border-t border-gray-3">
        <div className="w-full px-4 py-5 mx-auto max-w-7xl sm:px-8 xl:px-0 xl:py-10">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <h2 className="text-xl font-semibold capitalize text-dark sm:text-2xl">
              {title || breadcrumbItems[breadcrumbItems.length - 1]?.label}
            </h2>

            <nav aria-label="Breadcrumb">
              <ol className="flex flex-wrap items-center gap-1">
                {breadcrumbItems.map((item, index) => {
                  const isLast = index === breadcrumbItems.length - 1;

                  return (
                    <li key={index} className="flex items-center">
                      {isLast ? (
                        <span
                          className="font-medium text-custom-sm text-blue"
                          aria-current="page"
                        >
                          {item.label}
                        </span>
                      ) : (
                        <>
                          <Link
                            href={item.href}
                            className="text-gray-600 transition-colors text-custom-sm hover:text-blue"
                          >
                            {item.label}
                          </Link>
                          <span className="flex items-center mx-1">
                            {separator}
                          </span>
                        </>
                      )}
                    </li>
                  );
                })}
              </ol>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to generate breadcrumbs from the current path
function generateBreadcrumbsFromPath(
  pathname: string,
  homeLabel = "Home",
  homeHref = "/"
): BreadcrumbItem[] {
  // Start with home
  const breadcrumbs: BreadcrumbItem[] = [{ label: homeLabel, href: homeHref }];

  // Skip the first slash and split the path
  const pathSegments = pathname.split("/").filter(Boolean);

  // Build up the breadcrumb items
  let currentPath = "";

  pathSegments.forEach((segment, index) => {
    currentPath += `/${segment}`;

    // Format the label (capitalize, replace hyphens with spaces)
    const label = segment
      .replace(/-/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());

    breadcrumbs.push({
      label,
      href: currentPath,
    });
  });

  return breadcrumbs;
}
