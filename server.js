/**********************************************************************
Title: Web Scraper
Desc: This is a backend for a basic Web Scraper
***********************************************************************/

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const xpath = require ('xpath');
const { DOMParser } = require('xmldom');
const axios = require('axios');
const AWS = require('aws-sdk');
const config = require('./config.js');

const app = express();
app.use(bodyParser.json());
app.use(cors());
AWS.config.update(config.aws_remote_config);
const dynamoDb = new AWS.DynamoDB.DocumentClient();

/**********************************************************************
Xpaths defined for extraction of the relative content from XML
***********************************************************************/
const xpaths = {
    title:'string(//meta[@property="og:title" or @name="title"]/@content | //title)',
    description:'string(//meta[@property="og:description" or @name="description"]/@content)',
    image:'string(//meta[@property="og:image"]/@content)',
    keywords:'string(//meta[@name="keywords" or @property="keywords"]/@content)',
    ogUrl: 'string(//meta[@property="og:url"]/@content)',
    ogType: 'string(//meta[@property="og:type"]/@content)',
};

/**********************************************************************
All functions that are required for the business logic are defined here.

retrievePage() = makes HTTP request and gets a promise.
convertBodyToDocument() = gets page body passes it to DOM Parser to get nodes.
nodesFromDocument() = gets nodes related to particular Xpath from the passes document extracted from above functions.
mapProperties() =   this function iterates over all the necesary path keys specified eg: title and accummulates all the values related to the same for that key. 
                    It internally uses nodesFromDocument() function that retrieves the corresponding values based on xpath. 
scrapeUrl() = This is the main function that forms the business logic using the above defined functions for each step nad returns an object of the desired properties. 
***********************************************************************/
const retrievePage = url => axios.request({url});
const convertBodyToDocument = body => new DOMParser().parseFromString(body);
const nodesFromDocument = (document, xpathselector) => xpath.select(xpathselector,document);
const mapProperties = (paths, document) => Object.keys(paths).reduce((accumulator, key) => ({ ...accumulator, [key]:nodesFromDocument(document, paths[key])}), {});
const scrapeUrl = url => retrievePage(url).then(response => {
    
    console.log("Parsing ... ");
    const document = convertBodyToDocument(response.data);
    const mappedProperties = mapProperties(xpaths, document);
    return mappedProperties;
    
}).catch(() => console.log("Couldn't Parse XML"));

/**********************************************************************
DATABASE Section of the application (Dynamodb)
queryData() = queries for passed url string
putData() = saves the data for a new url
Async/await used with error handling
***********************************************************************/
const queryData = async (url) => {
    
    let result = {fetchResult : "DB Querying error"};
    let params = {
        ExpressionAttributeValues: {
            ":v1": url
        },
        KeyConditionExpression: "siteUrl = :v1",
        TableName: "url_data"
        
    }
    try{
        return await dynamoDb.query(params).promise();
    } catch(err){
        console.log(err);
        return result;
    }
    
}

const putData = async (url, data) => {
    
    let params = {
        TableName: 'url_data',
        Item: {
            "title": data.title,
            "description": data.description,
            "image": data.image,
            "keywords": data.keywords,
            "siteUrl": url,
            "ogUrl": data.ogUrl,
            "ogType": data.ogType
        }
        
    }
    try{
        await dynamoDb.put(params).promise();
        return true;
    } catch(err){
        console.log(err);
        return false;
    }
    
}

/**********************************************************************
Express Section for REST service
Working: Gets a url in a request. Checks if url present in the DB, if yes, gets the data from DB and sends as a response. 
        If url is not found in DB, it runs the business logic to extract the data and sends it as response. Also, the same gets stored in Dynamodb. 
        Next time the same url is received, it will not be fetched but rather retrieved from the DB. 
***********************************************************************/

app.post('/scrape', async (req, res) => {
    
    const { body } = req;
    const { url } = body;
    const dbData = await queryData(url);
    if (dbData.Count === 1){
        console.log("Cached entry found");
        res.json(dbData.Items[0]);
    } else {
        console.log("No cached entry found, scraping data.");
        return scrapeUrl(url).then((result) => {
            if (result === undefined) {
                res.send("Something went wrong while parsing document...");
            } else {
                res.json(result);
                putData(url,result) ? console.log("Data cached") : console.log("Error caching data");
                
            } 
        });
    }
    
})

module.exports = app;

/*
var server = app.listen(3000, function () {
    console.log('Scrapper listening at port ' + server.address().port);
});
*/