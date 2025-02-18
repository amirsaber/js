import { cusper } from '@metaplex-foundation/mpl-token-metadata';
import type { Metaplex } from '@/Metaplex';
import { TokenMetadataProgram } from './program';
import { TokenMetadataGpaBuilder } from './gpaBuilders';
import { ErrorWithLogs, MetaplexPlugin } from '@/types';
import { NftClient } from './NftClient';
import { createNftOperation, createNftOperationHandler } from './createNft';
import { createSftOperation, createSftOperationHandler } from './createSft';
import {
  findNftByMetadataOperation,
  findNftByMetadataOperationHandler,
} from './findNftByMetadata';
import {
  findNftByMintOperationHandler,
  findNftByMintOperation,
} from './findNftByMint';
import {
  findNftByTokenOperation,
  findNftByTokenOperationHandler,
} from './findNftByToken';
import {
  findNftsByCreatorOperationHandler,
  findNftsByCreatorOperation,
} from './findNftsByCreator';
import {
  findNftsByMintListOperationHandler,
  findNftsByMintListOperation,
} from './findNftsByMintList';
import {
  findNftsByOwnerOperationHandler,
  findNftsByOwnerOperation,
} from './findNftsByOwner';
import {
  findNftsByUpdateAuthorityOperationHandler,
  findNftsByUpdateAuthorityOperation,
} from './findNftsByUpdateAuthority';
import {
  loadMetadataOperation,
  loadMetadataOperationHandler,
} from './loadMetadata';
import {
  printNewEditionOperation,
  printNewEditionOperationHandler,
} from './printNewEdition';
import { updateNftOperation, updateNftOperationHandler } from './updateNft';
import {
  uploadMetadataOperation,
  uploadMetadataOperationHandler,
} from './uploadMetadata';
import { useNftOperation, useNftOperationHandler } from './useNft';

export const nftModule = (): MetaplexPlugin => ({
  install(metaplex: Metaplex) {
    // Token Metadata Program.
    metaplex.programs().register({
      name: 'TokenMetadataProgram',
      address: TokenMetadataProgram.publicKey,
      errorResolver: (error: ErrorWithLogs) =>
        cusper.errorFromProgramLogs(error.logs, false),
      gpaResolver: (metaplex: Metaplex) =>
        new TokenMetadataGpaBuilder(metaplex, TokenMetadataProgram.publicKey),
    });

    // Operations.
    const op = metaplex.operations();
    op.register(createNftOperation, createNftOperationHandler);
    op.register(createSftOperation, createSftOperationHandler);
    op.register(findNftByMetadataOperation, findNftByMetadataOperationHandler);
    op.register(findNftByMintOperation, findNftByMintOperationHandler);
    op.register(findNftByTokenOperation, findNftByTokenOperationHandler);
    op.register(findNftsByCreatorOperation, findNftsByCreatorOperationHandler);
    op.register(
      findNftsByMintListOperation,
      findNftsByMintListOperationHandler
    );
    op.register(findNftsByOwnerOperation, findNftsByOwnerOperationHandler);
    op.register(
      findNftsByUpdateAuthorityOperation,
      findNftsByUpdateAuthorityOperationHandler
    );
    op.register(loadMetadataOperation, loadMetadataOperationHandler);
    op.register(printNewEditionOperation, printNewEditionOperationHandler);
    op.register(updateNftOperation, updateNftOperationHandler);
    op.register(uploadMetadataOperation, uploadMetadataOperationHandler);
    op.register(useNftOperation, useNftOperationHandler);

    metaplex.nfts = function () {
      return new NftClient(this);
    };
  },
});

declare module '../../Metaplex' {
  interface Metaplex {
    nfts(): NftClient;
  }
}
