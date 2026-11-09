import { NcweLanding, ncweMetadataText } from "@/components/ncwe/ncwe-landing";
import { Page } from "@/components/ui/page";
import type { Locale } from "@/i18n/config";
import { NCWE_TRAILER } from "@/lib/ncwe-release";
import { pageMetadata } from "@/lib/seo";

export function ncweMetadata(locale: Locale) {
  return pageMetadata({ ...ncweMetadataText(locale), path: "/ncwe", image: NCWE_TRAILER.poster, locale });
}

export function NcweView({ locale }: { locale: Locale }) {
  return (
    <Page tone="blue">
      <NcweLanding locale={locale} />
    </Page>
  );
}
