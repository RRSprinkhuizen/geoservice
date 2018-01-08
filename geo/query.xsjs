var utils = $.import('rsprinkhuizen/geo','utils');
var headerName; var headerValue; var contentType;
var validParams = ["query", "callback", "envelope", "f", "inSR", "outSR", "spatialRel", "geometry", "geometryType", "outFields", "where", "returnIdsOnly", "returnCountOnly", "returnGeometry"];
var parsedParams = utils.mapParams($.request.parameters, validParams);
var errorMessage = "";

// How to make this configurable outside of the service source code???
const DATATABLE = { "schema" : "S0018627384", "name" : "LOCATIONS" };

function getTableInfo() {
    var connection = $.hdb.getConnection();
    var dictionaryQueryText = "select * from TABLE_COLUMNS WHERE SCHEMA_NAME = ? and TABLE_NAME = ? ORDER BY POSITION";
    var tableInfo = connection.executeQuery(dictionaryQueryText, DATATABLE.schema, DATATABLE.name);
    return tableInfo;
}
function executeQuery() {
    var jsonResponse = {};
    return jsonResponse;
}
function executeDummyQuery() {
    var connection = $.hdb.getConnection();
    var fields = utils.constructFieldSelection(parsedParams);
    var where = utils.constructWhereClause(parsedParams);
    
    var queryText = 'select ' + fields + '  from "S0018627384"."LOCATIONS"' + where;
    //var queryText = 'select *, "geom".st_asgeojson() as "GEOM_AS_JSON" from "S0018627384"."LOCATIONS"' + where;
    var results = connection.executeQuery(queryText);
    connection.close();
    var jsonReturn;
    if(Object.keys(parsedParams).length === 1 && parsedParams.f === "json") {
        jsonReturn = utils.createMetaResponse(getTableInfo());
    } else {
        jsonReturn = utils.createResponse(results);
    }
    return jsonReturn;
    
}
//Implementation of GET call
function handleGet() {
	// Retrieve data here and return results in JSON/other format 
	$.response.status = $.net.http.OK;
	var queryResults = executeDummyQuery();
    //$.response.setBody(JSON.stringify(queryResults));
    return queryResults;
}
//Implementation of POST call
function handlePost() {
	var bodyStr = $.request.body ? $.request.body.asString() : undefined;
	if ( bodyStr === undefined ){
		 $.response.status = $.net.http.INTERNAL_SERVER_ERROR;
		 return {"myResult":"Missing BODY"};
	}
	// Extract body insert data to DB and return results in JSON/other format
	$.response.status = $.net.http.CREATED;
    return {"myResult":"POST success"};
}
// Check Content type headers and parameters
function validateInput() {
	// Check content-type is application/json
	contentType = $.request.contentType;
	if ( contentType === null ) { //|| contentType.startsWith("application/json") === false){
		 $.response.status = $.net.http.INTERNAL_SERVER_ERROR;
		 $.response.setBody("<h2>Something went wrong!</h2>");
		return false;
	}
	// Extract headers and process them 
	for (var j = 0; j < $.request.headers.length; ++j) {
	    headerName = $.request.headers[j].name;
	    headerValue = $.request.headers[j].value;
        //      Add logic
        // Not used yet.
	 }
	 if(errorMessage) {
	     return false;
	 } else {
        return true;
	 }
}

// Request process 
function processRequest(){
	if (validateInput()){
		try {
		    switch ( $.request.method ) {
		        //Handle your GET calls here
		        case $.net.http.GET:
		            var getResults = JSON.stringify(handleGet());
	                if (parsedParams.callback) {
                        getResults = parsedParams.callback + '(' + getResults + ')';
                    }
		            $.response.setBody(getResults);
		            break;
		            //Handle your POST calls here
		        case $.net.http.POST:
		            $.response.setBody(JSON.stringify(handlePost()));
		            break; 
		        //Handle your other methods: PUT, DELETE
		        default:
		            $.response.status = $.net.http.METHOD_NOT_ALLOWED;
		            $.response.setBody("Wrong request method");		        
		            break;
		    }
		    $.response.contentType = "application/json; charset=UTF-8";
		    
		} catch (e) {
		    $.response.setBody("Failed to execute action: " + e.toString());
		}
	} else {
	    $.response.setBody("<h2>Something when wrong validating the URL you requested.</h2>" + errorMessage);
	}
}
// Call request processing  
processRequest();