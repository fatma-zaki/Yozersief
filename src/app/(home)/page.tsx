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

/**
 * Home page, built from docs/design: Main (desktop), Home-Tablet, Home-Mobile and their -Dark
 * versions. Each section renders the layout of the matching breakpoint.
 */
export default function HomePage() {
  return (
    <div id="top" className={s.page}>
      <SplashScreen />
      <HomeHeader />
      <main id="main">
        <Hero />
        <Divider />
        <Products />
        <Divider />
        <WhyUs />
        <Divider />
        <Steps />
        <Divider />
        <Gallery />
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
