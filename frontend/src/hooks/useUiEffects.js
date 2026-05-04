import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export function useUiEffects() {
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    function handleScroll() {
      setIsScrolled(window.scrollY > 100);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, [location.pathname]);

  useEffect(() => {
    const observedElements = new WeakSet();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: "0px 0px -100px 0px",
      },
    );

    function isImmediatelyVisible(element) {
      const rect = element.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const triggerLine = viewportHeight - 100;

      return rect.top <= triggerLine && rect.bottom >= 0;
    }

    function observeElement(element) {
      if (!(element instanceof HTMLElement) || observedElements.has(element)) {
        return;
      }

      observedElements.add(element);

      if (isImmediatelyVisible(element)) {
        element.classList.add("in-view");
        return;
      }

      observer.observe(element);
    }

    function observeWithin(root) {
      if (!(root instanceof Element)) {
        return;
      }

      if (root.matches("[data-animate]")) {
        observeElement(root);
      }

      root.querySelectorAll("[data-animate]").forEach(observeElement);
    }

    observeWithin(document.body);

    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          observeWithin(node);
        });
      });
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      mutationObserver.disconnect();
      observer.disconnect();
    };
  }, [location.pathname]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape" && location.pathname !== "/") {
        navigate("/");
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [location.pathname, navigate]);

  useEffect(() => {
    function handleRipple(event) {
      const button = event.target.closest(".ui-ripple");

      if (!button) {
        return;
      }

      const ripple = document.createElement("span");
      const rect = button.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = event.clientX - rect.left - size / 2;
      const y = event.clientY - rect.top - size / 2;

      ripple.className = "ripple-effect";
      ripple.style.width = `${size}px`;
      ripple.style.height = `${size}px`;
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;
      button.appendChild(ripple);

      window.setTimeout(() => {
        ripple.remove();
      }, 600);
    }

    document.addEventListener("click", handleRipple);

    return () => {
      document.removeEventListener("click", handleRipple);
    };
  }, []);

  return { isScrolled };
}
