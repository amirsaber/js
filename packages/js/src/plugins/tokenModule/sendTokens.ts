import { ConfirmOptions, PublicKey } from '@solana/web3.js';
import type { Metaplex } from '@/Metaplex';
import {
  isSigner,
  KeypairSigner,
  Operation,
  OperationHandler,
  Signer,
  SplTokenAmount,
  useOperation,
} from '@/types';
import { TransactionBuilder } from '@/utils';
import { SendAndConfirmTransactionResponse } from '../rpcModule';
import { createTransferCheckedInstruction } from '@solana/spl-token';
import { isMint, Mint } from './Mint';
import { findAssociatedTokenAccountPda } from './pdas';
import { TokenProgram } from './program';

// -----------------
// Operation
// -----------------

const Key = 'SendTokensOperation' as const;
export const sendTokensOperation = useOperation<SendTokensOperation>(Key);
export type SendTokensOperation = Operation<
  typeof Key,
  SendTokensInput,
  SendTokensOutput
>;

export type SendTokensInput = {
  mint: PublicKey | Mint;
  amount: SplTokenAmount;
  toOwner?: PublicKey; // Defaults to mx.identity().
  toToken?: PublicKey; // Defaults to associated account.
  fromOwner?: PublicKey | Signer; // Defaults to mx.identity().
  fromToken?: PublicKey; // Defaults to associated account.
  fromMultiSigners?: KeypairSigner[]; // Defaults to [].
  tokenProgram?: PublicKey; // Defaults to Token Program.
  confirmOptions?: ConfirmOptions;
};

export type SendTokensOutput = {
  response: SendAndConfirmTransactionResponse;
};

// -----------------
// Handler
// -----------------

export const sendTokensOperationHandler: OperationHandler<SendTokensOperation> =
  {
    async handle(
      operation: SendTokensOperation,
      metaplex: Metaplex
    ): Promise<SendTokensOutput> {
      return sendTokensBuilder(metaplex, operation.input).sendAndConfirm(
        metaplex,
        operation.input.confirmOptions
      );
    },
  };

// -----------------
// Builder
// -----------------

export type SendTokensBuilderParams = Omit<
  SendTokensInput,
  'confirmOptions'
> & {
  instructionKey?: string;
};

export const sendTokensBuilder = (
  metaplex: Metaplex,
  params: SendTokensBuilderParams
): TransactionBuilder => {
  const {
    mint,
    amount,
    toOwner = metaplex.identity().publicKey,
    toToken,
    fromOwner = metaplex.identity(),
    fromToken,
    fromMultiSigners = [],
    tokenProgram = TokenProgram.publicKey,
  } = params;

  const [fromOwnerPublicKey, signers] = isSigner(fromOwner)
    ? [fromOwner.publicKey, [fromOwner]]
    : [fromOwner, fromMultiSigners];

  const mintAddress = isMint(mint) ? mint.address : mint;
  const decimals = isMint(mint) ? mint.decimals : amount.currency.decimals;
  const source =
    fromToken ?? findAssociatedTokenAccountPda(mintAddress, fromOwnerPublicKey);
  const destination =
    toToken ?? findAssociatedTokenAccountPda(mintAddress, toOwner);

  return TransactionBuilder.make().add({
    instruction: createTransferCheckedInstruction(
      source,
      mintAddress,
      destination,
      fromOwnerPublicKey,
      amount.basisPoints.toNumber(),
      decimals,
      fromMultiSigners,
      tokenProgram
    ),
    signers,
    key: params.instructionKey ?? 'transferTokens',
  });
};
