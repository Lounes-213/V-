import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { defaultLocale, routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
    // Numbers, dates and timecodes are formatted in a stable zone so a shared
    // project never shifts timestamps between viewers.
    timeZone: "Africa/Algiers",
  };
});
