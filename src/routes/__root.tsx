import {
  Outlet,
  Link,
  createRootRoute,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import type { ReactNode } from "react";

import appCss from "../styles.css?url";
import { Toaster } from "@/components/ui/sonner";

function ErrorShell({
  code,
  title,
  text,
  children,
}: {
  code?: string;
  title: string;
  text: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass max-w-md rounded-3xl px-8 py-10 text-center">
        {code && <p className="font-display text-7xl font-semibold text-gold">{code}</p>}
        <h1 className="mt-3 text-3xl font-semibold">{title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{text}</p>
        <div className="mt-7 flex flex-wrap justify-center gap-2">{children}</div>
      </div>
    </div>
  );
}

const goldLink =
  "inline-flex h-11 items-center justify-center rounded-full bg-gold-gradient px-6 text-sm font-semibold text-primary-foreground transition-[filter] hover:brightness-110";
const glassLink =
  "glass inline-flex h-11 items-center justify-center rounded-full px-6 text-sm font-medium text-foreground transition-colors hover:bg-glass-strong";

function NotFoundComponent() {
  return (
    <ErrorShell
      code="404"
      title="Такой страницы нет"
      text="Похоже, олени свернули не туда. Вернитесь на главную и соберите свой праздник."
    >
      <Link to="/" className={goldLink}>
        На главную
      </Link>
    </ErrorShell>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();

  return (
    <ErrorShell
      title="Страница не загрузилась"
      text="Что-то пошло не так на нашей стороне. Попробуйте обновить страницу или вернитесь на главную."
    >
      <button
        onClick={() => {
          router.invalidate();
          reset();
        }}
        className={goldLink}
      >
        Попробовать снова
      </button>
      <a href="/" className={glassLink}>
        На главную
      </a>
    </ErrorShell>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Дед Мороз на Пхукете" },
      { name: "description", content: "Дед Мороз, Снегурочка и детские аниматоры на Пхукете." },
      { property: "og:title", content: "Дед Мороз на Пхукете" },
      {
        property: "og:description",
        content: "Дед Мороз, Снегурочка и детские аниматоры на Пхукете.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Manrope:wght@400;500;600;700&display=swap&subset=cyrillic",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <>
      <Outlet />
      <Toaster position="top-center" />
    </>
  );
}
