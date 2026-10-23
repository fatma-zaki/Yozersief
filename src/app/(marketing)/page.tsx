import {
  ArrowLeft,
  Gem,
  Gift,
  Headset,
  ImageIcon,
  PenTool,
  Quote,
  Settings,
  Shirt,
  Truck,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";
import { ar, t } from "@/i18n/ar";
import { CATEGORY_KEYS } from "@/modules/catalog";

const FEATURE_ICONS = [Gem, Truck, PenTool, Gift];
const WHY_ICONS = [Gem, Truck, PenTool, Headset];
const STEP_ICONS = [Shirt, ImageIcon, Settings, Truck];

export default function HomePage() {
  return (
    <>
      <Hero />
      <Section
        id="products"
        eyebrow={ar.home.productsEyebrow}
        title={ar.home.productsTitle}
        body={ar.home.productsBody}
      >
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORY_KEYS.map((key) => (
            <li key={key}>
              <Link
                href={`/services/${key}`}
                className="glass group rounded-card ease-yz flex h-full flex-col overflow-hidden transition-[transform,box-shadow] duration-500 hover:-translate-y-1"
              >
                <div className="relative h-48 overflow-hidden">
                  <Image
                    src={`/images/categories/${key}.jpg`}
                    alt={ar.catalog[key].t}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="ease-yz object-cover transition-transform duration-[900ms] group-hover:scale-105"
                  />
                </div>
                <div className="flex flex-1 flex-col gap-2 p-5">
                  <h3 className="text-lg font-extrabold">{ar.catalog[key].t}</h3>
                  <p className="text-ink-muted text-sm leading-7">{ar.catalog[key].d}</p>
                  <span className="text-accent mt-auto inline-flex items-center gap-1 pt-2 text-sm font-bold">
                    {ar.app.startOrder}
                    <ArrowLeft className="size-4" aria-hidden="true" />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <section id="about" className="bg-band py-20 text-white">
        <div className="mx-auto max-w-[1320px] px-4 sm:px-6">
          <SectionHeading
            eyebrow={ar.home.whyEyebrow}
            title={ar.home.whyTitle}
            body={ar.home.whyBody}
            dark
          />
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {ar.home.why.map((item, i) => {
              const Icon = WHY_ICONS[i] ?? Gem;
              return (
                <li key={item.t} className="glass-dark rounded-card flex flex-col gap-3 p-6">
                  <span className="rounded-pill border-mint/80 text-mint flex size-14 items-center justify-center border-[1.5px] shadow-[0_0_18px_rgb(126_232_199/0.35)]">
                    <Icon className="size-6" strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  <h3 className="text-lg font-extrabold">{item.t}</h3>
                  <p className="text-sm leading-7 text-white/75">{item.s}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <Section eyebrow={ar.home.stepsEyebrow} title={ar.home.stepsTitle} body={ar.home.stepsBody}>
        <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {ar.home.steps.map((step, i) => {
            const Icon = STEP_ICONS[i] ?? Shirt;
            return (
              <li key={step.t} className="glass rounded-card flex flex-col gap-3 p-6">
                <span className="rounded-card-sm bg-ok-bg text-accent flex size-14 items-center justify-center">
                  <Icon className="size-6" strokeWidth={1.75} aria-hidden="true" />
                </span>
                <h3 className="text-lg font-extrabold">
                  <span className="text-accent">{t(ar.home.stepLabel, { n: i + 1 })}</span> {step.t}
                </h3>
                <p className="text-ink-muted text-sm leading-7">{step.s}</p>
              </li>
            );
          })}
        </ol>
      </Section>

      <Section eyebrow={ar.home.galleryEyebrow} title={ar.home.galleryTitle}>
        <EmptyState icon={<ImageIcon />} title={ar.home.galleryEmpty} />
      </Section>

      <Section eyebrow={ar.home.reviewsEyebrow} title={ar.home.reviewsTitle}>
        <EmptyState icon={<Quote />} title={ar.home.reviewsEmpty} />
      </Section>

      <CtaBand />
    </>
  );
}

function Hero() {
  return (
    <section className="bg-band relative overflow-hidden pt-36 pb-16 text-white">
      <Image
        src="/brand/ornament-mint.svg"
        alt=""
        aria-hidden="true"
        width={620}
        height={620}
        className="pointer-events-none absolute -top-28 -left-64 opacity-55"
      />
      <div className="relative mx-auto flex max-w-[1320px] flex-col items-center gap-10 px-4 sm:px-6 lg:flex-row">
        <div className="flex flex-1 flex-col items-start gap-6">
          <span className="rounded-pill border-mint/50 bg-mint/10 text-mint-light inline-flex items-center border px-4 py-1 text-[13px] leading-[22px] font-bold">
            {ar.home.eyebrow}
          </span>
          <h1 className="text-[44px] leading-[60px] font-extrabold sm:text-[64px] sm:leading-[84px]">
            {ar.home.titleStart} <span className="neon-text">{ar.home.titleNeon}</span>
          </h1>
          <p className="max-w-xl text-lg leading-8 text-white/80">{ar.home.subtitle}</p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/order">{ar.nav.startOrderNow}</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="line"
              className="border-mint/60 text-white hover:bg-white/10"
            >
              <Link href="/gallery">{ar.home.seeWork}</Link>
            </Button>
          </div>
        </div>
        <div className="rounded-card relative aspect-[4/3] w-full max-w-[640px] flex-1 overflow-hidden">
          <Image
            src="/images/scenes/hero.jpg"
            alt={ar.home.heroImageAlt}
            fill
            priority
            sizes="(min-width: 1024px) 640px, 100vw"
            className="object-cover"
          />
        </div>
      </div>
      <ul className="glass-dark rounded-card relative mx-auto mt-12 grid max-w-[1320px] grid-cols-2 gap-y-3 px-4 py-4 sm:mx-6 sm:grid-cols-4 lg:mx-auto">
        {ar.home.features.map((label, i) => {
          const Icon = FEATURE_ICONS[i] ?? Gem;
          return (
            <li key={label} className="flex items-center justify-center gap-3 text-sm font-bold">
              <Icon className="text-mint size-5" strokeWidth={1.75} aria-hidden="true" />
              {label}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function CtaBand() {
  return (
    <section className="px-4 py-20 sm:px-6">
      <div className="rounded-card bg-band relative mx-auto flex max-w-[1320px] flex-col items-start gap-5 overflow-hidden p-10 text-white sm:p-14">
        <Image
          src="/images/scenes/cta.jpg"
          alt=""
          aria-hidden="true"
          fill
          sizes="50vw"
          className="hidden [mask-image:linear-gradient(to_left,transparent_0%,#000_40%)] object-cover opacity-40 md:block"
        />
        <h2 className="relative text-4xl leading-[56px] font-extrabold">
          {ar.home.ctaTitleStart} <span className="neon-text">{ar.home.ctaTitleNeon}</span>
        </h2>
        <p className="relative text-lg text-white/80">{ar.home.ctaBody}</p>
        <Button asChild size="lg" className="relative">
          <Link href="/order">{ar.nav.startOrderNow}</Link>
        </Button>
      </div>
    </section>
  );
}

function Section({
  id,
  eyebrow,
  title,
  body,
  children,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  body?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="animate-fade-up py-20">
      <div className="mx-auto max-w-[1320px] px-4 sm:px-6">
        <SectionHeading eyebrow={eyebrow} title={title} body={body} />
        <div className="mt-10">{children}</div>
      </div>
    </section>
  );
}

function SectionHeading({
  eyebrow,
  title,
  body,
  dark,
}: {
  eyebrow: string;
  title: string;
  body?: string | undefined;
  dark?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <span
        className={
          dark
            ? "rounded-pill border-mint/50 bg-mint/10 text-mint-light border px-4 py-1 text-[13px] font-bold"
            : "rounded-pill border-line-strong bg-ok-bg text-accent border px-4 py-1 text-[13px] font-bold"
        }
      >
        {eyebrow}
      </span>
      <h2 className="text-3xl leading-[48px] font-extrabold sm:text-4xl">{title}</h2>
      {body ? (
        <p className={dark ? "max-w-2xl text-white/75" : "text-ink-muted max-w-2xl"}>{body}</p>
      ) : null}
    </div>
  );
}
