#  Product Data Migration Util
#
#  Author:       Isom Durm (isom@phenomapp.com)
#
#
#  Description:  Utility used to migrate legacy Producs (Indix-based) into the RDS SQL (VK-backed) database.
#                The procedure used to ensure a seamless transition is as follows:
#                   1) For each existing product in the legacy MongoDB collection, create a new record
#                      in RDS, less the _id attribute.  The legacy itemId atribute shall map to the new
#                      storeProductId field, and storeId shall map to that of Legacy (possibly 0)
#                   2) For each productId in productIds for each Locker document, fetch the legacy Product document.
#                   3) Use this product document to locate the corresponding new record in RDS via the 
#                      document's itemId attribute.  Remember that this has mapped to a 
#                      [storeId, storeProductId] pair. 
#                   4) The PK for this record shall be substituted into the productIds attribute of the Locker
#                      document fetched in step 2.
#                   5) For each productId in productsIds for each Moment document, perform step 3.
#                   6) The PK for this record shall be substituted into the productsIds attribute of the Moment
#                      document fetched in step 5.
#					7) For each UserProductData, fetch the legacy Product document for attribute productId
#					8) Perform step 3 using the document located in step 7
#					9) The PK for this record shall be substituted into the productId attribute of the UserProductData
#                      document mentioned in step 7 
#
#  Usage:         python ./importProductsToRDS.py

#libs
from pymongo import MongoClient
import MySQLdb
from bson.objectid import ObjectId
import sys, re, chardet

#connection info
mongoConnectionStr = 'mongodb://phenomReadWrite:__N0d13h$__@ec2-54-174-159-246.compute-1.amazonaws.com:27017/phenom-data'
mongoConnection = MongoClient(mongoConnectionStr)
sqlConnection = MySQLdb.connect(
	user='stephen',
    passwd='shortstop1',
    db='product',
    use_unicode=True,
    charset='UTF8',
    host='phenomapp-product-prod.caa7mgt2wqzg.us-east-1.rds.amazonaws.com',
    ssl={'ca': '/Users/stephen/Documents/Projects/Phenom/Resources/AWS/rds-combined-ca-bundle.pem'}
)


#product source
sourceProducts = mongoConnection['phenom-data'].product

#product dest
destProducts = sqlConnection.cursor(cursorclass=MySQLdb.cursors.SSDictCursor) #sql cursor

#step 1, create new records in RDS
print('Replicating Indix Products in RDS')

#  itemId - guid  ->  storeItemId - intStr   (for this session, create a lookup table to translate between the two)
idLookup = []
for product in sourceProducts.find():
	#add products if they're not banned
	if(not product['banned']):
		idLookup.append(product)

#find RDS equivalent
def findIndex(itemId):
	for index, item in enumerate(idLookup):
		if(item['itemId'] == itemId):
			return unicode(index)

	return -1

def _sanitize_string(inString):
	return inString.encode('ascii', 'ignore').decode('utf-8')

#   for index, item in enumerate(idLookup):
#   	print str(index) + " : " + item

#write the new items in RDS
insertNewProduct = ("INSERT INTO products "
					"(sourceId, sourceProductId, name, productUrl, sku, brand, createdAt, updatedAt, description, imageUrl, alternateImages, model, averageRating, reviewCount, categories, colors, sizes)"
					"VALUES (%(sourceId)s, %(sourceProductId)s, %(name)s, %(productUrl)s, %(sku)s, %(brand)s, %(createdAt)s, %(updatedAt)s, %(description)s, %(imageUrl)s,  %(alternateImages)s, %(model)s, %(averageRating)s, %(reviewCount)s, %(categories)s, %(colors)s, %(sizes)s )")

from progressbar import Bar, ProgressBar, Percentage, RotatingMarker

progressBar = ProgressBar(widgets=[Percentage(), RotatingMarker()], maxval=(len(idLookup))).start() 

for index, product in enumerate(idLookup):
	productValues = {
		'sourceId': 0,
		'sourceProductId': unicode(index),
		'name': _sanitize_string(unicode(product['name'])),
		'productUrl': '' if product['productUrl'] == 'NA' else product['productUrl'],
		'sku': "0" if product['sku'] == 'NA' else unicode(product['sku']),
		'brand': '' if product['brand'] == 'NA' else product['brand'],
		'createdAt': product['createdAt'],
		'updatedAt': product['updatedAt'],
		'description': product['description'],
		'imageUrl': '' if product['imageUrl'] == 'NA' else product['imageUrl'],
		'alternateImages': '',
		'model' : '',
		'averageRating' : 0,
		'reviewCount' : 0,
		'categories' : '',
		'colors' : '',
		'sizes': ''
	}

	destProducts.execute(insertNewProduct, productValues)

	progressBar.update(index + 1)

sqlConnection.commit()

if(progressBar != None):
	progressBar.finish()

#fetch the newly created prodcuts, and create a lookup table from old to new productId
productIdLookup = {};

fetchNewProducts = ("SELECT id, sourceId, sourceProductId "
					"FROM products")

cur = sqlConnection.cursor(cursorclass=MySQLdb.cursors.SSDictCursor)
cur.execute(fetchNewProducts, {})

for product in cur:
	productIdLookup[product['sourceProductId']] = product['id']  # indixId -> RDSId


#step 2-4, for lockers
#locker source
print('Migrating Lockers')
sourceLockers = mongoConnection['phenom-data'].locker
progressBar = ProgressBar(widgets=[Percentage(), RotatingMarker()], maxval=(sourceLockers.count())).start() 

progress = 0
for locker in sourceLockers.find():
	newProductsList = []
	for productId in locker['products']:
		product = sourceProducts.find_one({"_id": ObjectId(productId)})
		if(product != None):
			itemIdIndex = findIndex(product['itemId']);
			if(itemIdIndex != -1):
				newProductsList.append(productIdLookup[itemIdIndex])
			else:
				raise Exception('No RDS record found for Indix itemId:  ' + product['itemId'])
		else:
			raise Exception('No Indix product found for locker');

   	#save this back to the locker.products
	#print(str(locker['products']) + "  ->  " + str(newProductsList))
	locker['products'] = newProductsList
	sourceLockers.save(locker)
	progress += 1
	progressBar.update(progress)

if(progressBar != None):
	progressBar.finish()

#step 5-6, for moments
#moment source
sourceMoments = mongoConnection['phenom-data'].moment
progressBar = ProgressBar(widgets=[Percentage(), RotatingMarker()], maxval=(sourceMoments.count())).start() 
print('Migrating Moments')

progress = 0
for moment in sourceMoments.find():
	newProductsList = []

	for productId in moment['productIds']:
		product = sourceProducts.find_one({'_id': ObjectId(productId)})

		if(product != None):
			itemIdIndex = findIndex(product['itemId'])
			if(itemIdIndex != -1):
				newProductsList.append(productIdLookup[itemIdIndex])
			else:
				raise Exception('No RDS record found for Indix itemId:  + ' + product['itemId'])
		else:
			raise Exception('No Indix product found for moment')

	#save this back to the moment.productIds
	#print(str(moment['productIds']) + "  ->  " + str(newProductsList))
	moment['productIds'] = newProductsList
	sourceMoments.save(moment)
	progress += 1
	progressBar.update(progress)

if(progressBar != None):
	progressBar.finish()

#step 7-9, for UserProductData
print('Migrating User/Product Edges')
sourceUserProductEdges = mongoConnection['phenom-data'].userproductdata
progressBar = ProgressBar(widgets=[Percentage(), RotatingMarker()], maxval=(sourceUserProductEdges.count())).start() 
progress = 0
for userProductEdge in sourceUserProductEdges.find():
	product = sourceProducts.find_one({'_id': ObjectId(userProductEdge['productId'])})

	if(product != None):
		itemIdIndex = findIndex(product['itemId'])

		if(itemIdIndex != -1):
			#print(str(userProductEdge['productId']) + "  ->  " + str(productIdLookup[itemIdIndex]))
			userProductEdge['product'] = productIdLookup[itemIdIndex]
			del userProductEdge['productId']
			sourceUserProductEdges.save(userProductEdge)
		else:
			raise Exception('No RDS record found for Indix itemId:  ' + product['itemId'])
	else:
		raise Exception('No product found for UserProductData with id:  ' + userProductEdge['_id'])

	progress += 1
	progressBar.update(progress)

if(progressBar != None):
	progressBar.finish()	

print('Migrating Legacy Product Models')
products = mongoConnection['phenom-data'].product
progressBar = ProgressBar(widgets=[Percentage(), RotatingMarker()], maxval=(products.count())).start() 
progress = 0
for product in products.find():
	itemIdIndex = findIndex(product['itemId'])
	if itemIdIndex > 0:
		sqlId = productIdLookup[itemIdIndex]

		#overwrite the itemId field, even though we're going to deprecate this collection, we'll still use
		#the itemId field to create a ProductMetadata model for this legacy product in a later migration script
		product['itemId'] = sqlId
		products.save(product)

	elif product['banned']:
		#erradicate the product from the system
		results = products.remove({'_id': product['_id']})
	else:
		raise Exception('We have a product thats in the system which is not banned at this point, we shouldnt get here')

	progress += 1
	progressBar.update(progress)

if(progressBar != None):
	progressBar.finish()		

#cleanup
sqlConnection.close()
