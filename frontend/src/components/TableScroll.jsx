import { useEffect, useRef } from "react";
import "./tables.css";

export function TableScroll({ children, label = "Table", className = "", ...props }) {
  const ref = useRef(null);
  useEffect(() => {
    const element = ref.current;
    let frame;
    // A horizontal overflow container prevents CSS sticky from following the
    // page. Move only the header as the page (or enclosing modal) scrolls.
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const head = element.querySelector("thead");
        if (!head) return;
        const modal = element.closest(".modal-panel");
        const top = modal ? Math.max(0, modal.getBoundingClientRect().top) + (modal.querySelector(".modal-header")?.offsetHeight || 0) : 0;
        const offset = Math.min(Math.max(0, top - element.getBoundingClientRect().top), Math.max(0, element.clientHeight - head.offsetHeight));
        element.style.setProperty("--table-header-offset", `${offset}px`);
      });
    };
    const observer = new ResizeObserver(update);
    observer.observe(element);
    observer.observe(element.parentElement);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    update();
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
      cancelAnimationFrame(frame);
    };
  }, []);
  return <div ref={ref} className={`table-wrap scrollable-table ${className}`} role="region" aria-label={label} tabIndex={0} {...props}>{children}</div>;
}
