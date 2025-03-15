import {
  airdropFactory,
  appendTransactionMessageInstructions,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  createTransactionMessage,
  generateKeyPairSigner,
  getSignatureFromTransaction,
  lamports,
  pipe,
  sendAndConfirmTransactionFactory,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
} from "@solana/kit";
import { getCreateAccountInstruction } from "@solana-program/system";
import {
  getCreateAssociatedTokenInstructionAsync,
  getInitializeMintInstruction,
  getMintSize,
  TOKEN_2022_PROGRAM_ADDRESS,
  findAssociatedTokenPda,
  ASSOCIATED_TOKEN_PROGRAM_ADDRESS,
  getMintToInstruction,
  getTransferInstruction,
} from "@solana-program/token-2022";

// Create Connection, local validator in this example
const rpc = createSolanaRpc("http://127.0.0.1:8899");
const rpcSubscriptions = createSolanaRpcSubscriptions("ws://127.0.0.1:8900");

// Generate keypairs for fee payer (sender) and recipient
const feePayer = await generateKeyPairSigner();
const recipient = await generateKeyPairSigner();

console.log("Fee Payer/Sender Address: ", feePayer.address.toString());
console.log("Recipient Address: ", recipient.address.toString());

// Fund fee payer
await airdropFactory({ rpc, rpcSubscriptions })({
  recipientAddress: feePayer.address,
  lamports: lamports(1_000_000_000n),
  commitment: "confirmed",
});

// Generate keypair to use as address of mint
const mint = await generateKeyPairSigner();
console.log("Mint Address: ", mint.address.toString());

// Get default mint account size (in bytes), no extensions enabled
const space = BigInt(getMintSize());

// Get minimum balance for rent exemption
const rent = await rpc.getMinimumBalanceForRentExemption(space).send();

// Get latest blockhash to include in transaction
const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

// Instruction to create new account for mint (token 2022 program)
// Invokes the system program
const createAccountInstruction = getCreateAccountInstruction({
  payer: feePayer,
  newAccount: mint,
  lamports: rent,
  space,
  programAddress: TOKEN_2022_PROGRAM_ADDRESS,
});

// Instruction to initialize mint account data
// Invokes the token 2022 program
const initializeMintInstruction = getInitializeMintInstruction({
  mint: mint.address,
  decimals: 2,
  mintAuthority: feePayer.address,
});

// Derive the ATAs for sender and recipient
const [senderAssociatedTokenAddress] = await findAssociatedTokenPda({
  mint: mint.address,
  owner: feePayer.address,
  tokenProgram: TOKEN_2022_PROGRAM_ADDRESS,
});

const [recipientAssociatedTokenAddress] = await findAssociatedTokenPda({
  mint: mint.address,
  owner: recipient.address,
  tokenProgram: TOKEN_2022_PROGRAM_ADDRESS,
});

console.log(
  "Sender's Associated Token Account Address: ",
  senderAssociatedTokenAddress.toString()
);
console.log(
  "Recipient's Associated Token Account Address: ",
  recipientAssociatedTokenAddress.toString()
);

// Create instruction for sender's ATA
const createSenderAtaInstruction =
  await getCreateAssociatedTokenInstructionAsync({
    payer: feePayer,
    mint: mint.address,
    owner: feePayer.address,
  });

// Create instruction for recipient's ATA
const createRecipientAtaInstruction =
  await getCreateAssociatedTokenInstructionAsync({
    payer: feePayer,
    mint: mint.address,
    owner: recipient.address,
  });

// Create instruction to mint tokens to sender
const mintToInstruction = getMintToInstruction({
  mint: mint.address,
  token: senderAssociatedTokenAddress,
  mintAuthority: feePayer.address,
  amount: 100n,
});

// Combine all instructions in order
const instructions = [
  createAccountInstruction, // Create mint account
  initializeMintInstruction, // Initialize mint
  createSenderAtaInstruction, // Create sender's ATA
  createRecipientAtaInstruction, // Create recipient's ATA
  mintToInstruction, // Mint tokens to sender
];

// Create transaction message
const transactionMessage = pipe(
  createTransactionMessage({ version: 0 }),
  (tx) => setTransactionMessageFeePayerSigner(feePayer, tx),
  (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
  (tx) => appendTransactionMessageInstructions(instructions, tx)
);

// Sign transaction message with all required signers
const signedTransaction = await signTransactionMessageWithSigners(
  transactionMessage
);

// Send and confirm transaction
await sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions })(
  signedTransaction,
  { commitment: "confirmed" }
);

// Get transaction signature
const transactionSignature = getSignatureFromTransaction(signedTransaction);

console.log("Transaction Signature: ", transactionSignature);
console.log(
  "Successfully created mint, ATAs, and minted 100 tokens to sender!"
);

// Get a fresh blockhash for the second transaction
const { value: latestBlockhash2 } = await rpc.getLatestBlockhash().send();

// Create instruction to transfer tokens
const transferInstruction = getTransferInstruction({
  source: senderAssociatedTokenAddress,
  destination: recipientAssociatedTokenAddress,
  authority: feePayer.address,
  amount: 50n, // Transfer half of the tokens
});

// Create transaction message
const transactionMessage2 = pipe(
  createTransactionMessage({ version: 0 }),
  (tx) => setTransactionMessageFeePayerSigner(feePayer, tx),
  (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash2, tx),
  (tx) => appendTransactionMessageInstructions([transferInstruction], tx)
);

// Sign transaction message with all required signers
const signedTransaction2 = await signTransactionMessageWithSigners(
  transactionMessage2
);

// Send and confirm transaction
await sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions })(
  signedTransaction2,
  { commitment: "confirmed" }
);

// Get transaction signature
const transactionSignature2 = getSignatureFromTransaction(signedTransaction2);

console.log("Transaction Signature: ", transactionSignature2);
console.log("Successfully transferred 50 tokens from sender to recipient!");
console.log("Sender balance: 50 tokens");
console.log("Recipient balance: 50 tokens");
