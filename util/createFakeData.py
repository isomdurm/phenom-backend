import mysql.connector
import sys 
import getopt
from datetime import date
import datetime

# Incoming Connection
incomingDBConnection = mysql.connector.connect(
	user='root', 
	database='product',
	host='127.0.0.1'
	#ssl_ca='/Users/stephen/Documents/Projects/Phenom/Resources/AWS/mysql-ssl-ca-cert.pem',
	#ssl_verify_cert=True)
)
incomingCursor = incomingDBConnection.cursor()

def buildCreateQuery(product):
	query = 'INSERT INTO `products-incoming` ('

	for key in product:
		query += '{0}, '.format(key)
	
	if query.endswith(", "): query = query[:-2]

	query += ') VALUES ('

	for key in product:
		query += "%({0})s, ".format(key)

	# remove any trailing ',' values
	if query.endswith(", "): query = query[:-2]

	#finish the query
	query += ')'

	return query

for i in range(100000):
	product = {
		'sourceId': 0,
		'sourceProductId': i,
		'name': "OMG " + str(i),
		'productUrl': 'http://www.google.com',
		'sku': i*2,
		'brand': 'OMG BRAND ' + str(i),
		'createdAt': str(datetime.datetime.now().date().isoformat()),
		'updatedAt': str(datetime.datetime.now().date().isoformat()),
		'description': 'OMG DESCRIPTION ' + str(i),
		'imageUrl': 'https://www.google.com',
		'alternateImages': 'https://www.yahoo.com',
		'model': i * 3,
		'averageRating': 3,
		'reviewCount': i + 1,
		'categories': "this",
		'colors': 'azure'
	}

	query = buildCreateQuery(product)
	incomingCursor.execute(query, product)

incomingDBConnection.commit()
incomingDBConnection.close()

