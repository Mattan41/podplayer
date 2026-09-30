import SubscriptionList from "@/components/subscription-list";

/**
 * Landing page.
 *
 * Renders the same subscription list as `/podcasts`; the two routes exist so the
 * library is reachable both as the site root and under its own name. See
 * `docs/DECISIONS.md` entry 21.
 */
export default function Home() {
  return <SubscriptionList />;
}
