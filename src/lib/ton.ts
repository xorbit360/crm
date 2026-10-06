import { mnemonicToPrivateKey } from '@ton/crypto';
import { TonClient, WalletContractV4, internal, SendMode } from '@ton/ton';

export async function distributeTonCommissions(invoiceData: any, superAdminMnemonic?: string) {
  const mnemonicStr = superAdminMnemonic || process.env.SUPERADMIN_MNEMONIC;
  if (!mnemonicStr) {
    console.log("No SUPERADMIN_MNEMONIC configured. Skipping real on-chain dispersion.");
    return false;
  }
  
  try {
    const mnemonic = mnemonicStr.split(' ');
    const key = await mnemonicToPrivateKey(mnemonic);
    
    // Create a client for the mainnet
    const client = new TonClient({
      endpoint: 'https://toncenter.com/api/v2/jsonRPC', 
    });
    
    const wallet = WalletContractV4.create({ publicKey: key.publicKey, workchain: 0 });
    const contract = client.open(wallet);
    const balance = await contract.getBalance();
    console.log(`[ON-CHAIN] Admin Wallet Balance: ${balance.toString()} nanoTON`);

    const hasSponsors = !!invoiceData.sponsorWallet;
    
    if (hasSponsors) {
       // Convert USDT plan value to TON (mock rate, you should fetch real rate in production)
       const TON_RATE = 7.25; 
       
       // Calc values in nanoTON
       const sponsorValue = Math.round((invoiceData.planValue * 0.50 / TON_RATE) * 1e9).toString();
       
       const seqno = await contract.getSeqno();
       
       // WalletV4 allows up to 4 internal messages per transaction.
       await contract.sendTransfer({
         seqno,
         secretKey: key.secretKey,
         messages: [
           internal({
             to: invoiceData.sponsorWallet,
             value: sponsorValue,
             body: 'Comision Directa (50%) Nivel 1',
           })
           // You can add more internal messages here for N2, N3, etc.
         ]
       });
       
       console.log(`[ON-CHAIN] SUCCESS: Dispersed TON to Sponsor ${invoiceData.sponsorWallet}`);
    } else {
       console.log(`[ON-CHAIN] No sponsor. 100% remains in SuperAdmin wallet.`);
    }

    return true;
  } catch (error: any) {
    console.error("[ON-CHAIN] Error executing real TON dispersion:", error.message);
    return false;
  }
}
