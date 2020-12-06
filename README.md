# Scraper
Simple Web Scraper for OG parameters and meta data  
**server.js** is the main file that defines the functioning of the scraper  
Dependencies:  
- express for REST
- xmldom for converting page to document 
- xpath for extraction of necessary content from nodes in the document
- Dynamodb for caching new results and querying already searched results
- cors and body-parser required as well
Currently deployed over Amazon serverless using Lambda over free tier plan. 

Usage: 

--------------------------------------------------------
Send as request as below from either a website or Postman: 
Request body: 
  
{  
    "url":"https://www.flipkart.com/"  
}  


Response received: 
  
{  
    "title": "Online Shopping Site for Mobiles, Electronics, Furniture, Grocery, Lifestyle, Books & More. Best Offers!",  
    "description": "India's biggest online store for Mobiles, Fashion (Clothes/Shoes), Electronics, Home Appliances, Books, Jewelry, Home, Furniture, Sporting goods, Beauty & Personal Care, Grocery and more! Find the largest selection from all brands at the lowest prices in India. Payment options - COD, EMI, Credit card, Debit card & more.",  
    "image": "",  
    "keywords": "",  
    "ogUrl": "https://www.flipkart.com",  
    "ogType": "website"  
}  

--------------------------------------------------------
  
Inner functioning: 
- Checks if url is cached by querying url in Dynamodb. 
- If yes, sends the data retrieved from Dynamodb
- If not cached scrapes data using the standard technique mentioned above and sends the data in response. 
- Caches the new url along with acquired data to Dynamodb for further use. 
