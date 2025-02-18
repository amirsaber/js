import { ConfirmOptions, Keypair, PublicKey } from '@solana/web3.js';
import {
  Collection,
  Uses,
  createCreateMasterEditionV3Instruction,
} from '@metaplex-foundation/mpl-token-metadata';
import { Metaplex } from '@/Metaplex';
import {
  useOperation,
  Operation,
  Signer,
  OperationHandler,
  token,
  Creator,
  BigNumber,
} from '@/types';
import { findMasterEditionV2Pda } from './pdas';
import { DisposableScope, Option, TransactionBuilder } from '@/utils';
import { SendAndConfirmTransactionResponse } from '../rpcModule';

// -----------------
// Operation
// -----------------

const Key = 'CreateNftOperation' as const;
export const createNftOperation = useOperation<CreateNftOperation>(Key);
export type CreateNftOperation = Operation<
  typeof Key,
  CreateNftInput,
  CreateNftOutput
>;

export interface CreateNftInput {
  // Accounts.
  payer?: Signer; // Defaults to mx.identity().
  updateAuthority?: Signer; // Defaults to mx.identity().
  mintAuthority?: Signer; // Defaults to mx.identity(). Only necessary for existing mints.

  // Mint Account.
  useNewMint?: Signer; // Defaults to new generated Keypair.
  useExistingMint?: PublicKey;

  // Token Account.
  tokenOwner?: PublicKey; // Defaults to mx.identity().publicKey.
  tokenAddress?: PublicKey | Signer;
  tokenExists?: boolean; // Defaults to false.

  // Data.
  uri: string;
  name: string;
  sellerFeeBasisPoints: number;
  symbol?: string; // Defaults to an empty string.
  creators?: Creator[]; // Defaults to mx.identity() as a single Creator.
  isMutable?: boolean; // Defaults to true.
  maxSupply?: Option<BigNumber>; // Defaults to 0.
  collection?: Option<Collection>; // Defaults to null.
  uses?: Option<Uses>; // Defaults to null.

  // Programs.
  tokenProgram?: PublicKey;
  associatedTokenProgram?: PublicKey;

  // Options.
  confirmOptions?: ConfirmOptions;
}

export interface CreateNftOutput {
  response: SendAndConfirmTransactionResponse;
  mintAddress: PublicKey;
  metadataAddress: PublicKey;
  masterEditionAddress: PublicKey;
  tokenAddress: PublicKey;
}

// -----------------
// Handler
// -----------------

export const createNftOperationHandler: OperationHandler<CreateNftOperation> = {
  handle: async (
    operation: CreateNftOperation,
    metaplex: Metaplex,
    scope: DisposableScope
  ) => {
    const builder = await createNftBuilder(metaplex, operation.input);
    scope.throwIfCanceled();
    return builder.sendAndConfirm(metaplex, operation.input.confirmOptions);
  },
};

// -----------------
// Builder
// -----------------

export type CreateNftBuilderParams = Omit<CreateNftInput, 'confirmOptions'> & {
  createMintAccountInstructionKey?: string;
  initializeMintInstructionKey?: string;
  createAssociatedTokenAccountInstructionKey?: string;
  createTokenAccountInstructionKey?: string;
  initializeTokenInstructionKey?: string;
  mintTokensInstructionKey?: string;
  createMetadataInstructionKey?: string;
  createMasterEditionInstructionKey?: string;
};

export type CreateNftBuilderContext = Omit<CreateNftOutput, 'response'>;

export const createNftBuilder = async (
  metaplex: Metaplex,
  params: CreateNftBuilderParams
): Promise<TransactionBuilder<CreateNftBuilderContext>> => {
  const {
    useNewMint = Keypair.generate(),
    payer = metaplex.identity(),
    updateAuthority = metaplex.identity(),
    mintAuthority = metaplex.identity(),
    tokenOwner = metaplex.identity().publicKey,
  } = params;

  const sftBuilder = await metaplex
    .nfts()
    .builders()
    .createSft({
      payer,
      updateAuthority,
      mintAuthority,
      freezeAuthority: mintAuthority.publicKey,
      useNewMint,
      useExistingMint: params.useExistingMint,
      tokenAddress: params.tokenAddress,
      tokenOwner,
      tokenAmount: token(1),
      tokenExists: params.tokenExists,
      decimals: 0,
      uri: params.uri,
      name: params.name,
      sellerFeeBasisPoints: params.sellerFeeBasisPoints,
      symbol: params.symbol,
      creators: params.creators,
      isMutable: params.isMutable,
      maxSupply: params.maxSupply,
      collection: params.collection,
      uses: params.uses,
      tokenProgram: params.tokenProgram,
      associatedTokenProgram: params.associatedTokenProgram,
      createMintAccountInstructionKey: params.createMintAccountInstructionKey,
      initializeMintInstructionKey: params.initializeMintInstructionKey,
      createAssociatedTokenAccountInstructionKey:
        params.createAssociatedTokenAccountInstructionKey,
      createTokenAccountInstructionKey: params.createTokenAccountInstructionKey,
      initializeTokenInstructionKey: params.initializeTokenInstructionKey,
      mintTokensInstructionKey: params.mintTokensInstructionKey,
      createMetadataInstructionKey: params.createMetadataInstructionKey,
    });

  const { mintAddress, metadataAddress, tokenAddress } =
    sftBuilder.getContext();
  const masterEditionAddress = findMasterEditionV2Pda(mintAddress);

  return (
    TransactionBuilder.make<CreateNftBuilderContext>()
      .setFeePayer(payer)
      .setContext({
        mintAddress,
        metadataAddress,
        masterEditionAddress,
        tokenAddress: tokenAddress as PublicKey,
      })

      // Create the mint, the token and the metadata.
      .add(sftBuilder)

      // Create master edition account (prevents further minting).
      .add({
        instruction: createCreateMasterEditionV3Instruction(
          {
            edition: masterEditionAddress,
            mint: mintAddress,
            updateAuthority: updateAuthority.publicKey,
            mintAuthority: mintAuthority.publicKey,
            payer: payer.publicKey,
            metadata: metadataAddress,
          },
          {
            createMasterEditionArgs: {
              maxSupply: params.maxSupply === undefined ? 0 : params.maxSupply,
            },
          }
        ),
        signers: [payer, mintAuthority, updateAuthority],
        key: params.createMasterEditionInstructionKey ?? 'createMasterEdition',
      })
  );
};
