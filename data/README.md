## Running and Deploying to Iron.io

* Add `iron.json` with token and project id.
* Add `config.json` with MongoDB URI
```
{
  "db_uri": "mongodb://user:password@mongo_server"
}
```
* Run locally
```
iron_worker run VT_PDF_parser --worker-config config.json
```
