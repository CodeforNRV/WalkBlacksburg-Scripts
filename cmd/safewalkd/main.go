package main

import (
	"log"
	"net/http"
	"os"
)

func indexHandler(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "cmd/safewalkd/index.html")
}

func main() {
	http.HandleFunc("/", indexHandler)
	http.HandleFunc("/overlay.kml", func(w http.ResponseWriter, r *http.Request) {
		err := kmlExecute(w)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	})

	err := http.ListenAndServe(":"+os.Getenv("PORT"), nil)
	if err != nil {
		log.Fatal(err)
	}
}
