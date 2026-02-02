// Pokemon TCG API Types
// Based on https://docs.pokemontcg.io/

export interface TCGCardSet {
  id: string;
  name: string;
  series: string;
  printedTotal: number;
  total: number;
  releaseDate: string;
  images: {
    symbol: string;
    logo: string;
  };
}

export interface TCGCardImages {
  small: string;
  large: string;
}

export interface TCGCardPrice {
  low: number | null;
  mid: number | null;
  high: number | null;
  market: number | null;
  directLow: number | null;
}

export interface TCGPlayerPrices {
  normal?: TCGCardPrice;
  holofoil?: TCGCardPrice;
  reverseHolofoil?: TCGCardPrice;
  firstEditionHolofoil?: TCGCardPrice;
  firstEditionNormal?: TCGCardPrice;
}

export interface TCGPlayer {
  url: string;
  updatedAt: string;
  prices?: TCGPlayerPrices;
}

export interface TCGCard {
  id: string;
  name: string;
  supertype: string;
  subtypes?: string[];
  hp?: string;
  types?: string[];
  number: string;
  artist?: string;
  rarity?: string;
  nationalPokedexNumbers?: number[];
  set: TCGCardSet;
  images: TCGCardImages;
  tcgplayer?: TCGPlayer;
}

export interface TCGSearchResponse {
  data: TCGCard[];
  page: number;
  pageSize: number;
  count: number;
  totalCount: number;
}

export interface CardSearchParams {
  name?: string;
  number?: string;
  setId?: string;
  query?: string;
}

export interface CardSearchResult {
  success: boolean;
  cards: TCGCard[];
  totalCount: number;
  error?: string;
}
