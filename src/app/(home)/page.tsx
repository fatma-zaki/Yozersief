import { BottomNav } from "@/components/home/BottomNav";
import { Gallery } from "@/components/home/Gallery.client";
import { Hero } from "@/components/home/Hero";
import { HomeFooter } from "@/components/home/HomeFooter";
import { HomeHeader } from "@/components/home/HomeHeader.client";
import s from "@/components/home/home.module.css";
import { IdeaBanner } from "@/components/home/IdeaBanner";
import { Divider } from "@/components/home/parts";
import { Products } from "@/components/home/Products";
import { Reviews } from "@/components/home/Reviews.client";
import { Steps } from "@/components/home/Steps";
import { WhyUs } from "@/components/home/WhyUs";
import SplashScreen from "@/components/splash/SplashScreen";
import { getPublicCatalog } from "@/modules/catalog";
import { getPublishedGallery } from "@/modules/content";

/**
 * Home page, built from docs/design: Main (desktop), Home-Tablet, Home-Mobile and their -Dark
 * versions. Each section renders the layout of the matching breakpoint. «منتجاتنا» and
 * «معرض الأعمال» read the catalog and the published gallery (both cached, invalidated from
 * the dashboard).
 */
export default async function HomePage() {
  const [categories, gallery] = await Promise.all([getPublicCatalog(), getPublishedGallery()]);
  return (
    <div id="top" className={s.page}>
      <SplashScreen />
      <HomeHeader />
      <main id="main">
        <Hero />
        <Divider />
        <Products categories={categories} />
        <Divider />
        <WhyUs />
        <Divider />
        <Steps />
        <Divider />
        <Gallery items={gallery} />
        <Divider />
        <Reviews />
        <IdeaBanner />
      </main>
      <Divider style={{ maxWidth: "none", margin: 0 }} />
      <HomeFooter />
      <BottomNav />
    </div>
  );
}
