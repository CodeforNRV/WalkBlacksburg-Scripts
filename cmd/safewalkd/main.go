package main

import (
	"log"
	"net/http"
	"os"
	"text/template"
)

type indexParams struct {
	HerokuURL string
}

var indexTpl = template.Must(template.ParseFiles("cmd/safewalkd/index.tmpl"))
var herokuURL = os.Getenv("HEROKU_URL")

func indexHandler(w http.ResponseWriter, r *http.Request) {
	err := indexTpl.Execute(w, indexParams{
		HerokuURL: herokuURL,
	})

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
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
