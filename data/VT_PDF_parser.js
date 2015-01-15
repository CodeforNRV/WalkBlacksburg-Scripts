//The purpose of this script is to parse the PDFs of the crime logs of the VT Police Department (http://www.police.vt.edu/VTPD_v2.1/crime_logs.html)

//Runs on node.js and Requires the pdf2json library which can be found in npm (https://github.com/modesty/pdf2json)

var nodeUtil = require("util"), fs = require("fs"), PDFParser = require("pdf2json/pdfparser");
var pdfParser = new PDFParser();

//The PDF can/should be pulled from the website directly (e.g. http://www.police.vt.edu/VTPD_v2.1/crime_stats/crime_logs/data/VT_2014-12_Crime_Log.pdf)
//Using a local copy for offline development
pdfParser.loadPDF('VT_2014-12_Crime_Log.pdf');

//Create an empty data structure for the output
var dataRows = [];

//Adds the previous row to dataRows and sets currentRow to an empty row structure
function newRow(finishedRow) {
	emptyRow = {"caseNumber":null, "dateReported":null, "criminalOffense":null, "location":null, "date":null, "time":null, "disposition":null};
	if (finishedRow) {
		dataRows.push(finishedRow);
		console.log("Wrote row " + dataRows.length);
	}
	return emptyRow;
}

//The PDF can/should be pulled from the website directly (e.g. http://www.police.vt.edu/VTPD_v2.1/crime_stats/crime_logs/data/VT_2014-12_Crime_Log.pdf)
////Using a local copy for offline development

pdfParser.loadPDF('VT_2014-12_Crime_Log.pdf');
pdfParser.on("pdfParser_dataReady", function(jsonData) {

var currentRow = null;
var isNewRow = true;

//Grab the pages in the PDF
var pages = jsonData.data.Pages;

//For every page in the PDF, we'll look through each of the Texts arrays to pull out the fields
for (var i=0; i<pages.length; i++) {
	//console.log(i);
	var page = pages[i];
	var texts = page.Texts;
	var inPageHeaders = true;

	//For every text field, we need to parse and decide which column it belongs to
	for (var j=0; j<texts.length; j++) {
		textInfo = texts[j];
		text = decodeURIComponent(textInfo.R[0].T);
		
		//Each page contains a bunch of text fields until you get to the column headers that ends with "Disposition"
		//We want to (probably) start with the field following "Disposition", which should be the case number
		if (text != "Disposition" && inPageHeaders) { continue; }
		if (text == "Disposition" && inPageHeaders) { inPageHeaders = false; continue; }
		
		//Unfortunately, the fields don't break down perfectly, so things we want to keep together might be broken into multiple parts
		//For example, multi-line fields in the PDF will be different elements in the texts array
		//While not every item lines up perfectly, we should be able to use the x position of text fields to determine which column it belongs to
		
		//Some defaults to base things on
		//Case # column: x = 8.258
		//Date Reported: x = 17.444
		//Criminal Offense: x = 27.591
		//Location: x = 60.072
		//Occurence Date: x = 86.281
		//Occurence Time: x = 96.429
		//Disposition: x = 111.419
		
		if (textInfo.x < 10.0) {
			//Case # column
			if(isNewRow) {
				currentRow = newRow(currentRow);
				isNewRow = false;
			} else { currentRow.caseNumber += " " + text }
			continue;
		} else if (textInfo.x < 20.0) {
			//Date Reported column
			if (currentRow.dateReported) { currentRow.dateReported += " " + text;
			} else { currentRow.dateReported = text; }
		} else if (textInfo.x < 30.0) {
			//Criminal Offense column
			if (currentRow.criminalOffense) { currentRow.criminalOffense += " " + text;
			} else { currentRow.criminalOffense = text; }
		} else if (textInfo.x < 62.0) {
			//Location column
			if (currentRow.location) { currentRow.location += " " + text;
			} else { currentRow.location = text; }
		} else if (textInfo.x < 90.0) {
			//Occurence date column
			if (currentRow.date) { currentRow.date += " " + text;
			} else { currentRow.date = text; }
		} else if (textInfo.x < 98.0) {
			//Occurence time column
			if (currentRow.time) { currentRow.time += " " + text;
			} else { currentRow.time = text; }
		} else if (textInfo.x > 105) {
			//Disposition column
			if (currentRow.disposition) { currentRow.disposition += " " + text;
			} else { currentRow.disposition = text; }
		}		
		isNewRow = true; //Everything except a case # will reach here, so that each time we hit a new case # column we can know it is a new row
	}
}

}); //End pdfParser_dataReady
