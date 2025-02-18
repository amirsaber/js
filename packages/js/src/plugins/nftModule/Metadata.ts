import { PublicKey } from '@solana/web3.js';
import {
  Collection,
  TokenStandard,
  UseMethod,
} from '@metaplex-foundation/mpl-token-metadata';
import { BigNumber, Creator, Pda, toBigNumber } from '@/types';
import { JsonMetadata } from '../nftModule';
import { assert, Option, removeEmptyChars } from '@/utils';
import { findMetadataPda } from './pdas';
import { MetadataAccount } from './accounts';

export type Metadata<Json extends object = JsonMetadata> = Readonly<{
  model: 'metadata';
  address: Pda;
  mintAddress: PublicKey;
  updateAuthorityAddress: PublicKey;
  json: Option<Json>;
  jsonLoaded: boolean;
  name: string;
  symbol: string;
  uri: string;
  isMutable: boolean;
  primarySaleHappened: boolean;
  sellerFeeBasisPoints: number;
  editionNonce: Option<number>;
  creators: Creator[];
  tokenStandard: Option<TokenStandard>;
  collection: Option<Collection>;
  uses: Option<MetadataUses>;
}>;

type MetadataUses = {
  useMethod: UseMethod;
  remaining: BigNumber;
  total: BigNumber;
};

// TODO(loris): type MetadataParentCollection
// TODO(loris): type MetadataCollectionDetails

export const isMetadata = (value: any): value is Metadata =>
  typeof value === 'object' && value.model === 'metadata';

export function assertMetadata(value: any): asserts value is Metadata {
  assert(isMetadata(value), `Expected Metadata model`);
}
export const toMetadata = (
  account: MetadataAccount,
  json?: Option<JsonMetadata>
): Metadata => ({
  model: 'metadata',
  address: findMetadataPda(account.data.mint),
  mintAddress: account.data.mint,
  updateAuthorityAddress: account.data.updateAuthority,
  json: json ?? null,
  jsonLoaded: json !== undefined,
  name: removeEmptyChars(account.data.data.name),
  symbol: removeEmptyChars(account.data.data.symbol),
  uri: removeEmptyChars(account.data.data.uri),
  isMutable: account.data.isMutable,
  primarySaleHappened: account.data.primarySaleHappened,
  sellerFeeBasisPoints: account.data.data.sellerFeeBasisPoints,
  editionNonce: account.data.editionNonce,
  creators: account.data.data.creators ?? [],
  tokenStandard: account.data.tokenStandard,
  collection: account.data.collection,
  uses: account.data.uses
    ? {
        ...account.data.uses,
        remaining: toBigNumber(account.data.uses.remaining),
        total: toBigNumber(account.data.uses.total),
      }
    : null,
});
