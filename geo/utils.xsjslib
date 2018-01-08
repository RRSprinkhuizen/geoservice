var proj4js = $.import('rsprinkhuizen/geo','proj4js');
const projRD = proj4js.proj4.defs("RD","+proj=sterea +lat_0=52.15616055555555 +lon_0=5.38763888888889 +k=0.9999079 +x_0=155000 +y_0=463000 +ellps=bessel +units=m +no_defs");
const projGoogle = "EPSG:3857";
const esriFieldTypes = ["esriFieldTypeSmallInteger", "esriFieldTypeInteger", "esriFieldTypeSingle", "esriFieldTypeDouble", "esriFieldTypeString",
    "esriFieldTypeDate", "esriFieldTypeOID", "esriFieldTypeGeometry", "esriFieldTypeBlob", "esriFieldTypeRaster", "esriFieldTypeGUID",
    "esriFieldTypeGlobalID", "esriFieldTypeXML"];
const esriGeometryTypes = ["esriGeometryPoint", "esriGeometryMultipoint", "esriGeometryPolyline", "esriGeometryPolygon", "esriGeometryEnvelope"];
var esriField = {
      "name": "",
      "type": "",
      "alias": "",
      "length": 0
    };

var jsonMetaResponse = {
    "currentVersion":10.41,
    "id":0,
    "name":"Locations",
    "type":"Feature Layer",
    "description":"Test locations",
    "geometryType":"esriGeometryPoint",
    "copyrightText":"(c)2017, NextView",
    "fields":[],
    "parentLayer":null,
    "subLayers":[],
    "minScale":0,
    "maxScale":0,
    "drawingInfo":{"renderer":{"type":"simple","symbol":{"type":"esriSMS","style":"esriSMSCircle","color":[255,255,115,255],"size":4,"angle":0,"xoffset":0,"yoffset":0,"outline":{"color":[0,0,0,255],"width":1}},"label":"","description":""},"transparency":0,"labelingInfo":null},
    "defaultVisibility":true,
    "hasAttachments":false,
    "htmlPopupType":"esriServerHTMLPopupTypeAsHTMLText",
    "displayField":"description",
    "relationships":[],
    "canModifyLayer":false,
    "canScaleSymbols":false,"hasLabels":false,"capabilities":"Data,Query","maxRecordCount":10000,"supportsStatistics":false,"supportsAdvancedQueries":false,"supportedQueryFormats":"JSON",
    "ownershipBasedAccessControlForFeatures":{"allowOthersToQuery":true},
    "useStandardizedQueries":false,
    "advancedQueryCapabilities":{"useStandardizedQueries":true,"supportsStatistics":false,"supportsOrderBy":false,"supportsDistinct":false,"supportsPagination":false,
                "supportsTrueCurve":false,"supportsReturningQueryExtent":false,"supportsQueryWithDistance":false}
    };
//TODO: Standardized for POINT now, needs to be variable
var jsonResponse = { 
    "displayFieldName": "",
    "fieldAliases": {},
    "geometryType": "esriGeometryPoint",
    "spatialReference": {
        "wkid": 102100,
        "latestWkid": 3857
    },
    "fields": [],
    "features": [],
    "exceededTransferLimit": false
};
function getGeometryType(geometry) {
    var esriType;
    switch(geometry.type.toUpperCase()) {
        case 'POINT':
            esriType = 'esriGeometryPoint';
            break;
        case 'POLYGON':
            break;
    }
    return esriType;
}
function reproject(fromSR, toSR, coords) {
    var newCoords = proj4js.proj4(fromSR, toSR, coords);
    if(toSR === 'WGS84' || toSR === 'EPSG:4326') {
        return([newCoords[1], newCoords[0]]);
    } else {
        return(newCoords);
    }
}
function envelopeToGeometry(geoEnvelope) {
    var bottomLeft, topRight;
    //json envelope, e.g.: {xmin:-104,ymin:35.6,xmax:-94.32,ymax:41}
    if(geoEnvelope.startsWith('{')) {
        var envelope = {};
        //geoEnvelope.substr(1,geoEnvelope.length - 2).split(',').forEach(function(x){
        //    var arr = x.split(':');
        //    arr[1] && (envelope[arr[0]] = arr[1]);
        //});
        envelope = JSON.parse(geoEnvelope);
        bottomLeft = reproject(projGoogle, 'EPSG:4326',[envelope.xmin,envelope.ymin]);//proj4js.proj4(projGoogle,"EPSG:4326",[envelope.xmin,envelope.ymin]);
        topRight = reproject(projGoogle, 'EPSG:4326', [envelope.xmax,envelope.ymax]);//proj4js.proj4(projGoogle,"EPSG:4326", [envelope.xmax,envelope.ymax]);
        //{"xmin":313086.067855414,"ymin":6887893.492834114,"xmax":626172.1357114799,"ymax":7200979.5606901795,"spatialReference":{"wkid":102100,"latestWkid":3857}}
    } else { // envelope with just coordinates
        bottomLeft = reproject(projGoogle, 'EPSG:4326', [envelope[0],envelope[1]]);
        topRight = reproject(projGoogle, 'EPSG:4326', [envelope[2],envelope[3]]);
    }
    return 'NEW ST_POLYGON(\'Polygon ((' + bottomLeft[0] + ' ' + bottomLeft[1] + ',' +
               topRight[0] + ' ' + bottomLeft[1] + ',' +
               topRight[0] + ' ' + topRight[1] + ',' +
               bottomLeft[0] + ' ' + topRight[1] + ',' +
               bottomLeft[0] + ' ' + bottomLeft[1] + '))\'';
}
function constructWhereClause(parsedParams) {
    var whereClauses = [];
    for(var par in parsedParams) {
        switch(par) {
            case "where":
                whereClauses.push(parsedParams.where);
                break;
            case "geometryType":
                if(parsedParams.geometryType === 'esriGeometryEnvelope') {
                    var geoEnvelope = parsedParams.geometry;
                    whereClauses.push(envelopeToGeometry(geoEnvelope) + ').ST_COVERS("geom") = 1');
                }
                break;
        }
    }
    var whereClause = ''; // check if there are where clauses
    for(var w = 0; w < whereClauses.length; w++) {
        if(whereClause === '') {
            whereClause = ' WHERE ';
        }
        whereClause += whereClauses[w];
        if(w !== whereClauses.length - 1) {
            whereClause += ' AND ';
        }
    }
    return whereClause;
}
function constructFieldSelection(parsedParams) {
    var fieldSelection = "";
    if(parsedParams.hasOwnProperty("outFields")) {
        var splittedOutFields = parsedParams.outFields.split(',');
        for(var f in splittedOutFields) {
            fieldSelection += splittedOutFields[f] + ','; 
        }
    } else {
        fieldSelection = '*,';
    }
    fieldSelection += '"geom".st_asgeojson() as "GEOM_AS_JSON"';
    // if(fieldSelection.endsWith(",")) {
    //     fieldSelection = fieldSelection.substring(0,fieldSelection.length-1);
    // }
    return fieldSelection;
}

function createMetaResponse(tableInfo) {
    if(tableInfo && tableInfo.length > 0) {
        for(var c=0;c<tableInfo.length;c++) {
            var oColumn = tableInfo[c];
            var oField = { "name": oColumn.COLUMN_NAME, "type": "", "alias": oColumn.COLUMN_NAME};
            switch(oColumn.DATA_TYPE_NAME) {
                case "BIGINT":
                    oField.type = "esriFieldTypeOID";
                    break;
                case "INTEGER": 
                    oField.type = "esriFieldTypeInteger";
                    break;
                case "ST_GEOMETRY":
                    oField.type = "esriFieldTypeGeometry";
                    break;
                default:
                    oField.type = "esriFieldTypeString";
                    oField.length = oColumn.LENGTH;
            }
            jsonMetaResponse.fields.push(oField);
        }
    }
    return jsonMetaResponse;
}
function createResponse(results, metaresponse) {
    if(results && results.length > 0) {
        //jsonResponse.displayFieldName = results;
        for(var prop in results[0]) {
            jsonResponse.fieldAliases[prop] = prop;
            var oField = { "name": prop, "type": "", "alias": prop};
            switch(prop) {
                case "id":
                    oField.type = "esriFieldTypeOID";
                    break;
                //case "esriFieldTypeDouble": 
                //    oField.type = "esriFieldTypeDouble";
                //    break;
                //case "esriFieldTypeInteger": 
                //    oField.type = "esriFieldTypeInteger";
                //    break;
                case "GEOM_AS_JSON":
                    oField.type = "esriFieldTypeGeometry";
                    break;
                default:
                    oField.type = "esriFieldTypeString";
                    oField.length = 255;
            }
            jsonResponse.fields.push(oField);
        }
        jsonResponse.displayFieldName = "DESCRIPTION";
        // results is an object { "0" : {row0data}, "1" : {row1data} }
        for(var record in results) {
            // recordData is an object {"id":"3","type":0,"description":"SAP","geom":[1,1,0,0,0,59,103,176,78,58,219,73,64,97,22,127,128,90,89,21,64]}
            var recordData = results[record];
            //jsonResponse.displayFieldName = "TODO: use first field here";
            var feature = {};
            feature["attributes"] = {};//= { "attributes" : {} };
            for(var f in recordData) {// in recordData) { //jsonResponse.fieldAliases) {
                //jsonResponse.displayFieldName += recordData[f];
                //duck-typing, only geom = JSON
                if(f !== 'GEOM_AS_JSON') {
                    if(recordData[f] instanceof ctypes.Int64 || recordData[f] instanceof ctypes.UInt64) {
                        feature.attributes[f] = Number.parseInt( recordData[f] ); 
                    } else {
                        feature.attributes[f] = recordData[f];
                    }

                } else {
                    var oGeometry = JSON.parse(recordData[f]);
                    //feature.attributes[f] = recordData[f];
                    var oProjGeom = proj4js.proj4("EPSG:4326",projGoogle,[oGeometry.coordinates[1],oGeometry.coordinates[0]]);
                    feature.geometry = { x: oProjGeom[0], y: oProjGeom[1] };
                    //feature["geometry"]["x"] = recordData[f].x; 
                    //feature["geometry"]["y"] = recordData[f].y;
                    //feature.attributes[f] = JSON.parse(recordData[f]);
                    jsonResponse.geometryType = "esriGeometryPoint";//getGeometryType(feature.attributes[f]);
                }
            }
            jsonResponse.features.push( feature );
        }
    }
    if(metaresponse) {
        jsonMetaResponse.fields = jsonResponse.fields;
        return jsonMetaResponse;
    } else {
        return jsonResponse;
    }
}

function mapParams(params, validParams) {
    var oParameters = {};
    if (params) {
        for (var i = 0; i < params.length; i++) {
            var param = params[i];
            if(validParams.indexOf(param.name) > -1) {
                oParameters[param.name] = param.value;
            } else {
                //TODO: errorhandling
            }
        }
    }
    return oParameters;
}
