const { clusterApiUrl, Connection, PublicKey, Keypair } = require("@solana/web3.js");
const { TOKEN_PROGRAM_ID, Token } = require("@solana/spl-token");
const anchor = require('@project-serum/anchor');

const utils = require("./utils");

const fs = require('fs');

const path = require('path');
const os = require("os");

const idl = JSON.parse(fs.readFileSync(path.resolve('./idl/seeded_staking.json')));
const programID = new PublicKey("65fMP12hbWs8FrHxBcwYkjQwL2SVv43EisrMvUpWJdkN");
console.log(programID, "program")

const walletKeyData = JSON.parse(fs.readFileSync('./wallet/7JgtUXaz8gRthhuruNjR91vmzWxoDKTapNaLn7duPtEU.json'));
const walletKeypair = Keypair.fromSecretKey(new Uint8Array(walletKeyData));
const wallet = new anchor.Wallet(walletKeypair);

let stakingMintPubkey;
let poolPubkey;
let poolKeypair;

const connection = new Connection(clusterApiUrl('devnet'))
// const connection = new Connection('http://127.0.0.1:8899');

function getProvider() {
    const provider = new anchor.Provider(
        connection, wallet, { preflightCommitment: "processed" },
    );
    return provider;
}

const provider = getProvider();

let program = new anchor.Program(idl, programID, provider);

async function initializePool() {
    //THIS IS TOKEN ID
    stakingMintPubkey = new PublicKey('GXnuqN2B2Zaqr8Xi5qqAcentjfTztFSnXwh41su7SqkM');

    poolKeypair = anchor.web3.Keypair.generate();

    console.log(poolKeypair)
    console.log(poolKeypair.publicKey.toBase58())
    console.log(poolKeypair.secretKey)

    poolPubkey = poolKeypair.publicKey;

    stakingMintObject = new Token(provider.connection, stakingMintPubkey, TOKEN_PROGRAM_ID, provider.wallet.payer);

    const [
        _poolSigner,
        _nonce,
    ] = await anchor.web3.PublicKey.findProgramAddress(
        [poolKeypair.publicKey.toBuffer()],
        program.programId
    );
    let poolSigner = _poolSigner;
    let poolNonce = _nonce;

    let stakingMintVault = await stakingMintObject.createAccount(poolSigner);

    await program.rpc.initialize(
        poolNonce,
        {
            accounts: {
                authority: provider.wallet.publicKey,
                stakingMint: stakingMintObject.publicKey,
                stakingVault: stakingMintVault,
                poolSigner: poolSigner,
                pool: poolPubkey,
                tokenProgram: TOKEN_PROGRAM_ID,
            },
            signers: [poolKeypair],
            instructions: [
                await program.account.pool.createInstruction(poolKeypair,),
            ],
        }
    );
}

initializePool();