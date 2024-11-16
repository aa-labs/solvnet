package avail

import (
	"fmt"
	"time"

	gsrpc "github.com/centrifuge/go-substrate-rpc-client/v4"
	"github.com/centrifuge/go-substrate-rpc-client/v4/signature"
	"github.com/centrifuge/go-substrate-rpc-client/v4/types"
)

// Took this code from avail's example
// submitData creates a transaction and makes a Avail data submission
func DataSubmit(size int, ApiURL string, Seed string, AppID int, blockDetails string) (types.Hash, error) {
	api, err := gsrpc.NewSubstrateAPI(ApiURL)
	if err != nil {
		return types.Hash{}, fmt.Errorf("cannot create api:%w", err)
	}

	meta, err := api.RPC.State.GetMetadataLatest()
	if err != nil {
		return types.Hash{}, fmt.Errorf("cannot get metadata:%w", err)
	}

	// Set data and appID according to need
	data := blockDetails
	appID := 0

	// if app id is greater than 0 then it must be created before submitting data
	if AppID != 0 {
		appID = AppID
	}

	c, err := types.NewCall(meta, "DataAvailability.submit_data", types.NewBytes([]byte(data)))
	if err != nil {
		return types.Hash{}, fmt.Errorf("cannot create new call:%w", err)
	}

	// Create the extrinsic
	ext := types.NewExtrinsic(c)

	genesisHash, err := api.RPC.Chain.GetBlockHash(0)
	if err != nil {
		return types.Hash{}, fmt.Errorf("cannot get block hash:%w", err)
	}

	rv, err := api.RPC.State.GetRuntimeVersionLatest()
	if err != nil {
		return types.Hash{}, fmt.Errorf("cannot get runtime version:%w", err)
	}

	keyringPair, err := signature.KeyringPairFromSecret(Seed, 42)
	if err != nil {
		return types.Hash{}, fmt.Errorf("cannot create KeyPair:%w", err)
	}

	key, err := types.CreateStorageKey(meta, "System", "Account", keyringPair.PublicKey)
	if err != nil {
		return types.Hash{}, fmt.Errorf("cannot create storage key:%w", err)
	}

	var accountInfo types.AccountInfo
	ok, err := api.RPC.State.GetStorageLatest(key, &accountInfo)
	if err != nil || !ok {
		return types.Hash{}, fmt.Errorf("cannot get latest storage:%w", err)
	}
	nonce := uint32(accountInfo.Nonce)
	o := types.SignatureOptions{
		BlockHash:          genesisHash,
		Era:                types.ExtrinsicEra{IsMortalEra: false},
		GenesisHash:        genesisHash,
		Nonce:              types.NewUCompactFromUInt(uint64(nonce)),
		SpecVersion:        rv.SpecVersion,
		Tip:                types.NewUCompactFromUInt(0),
		TransactionVersion: rv.TransactionVersion,
	}
	// Sign the transaction using Alice's default account
	err = ext.Sign(keyringPair, o)
	if err != nil {
		return types.Hash{}, fmt.Errorf("cannot sign:%w", err)
	}

	// Send the extrinsic
	sub, err := api.RPC.Author.SubmitAndWatchExtrinsic(ext)
	if err != nil {
		return types.Hash{}, fmt.Errorf("cannot submit extrinsic:%w", err)
	}
	fmt.Println("here")
	defer sub.Unsubscribe()
	var timeoutDuration = 10000
	timeout := time.After(time.Duration(100) * time.Second)
	var blockHash types.Hash
out:
	for {
		select {
		case status := <-sub.Chan():
			if status.IsInBlock {
				fmt.Println("📥 Submit data extrinsic included in block %v", status.AsInBlock.Hex())
			}
			if status.IsFinalized {
				blockHash = status.AsFinalized
				break out
			} else if status.IsDropped {
				return types.Hash{}, fmt.Errorf("❌ Extrinsic dropped")
			} else if status.IsUsurped {
				return types.Hash{}, fmt.Errorf("❌ Extrinsic usurped")
			} else if status.IsRetracted {
				return types.Hash{}, fmt.Errorf("❌ Extrinsic retracted")
			} else if status.IsInvalid {
				return types.Hash{}, fmt.Errorf("❌ Extrinsic invalid")
			}
		case <-timeout:
			return types.Hash{}, fmt.Errorf("⌛️ Timeout of %d seconds reached without getting finalized status for extrinsic", timeoutDuration)
		}
	}
	fmt.Printf("Data submitted : %v against appID %v  sent with hash %#x\n", data, appID, blockHash)

	return blockHash, nil
}
