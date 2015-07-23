# safe_walk_blacksburg
An app designed to improve the safety of walking around Blacksburg, VA, 
particularly at night by showing routes that provide sidewalks and street lighting, 
and including historical crime data overlays.

# Currently a non-working project

### Data sources
Street lighting and sidewalk data will come from the Town of Blacksburg [GIS Department](http://www.blacksburg.gov/Index.aspx?page=29)
Crime data will come from 
* VT Police Department [Crime Log PDFs](http://www.police.vt.edu/VTPD_v2.1/crime_logs.php)
* Town reports from [CrimeMapping.com](http://www.crimemapping.com/map.aspx?aid=36898f05-f44b-4778-8c73-27f88b794e0c), which the town uses to publish their data

# Heroku Deployment
The application is being deployed to heroku. The web server binary is located in
[cmd/safewalkd](tree/master/cmd/safewalkd) directory and is a go binary.

The heroku app need the following environment variables set.

```
NRV_PG_DBNAME=blacksburg
NRV_PG_DBPASS=nrv
NRV_PG_HOST=postgres1.ceipocejvkue.us-west-2.rds.amazonaws.com
NRV_PG_USER=blacksburg_read
```
