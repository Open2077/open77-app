"use client";

import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { forwardRef, type AnchorHTMLAttributes, type MouseEvent, type ReactNode } from "react";

import { cx } from "./cx";
import { Glitch } from "./glitch";

type SmartLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string;
  children: ReactNode;
  isActive?: boolean;
  activeClassName?: string;
  /** Scramble the label on hover. */
  glitch?: boolean;
  /**
   * Open in a new tab. Defaults to true for external URLs; pass false for
   * file downloads and other external links that belong in the same tab.
   */
  newTab?: boolean;
};

/**
 * The site's link. External URLs open in a new tab, in-page anchors scroll
 * smoothly (and stay real links, reachable from the keyboard), file links keep
 * their `download` attribute, everything else is a Next.js link.
 */
export const SmartLink = forwardRef<HTMLAnchorElement, SmartLinkProps>(function SmartLink(
  { href, title, className, onClick, children, isActive, activeClassName, glitch, newTab, download, ...rest },
  ref,
) {
  const pathname = usePathname();
  const external = /^[a-z][a-z0-9+.-]*:/i.test(href);
  const anchor = href.startsWith("#") || href.startsWith(`${pathname}#`);
  const current = !external && !anchor && pathname === href;
  const content = glitch ? <Glitch>{children}</Glitch> : children;
  const classes = cx(className, (isActive ?? current) && activeClassName) || undefined;

  if (anchor) {
    const scroll = (event: MouseEvent<HTMLAnchorElement>) => {
      onClick?.(event);
      if (event.defaultPrevented) return;
      const id = decodeURIComponent(href.split("#")[1] ?? "");
      const target = id ? document.getElementById(id) : null;
      if (!target) return;
      event.preventDefault();
      const offset = (document.querySelector("header")?.getBoundingClientRect().height ?? 100) + 16;
      window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - offset, behavior: "smooth" });
      window.history.replaceState(window.history.state, "", `#${id}`);
      // Move focus with the view so keyboard users continue from the target.
      if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    };
    return (
      <a ref={ref} href={href} title={title} className={classes} onClick={scroll} {...rest}>
        {content}
      </a>
    );
  }

  if (external || download !== undefined) {
    const blank = newTab ?? (external && download === undefined);
    return (
      <a
        ref={ref}
        href={href}
        title={title}
        className={classes}
        onClick={onClick}
        download={download}
        {...rest}
        {...(blank ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {content}
      </a>
    );
  }

  return (
    <NextLink ref={ref} href={href} title={title} onClick={onClick} className={classes} {...rest}>
      {content}
    </NextLink>
  );
});
