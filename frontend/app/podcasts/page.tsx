import SubscriptionList from "@/components/subscription-list";

/**
 * The library at its own route.
 *
 * A thin wrapper so `/podcasts` keeps working for links and bookmarks; the
 * landing page renders the same component.
 */
export default function PodcastsPage() {
  return <SubscriptionList />;
}
