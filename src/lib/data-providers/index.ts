import 'server-only';

/**
 * External market-data abstraction.
 *
 * ProductPilot AI does not currently integrate any live data source. Rather than
 * fabricate figures, each provider below reports `available: false` and the UI
 * states plainly that live data is unavailable. Adding a real integration means
 * implementing one of these interfaces and registering it — no UI or API changes
 * are required.
 */

export type DataSourceStatus = {
  id: string;
  label: string;
  available: boolean;
  /** Explains to the user why a source is not contributing to the report. */
  reason: string;
  docsHint?: string;
};

export type TrendPoint = { label: string; value: number };

export type TrendData = {
  source: string;
  fetchedAt: Date;
  direction: 'GROWING' | 'STABLE' | 'DECLINING' | 'SEASONAL';
  points: TrendPoint[];
};

export interface TrendDataProvider {
  readonly id: string;
  readonly label: string;
  readonly available: boolean;
  getTrend(query: string): Promise<TrendData | null>;
  status(): DataSourceStatus;
}

export type CompetitorPageData = {
  url: string;
  title: string;
  price: number | null;
  currency: string | null;
  fetchedAt: Date;
};

export interface CompetitorDataProvider {
  readonly id: string;
  readonly label: string;
  readonly available: boolean;
  fetchPage(url: string): Promise<CompetitorPageData | null>;
  status(): DataSourceStatus;
}

export type MarketSnapshot = {
  source: string;
  fetchedAt: Date;
  averagePrice: number | null;
  listingCount: number | null;
};

export interface MarketDataProvider {
  readonly id: string;
  readonly label: string;
  readonly available: boolean;
  getSnapshot(query: string): Promise<MarketSnapshot | null>;
  status(): DataSourceStatus;
}

const UNAVAILABLE_REASON =
  'No live data integration is connected. Everything shown in this section is an AI estimate derived from the product information you provided.';

class UnavailableTrendProvider implements TrendDataProvider {
  readonly id = 'none';
  readonly label = 'Search trend data';
  readonly available = false;
  async getTrend() {
    return null;
  }
  status(): DataSourceStatus {
    return {
      id: this.id,
      label: this.label,
      available: false,
      reason: UNAVAILABLE_REASON,
      docsHint: 'Implement TrendDataProvider in src/lib/data-providers to connect a trends API.',
    };
  }
}

class UnavailableCompetitorProvider implements CompetitorDataProvider {
  readonly id = 'none';
  readonly label = 'Competitor page data';
  readonly available = false;
  async fetchPage() {
    return null;
  }
  status(): DataSourceStatus {
    return {
      id: this.id,
      label: this.label,
      available: false,
      reason:
        'Competitor pages are not fetched. Analysis is inferred from the URLs and context you supplied, not from page content.',
      docsHint: 'Implement CompetitorDataProvider in src/lib/data-providers to enable page fetching.',
    };
  }
}

class UnavailableMarketProvider implements MarketDataProvider {
  readonly id = 'none';
  readonly label = 'Marketplace data';
  readonly available = false;
  async getSnapshot() {
    return null;
  }
  status(): DataSourceStatus {
    return {
      id: this.id,
      label: this.label,
      available: false,
      reason: UNAVAILABLE_REASON,
      docsHint: 'Implement MarketDataProvider in src/lib/data-providers to connect marketplace data.',
    };
  }
}

export function getTrendDataProvider(): TrendDataProvider {
  return new UnavailableTrendProvider();
}

export function getCompetitorDataProvider(): CompetitorDataProvider {
  return new UnavailableCompetitorProvider();
}

export function getMarketDataProvider(): MarketDataProvider {
  return new UnavailableMarketProvider();
}

export function dataSourceStatuses(): DataSourceStatus[] {
  return [
    getTrendDataProvider().status(),
    getCompetitorDataProvider().status(),
    getMarketDataProvider().status(),
  ];
}
