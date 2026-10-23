/**
 * Request builder layout. The builder draws its own chrome from the design
 * (docs/design/Request.html): dark hero band with the stepper on desktop, a compact header
 * and sticky actions on phones.
 */
export default function OrderLayout({ children }: LayoutProps<"/order">) {
  return <>{children}</>;
}
