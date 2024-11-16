package main

import (
	"da-client/avail"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"
)

type Orders struct {
	SellOrders []int  `json:"sell_orders"`
	BuyOrders  []int  `json:"buy_orders"`
	Pair       string `json:"pair"`
}

func waitForData() {
	for {
		fmt.Println("Waiting for Data to be submitted")
		// Wait for 10 seconds
		time.Sleep(2 * time.Second)
	}
}

func main() {

	// need to send orders here for fraud proofs

	// Unmarshal the JSON into the struct
	var orders Orders
	// err = json.Unmarshal(byteValue, &orders)
	// if err != nil {
	// 	log.Fatalf("failed to unmarshal JSON: %s", err)
	// }

	// Marshal the struct back to a JSON string
	jsonString, err := json.Marshal(orders)
	if err != nil {
		log.Fatalf("failed to marshal JSON: %s", err)
	}

	go waitForData()

	http.HandleFunc("/submit_data", func(w http.ResponseWriter, r *http.Request) {
		avail.DataSubmit(10, "wss://turing-rpc.avail.so/ws", "bulk impact process private orange motion roof force clean recall filter secret", 0, string(jsonString))
		println("Data submitted to Avail")
	})

	fmt.Printf("Starting server at port 8080\n")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatal(err)
	}
}
