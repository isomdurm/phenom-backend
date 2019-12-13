##################################################################################################################
#
# Phenom Incoming Database Validation
#
#  Author:       Isom Durm (isom@phenomapp.com)
#
#
#  Params:        --no_print [opt] - Default NO, logs all queries sent to the products-staged table
#                 --skip_image_check [opt] - Default NO, skips image key verification with S3
#  Output:        
#                 Validating New Products:  
#                 100%,  646954, Time: 0:22:35                                                    
#                 Looking for Deleted Products:  
#                 100%,  605466, Time: 0:10:34                                                    
#                 
#                 New Products:      81548
#                 Updated Products:  181042
#                 Invalid Products:  0
#                 Deleted Products:  40060
#
#
#  Description:   Utility used to validate and transform records from the Phenom Incoming Product Database.
#                 After the Incoming database has been populated with new product records, this script will apply
#                 the following validation rules:
#                   1)  Every record must contain:
#                         - sourceId
#                         - sourceProductId
#                         - brand
#                         - category
#                   2)  productUrl must be a valid, well-formed URL
#                   3)  Valid name
#
#                 If a record is valid, this script will create the raw SQL query to inject any changes into the
#                 Production database, whether that be updating an existing record, or creating new ones. 
#                 If a record fails validation, it will be copied to the Product Validation Failed area to be 
#                 processed at a later date.  In order to handle large amounts of potential records, the validation
#                 and transformation algorithm is performed as follows:
#                   1)  Select 1st 1000 records from incoming database
#                   2)  Check all fields for records for invalid data, if invalid, transfer to Failure area
#                   3)  Select products from Products database WHERE IN list(1000) products projected in step
#                       1 using the [sourceId, sourceProductId] tuple as a foreign key.
#                   4)  If a record is not found, prepare for incoming record to INSERT into Staging area
#                   5)  If a corresponding record is found, compare each field in production record with
#                       incoming record to examine if an UPDATE is required.  If not, disregard the incoming
#                       record.
#                   6)  DELETE the records projected in step 1 from the Incoming Database and repeat steps
#                       1-6 for the next set of 1000 entries until the Incoming database has been exhausted.
#                       (Ex [2001, 3000], [3001, 4000], ...)
#
#  Usage:         python ./productValidation.py -skip_image_check
#
##################################################################################################################

# Libraries
import MySQLdb
import codecs
import sys
import getopt
import traceback
import re
from progressbar import RotatingMarker, ProgressBar, ETA, Percentage, Counter
from blist import blist
from itertools import groupby
from operator import itemgetter
from boto.s3.connection import S3Connection

# Program Arguments
SKIP_IMAGE_VERIFICATION = False
PRINT = True

# Production Connection
productionDBConnection = MySQLdb.connect(
    user='stephen',
    passwd='shortstop1',
    db='product',
    host='phenomapp-product-prod.caa7mgt2wqzg.us-east-1.rds.amazonaws.com',
    ssl={'ca': '/Users/stephen/Documents/Projects/Phenom/Resources/AWS/rds-combined-ca-bundle.pem'},
    use_unicode=True,
    charset='UTF8'
)
productionDBConnection.autocommit(False)

# Incoming Connection
incomingDBConnection = MySQLdb.connect(
    user='stephen',
    passwd='shortstop1',
    db='product',
    host='phenomapp-product-incoming.caa7mgt2wqzg.us-east-1.rds.amazonaws.com',
    ssl={'ca': '/Users/stephen/Documents/Projects/Phenom/Resources/AWS/rds-combined-ca-bundle.pem'},
    use_unicode=True,
    charset='UTF8'
)
incomingDBConnection.autocommit(False)


# Product Image Support
s3Connection = S3Connection('AKIAI2IRGRNQ5WPGVMMA', 'RI94WbJD+u6vwqnMla45LKKZbd8OLy1oJPojOSGl')
staging_bucket_name = "phenomapp-product"
staging_bucket = s3Connection.get_bucket(staging_bucket_name, validate=False)
production_bucket_name = "phenomapp-product-prod"
production_bucket = s3Connection.get_bucket(production_bucket_name, validate=False)

regex = re.compile(
            r'^(?:http|ftp)s?://'  # http:// or https://
            r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+(?:[A-Z]{2,6}\.?|[A-Z0-9-]{2,}\.?)|'
            r'localhost|'  #localhost...
            r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'  # ...or ip
            r'(?::\d+)?'  # optional port
            r'(?:/?|[/?]\S+)$', re.IGNORECASE)


def __sanitize_category(category):
    # start by stripping the commas
    tokens = re.sub(',', '', category)

    # remove any non-helpful words
    tokens = re.sub('sale', '', tokens, flags=re.I)
    tokens = re.sub('up to', '', tokens, flags=re.I)
    tokens = re.sub('off(!)*', '', tokens, flags=re.I)
    tokens = re.sub('last chance(\s*savings)*', '', tokens, flags=re.I)
    tokens = re.sub('(\d+\.*\d*%)+(-)*(\d+\.*\d*%)*', '', tokens, flags=re.I)
    tokens = re.sub('fan shop', '', tokens, flags=re.I)
    tokens = re.sub('shop(\s*by\s*sport)*', '', tokens, flags=re.I)
    tokens = re.sub('trend', '', tokens, flags=re.I)
    tokens = re.sub('new arrivals', '', tokens, flags=re.I)
    tokens = re.sub('clearence', '', tokens, flags=re.I)
    tokens = re.sub('outlet', '', tokens, flags=re.I)
    tokens = re.sub('save on select', '', tokens, flags=re.I)
    tokens = re.sub('this week\'*s*', '', tokens, flags=re.I)
    tokens = re.sub('online only*\s*!*', '', tokens, flags=re.I)
    tokens = re.sub('(\d+)(\s*for\s*)(\$\d+)', '', tokens, flags=re.I)  #5 for $10
    tokens = re.sub('in store', '', tokens, flags=re.I)
    tokens = re.sub('(pick up)|(pickup)|(only)', '', tokens, flags=re.I)
    tokens = re.sub('(\$\d+\.*\d*)\s*((to)|(-))\s*(\$\d+\.*\d*)*', '', tokens, flags=re.I)
    tokens = re.sub('\$\d+\.*\d*', '', tokens, flags=re.I)
    tokens = re.sub('deals(!)*', '', tokens, flags=re.I)
    tokens = re.sub('with', '', tokens, flags=re.I)
    tokens = re.sub('cash', '', tokens, flags=re.I)
    tokens = re.sub('dick(\')*(s)*', '', tokens, flags=re.I)
    tokens = re.sub('eastbay', '', tokens, flags=re.I)
    tokens = re.sub('&', '', tokens, flags=re.I)
    tokens = re.sub('-', '', tokens, flags=re.I)
    tokens = re.sub('\$', '', tokens, flags=re.I)
    tokens = re.sub('\+', '', tokens, flags=re.I)
    
    # uniquify remaining words via set, then join back into csv for serialization
    tokens = ','.join(filter(None, set(tokens.split(' '))))
    
    return tokens


def __serialize_product_attributes(product):
    # per the product schema, we need to marshal attributes to their appropriate type for serialization in mysql
    packaged_product = {}

    if 'sourceId' in product:
        packaged_product['sourceId'] = int(product['sourceId'])
    
    if 'sourceProductId' in product:
        packaged_product['sourceProductId'] = u"{0}".format(product['sourceProductId'])
    
    if 'name' in product:
        packaged_product['name'] = u"{0}".format(product['name'])
    
    if 'productUrl' in product:
        packaged_product['productUrl'] = u"{0}".format(product['productUrl'])
    
    if 'sku' in product:
        packaged_product['sku'] = u"{0}".format(product['sku'])
    
    if 'brand' in product:
        packaged_product['brand'] = u"" if product["brand"] == "Unknown" else u"{0}".format(product['brand'])
    
    if 'description' in product:
        packaged_product['description'] = u"{0}".format(product['description'])
    
    if 'imageUrl' in product:
        packaged_product['imageUrl'] = u"" if product['imageUrl'] == "None" else u"{0}".format(product['imageUrl'])
    
    if 'alternateImages' in product:
        packaged_product['alternateImages'] = u"" if product['alternateImages'] == "None" \
            else u"{0}".format(product['alternateImages'])
    
    if 'model' in product:
        packaged_product['model'] = u"{0}".format(product['model'])
    
    if 'averageRating' in product:
        packaged_product['averageRating'] = float(product['averageRating'])
    
    if 'reviewCount' in product:
        packaged_product['reviewCount'] = int(product['reviewCount'])
    
    if 'categories' in product:
        packaged_product['categories'] = u"{0}".format(product['categories'])
    
    if 'colors' in product:
        packaged_product['colors'] = u"{0}".format(product['colors'])
    
    if 'sizes' in product:
        packaged_product['sizes'] = u"{0}".format(product['sizes'])

    if 'createdAt' in product:
        packaged_product['createdAt'] = product['createdAt']  # no change in type, let the mysql library figure this out

    # no change, this should only be here for creates, not updates, mysql will auto-gen and actual
    # updateAt values at update time
    if 'updatedAt' in product:
        packaged_product['updatedAt'] = product['updatedAt']

    if 'reachable' in product:
        packaged_product['reachable'] = product['reachable']

    return packaged_product


def __build_update_query_tuple(existing_product, updates):
    query = u'UPDATE `products-staged` SET '

    if len(updates):
        # enumerate the update dictionary adding in all key values that need to be updated
        for key in updates:
            query += u'{0} = %({0})s, '.format(key)

        # remove any trailing ',' values
        if query.endswith(", "):
            query = query[:-2]

        # finish the query
        query += u' WHERE id = ' + unicode(existing_product['id'])

        return query, __serialize_product_attributes(updates)

    return ''


def __build_create_query_tuple(product):
    query = u'INSERT INTO `products-staged` ('

    for key in product:
        if key != 'id':
            query += u'{0}, '.format(key)

    if query.endswith(", "):
        query = query[:-2]

    query += u') VALUES ('

    for key in product:
        if key != 'id':
            query += u"%({0})s, ".format(key)

    # remove any trailing ',' values
    if query.endswith(", "):
        query = query[:-2]

    # finish the query
    query += u')'

    return query, __serialize_product_attributes(product)


def _find_product_differences(existing, incoming):
    product_updates = {}

    # we internally replace invalid fields before ingesting them into the production database, we do those
    # replacements on an incoming product

    def __preprocess(in_product):
        output = in_product

        output['imageUrl'] = u"" if output['imageUrl'] == u"None" else output['imageUrl']
        output['alternateImages'] = u"" if output['alternateImages'] == u"None" else output['alternateImages']
        output['brand'] = u"" if output['brand'] == u"Unknown" else output['brand']
        
        return output

    incoming_product = __preprocess(incoming)

    # print(type(existing['brand']))
    if not existing['brand'] == incoming_product['brand'] and isinstance(incoming_product['brand'], unicode):
        product_updates['brand'] = incoming_product['brand']

    # print(type(existing['name']))
    if not existing['name'] == incoming_product['name'] and isinstance(incoming_product['name'], unicode):
        product_updates['name'] = incoming_product['name']

    # print(type(existing['description']))
    if not existing['description'] == incoming_product['description'] \
            and isinstance(incoming_product['description'], unicode):
        product_updates['description'] = incoming_product['description']

    # print(type(existing['colors']))
    if not existing['colors'] == incoming_product['colors'] and isinstance(incoming_product['colors'], unicode):
        product_updates['colors'] = incoming_product['colors']

    # print(type(existing['productUrl']))
    if not existing['productUrl'] == incoming_product['productUrl'] \
            and isinstance(incoming_product['productUrl'], unicode):
        product_updates['productUrl'] = incoming_product['productUrl']

    # for product images, if the replacement valid is missing, don't replace, keep existing item
    # print(type(existing['imageUrl']))
    if not existing['imageUrl'] == incoming_product['imageUrl'] and isinstance(incoming_product['imageUrl'], unicode) \
            and incoming_product['imageUrl'] != '':
        product_updates['imageUrl'] = incoming_product['imageUrl']

    # print(type(existing['alternateImages']))
    if not existing['alternateImages'] == incoming_product['alternateImages'] \
            and isinstance(incoming_product['alternateImages'], unicode):
        product_updates['alternateImages'] = incoming_product['alternateImages']

    #print(type(existing['categories']))
    if not existing['categories'] == __sanitize_category(incoming_product['categories']) \
            and isinstance(incoming_product['categories'], unicode):
        product_updates['categories'] = __sanitize_category(incoming_product['categories'])

    # print(type(existing['averageRating']))
    if not existing['averageRating'] == incoming_product['averageRating'] \
            and isinstance(incoming_product['averageRating'], float):
        product_updates['averageRating'] = incoming_product['averageRating']

    # print(type(existing['reviewCount']))
    if not existing['reviewCount'] == incoming_product['reviewCount'] \
            and isinstance(incoming_product['reviewCount'], int):
        product_updates['reviewCount'] = incoming_product['reviewCount']

    # at this point, if the product is marked as not reachable, we should mark it as so
    if existing['reachable'] == 0:
        product_updates['reachable'] = 1

    return product_updates


# Takes a snapshot of the product image keys, used in validation
def __get_product_image_keys():
    product_keys = blist([])
    progress_bar = ProgressBar(widgets=[RotatingMarker()], maxval=1000000).start()

    try:
        counter = 0
        for key in staging_bucket:
            product_keys.append(key.name)
            counter += 1
            progress_bar.update(counter)
    finally:
        progress_bar.finish()

    return product_keys


# Emits a list of product image keys if they're not URLS
def __get_product_image_keys_from_product(product):
    image_keys = []

    if 'imageUrl' in product and product['imageUrl'] \
            and product['imageUrl'] is not '\t' \
            and product['imageUrl'] is not ' ' \
            and product['imageUrl'] is not '' \
            and regex.match(product['imageUrl']) is None:
        image_keys.append(product['imageUrl'])

    if 'alternateImages' in product \
            and product['alternateImages'] is not ''\
            and product['alternateImages'] is not '\t' \
            and product['alternateImages'] is not ' ':
        for key in [key.strip() for key in product['alternateImages'].split(",") if key and key is not ' ']:
            image_keys.append(key)

    return image_keys


# Step 1 - Select set from Incoming incomingDBConnection
def get_incoming_count():
    incoming_cursor = incomingDBConnection.cursor()
    incoming_cursor.execute('''SELECT COUNT(*)
                               FROM `products-incoming`''')

    (num_rows,) = incoming_cursor.fetchone()
    incoming_cursor.close()
    return num_rows


def get_production_products_count():
    production_cursor = productionDBConnection.cursor()
    production_cursor.execute('''SELECT COUNT(*)
                                 FROM `products-staged`''')

    (num_rows,) = production_cursor.fetchone()
    production_cursor.close()
    return num_rows


def get_incoming_products(incoming_limit, amount):
    incoming_cursor = incomingDBConnection.cursor(cursorclass=MySQLdb.cursors.SSDictCursor)
    incoming_cursor.execute(('''SELECT * FROM `products-incoming`
                                ORDER BY id
                                LIMIT {0}, {1}'''.format(incoming_limit, amount)), {})

    products = blist([])
    for product in incoming_cursor:
        products.append(product)
    incoming_cursor.close()

    return products


def get_production_products_ids_only(limit, amount):
    production_cursor = productionDBConnection.cursor(cursorclass=MySQLdb.cursors.SSDictCursor)
    production_cursor.execute(('''SELECT id, sourceId, sourceProductId, reachable
                                  FROM `products-staged` LIMIT {0}, {1}'''.format(limit, amount)), {})

    products = blist([])
    for product in production_cursor:
        products.append(product)
    production_cursor.close()

    return products


# Step 2 - Check fields
def validate_products(incoming_products, product_image_keys):
    global SKIP_IMAGE_VERIFICATION

    invalid_products = blist([])
    products = blist([])

    for product in incoming_products:
        # sourceId, sourceProductId, brand, category, imageUrl, and productUrl cannot be empty
        if (product['sourceId'] is None or product['sourceId'] == ''
            or product['sourceProductId'] is None or product['sourceProductId'] == ''
            or product['brand'] is None or product['brand'] == ''
            or product['categories'] is None or product['categories'] == ''
            or product['productUrl'] is None or product['productUrl'] == ''
            or product['name'] is None or product['name'] == ''):
            invalid_products.append(product)
            continue

        # productUrl
        if regex.match(product['productUrl']) is None:
            invalid_products.append(product)
            continue

        # if the imageUrl is not a URL, make sure it's inventoried in S3
        if not SKIP_IMAGE_VERIFICATION:
            if not regex.match(product['imageUrl']) is None and product['imageUrl'] not in product_image_keys:
                invalid_products.append(product)
                continue
            if 'alternateImages' in product \
                and product['alternateImages'] is not ''\
                and product['alternateImages'] is not '\t' \
                and product['alternateImages'] is not ' ':
                for product_image_key in [key.strip() for key in product['alternateImages'].split(",")
                                          if key and key is not ' ']:
                    if product_image_key not in product_image_keys:
                        invalid_products.appent(product)
                        continue
        products.append(product)

    return products, invalid_products


# Step 3 - Find corresponding Products records if they exist
def get_matching_existing_products(valid_incoming_products):
    production_cursor = productionDBConnection.cursor(cursorclass=MySQLdb.cursors.SSDictCursor)
    existing_products = []

    # queries must be grouped by their sourceId, since it's possible we have multiple sourceIds per
    # valid_incoming_products batch
    valid_incoming_products_sorted = sorted(valid_incoming_products, key=itemgetter('sourceId'))

    if len(valid_incoming_products_sorted) > 0:
        for key, group in groupby(valid_incoming_products_sorted, key=lambda p: p['sourceId']):
            query = 'SELECT * FROM `products-staged` WHERE sourceProductId IN (' + ','.join(
                map(lambda p: "\"{0}\"".format(p['sourceProductId']), list(group))) + ') AND sourceId = ' + unicode(key)
            production_cursor.execute(query)
            for product in production_cursor:
                existing_products.append(product)          

    production_cursor.close()
    return existing_products


def get_missing_incoming_products(production_products):
    incoming_cursor = incomingDBConnection.cursor(cursorclass=MySQLdb.cursors.SSDictCursor)
    incoming_products = []

    # queries must be grouped by their sourceId, since it's possible we have multiple sourceIds per
    # valid_incoming_products batch
    production_products_sorted = sorted(production_products, key=itemgetter('sourceId'))

    if len(production_products_sorted) > 0:
        for key, group in groupby(production_products_sorted, key=lambda p: p['sourceId']):
            query = 'SELECT sourceId, sourceProductId FROM `products-incoming` WHERE sourceProductId IN (' + ','.join(
                map(lambda p: "\"{0}\"".format(p['sourceProductId']), list(group))) + ') AND sourceId = ' + unicode(key)
            incoming_cursor.execute(query)
            for product in incoming_cursor:
                incoming_products.append(product)          

    incoming_cursor.close()

    missing_incoming_products = []

    for product in production_products:
        found_product = False
        for incomingProduct in incoming_products:
            if incomingProduct['sourceId'] == product['sourceId'] \
                    and incomingProduct['sourceProductId'] == product['sourceProductId']:
                found_product = True
                break

        if not found_product:
            missing_incoming_products.append(product)

    return missing_incoming_products   


# Step 4-6 - See if product already exists
def build_queries(existing_products, valid_incoming_products):
    product_update_queries = blist()
    new_product_queries = blist()
    image_keys = []

    for product in valid_incoming_products:
        found_product = False

        # search through the incoming products to see if it exists in the existingProduct collection
        for existing_product in existing_products:

            # If it does exist in the existingProduct collection
            if (product['sourceProductId'] == existing_product['sourceProductId'] and product['sourceId'] ==
                existing_product['sourceId']):
                found_product = True

                # see if we need to perform an update by comparing with existing product's fields
                # (comparisonResult, updatedProductSQL, productUpdates) = compareProducts(existingProduct, product)
                product_differences = _find_product_differences(existing_product, product)
                if len(product_differences):
                    product_update_tuple_query, product_updates_tuple_data = __build_update_query_tuple(existing_product, product_differences)
                    product_update_queries.append((product_update_tuple_query, product_updates_tuple_data))
                    image_keys += __get_product_image_keys_from_product(product_updates_tuple_data)
                    continue

        if not found_product:
            new_product_tuple_queries, new_product_tuple_attributes = __build_create_query_tuple(product)
            new_product_queries.append((new_product_tuple_queries, new_product_tuple_attributes))
            image_keys += __get_product_image_keys_from_product(new_product_tuple_attributes)

    return new_product_queries, product_update_queries, image_keys


def build_delete_queries(products):
    product_delete_queries = blist()

    for product in products:
        if product['reachable'] == 1:
            product_delete_queries.append(__build_update_query_tuple(product, {'reachable': 0}))

    return product_delete_queries


def perform_queries(creates, updates, deletes):
    def chunks(m, n):
        for i in xrange(0, len(m), n):
            yield m[i:i + n]

    num_changes = len(creates) + len(updates) + len(deletes)
    if num_changes > 0:
        production_cursor = productionDBConnection.cursor(cursorclass=MySQLdb.cursors.SSDictCursor)

        progress_bar = ProgressBar(widgets=[Percentage(), " ", ETA()], maxval=num_changes).start()
        completed = 0

        try:
            the_chunks = list(chunks(creates, 2000))

            for l in the_chunks:
                values = []
                for create in l:
                    values.append(create[1])

                production_cursor.executemany(the_chunks[0][0][0], values)
                productionDBConnection.commit()
                completed += len(l)
                progress_bar.update(completed)

            # perform and commit updates in batches to avoid accumulating massive changes in memory
            update_chunks = list(chunks(updates, 2000))
            for l in update_chunks:
                for update in l:
                    production_cursor.execute(update[0], update[1])
                    completed += 1
                    progress_bar.update(completed)

                productionDBConnection.commit()

            # perform and commit delete (update reachable attribute) to avoid accumulating massive changes in memory
            deleteChunks = list(chunks(deletes, 2000))
            for l in deleteChunks:
                for delete in l:
                    production_cursor.execute(delete[0], delete[1])
                    completed += 1
                    progress_bar.update(completed)

                productionDBConnection.commit()

            # Commit updates
            productionDBConnection.commit()
        except Exception as e:
            print e
            productionDBConnection.rollback()

        if progress_bar is not None:
            progress_bar.finish()

        production_cursor.close()

def run():
    global SKIP_IMAGE_VERIFICATION
    global PRINT

    product_image_keys = []
    if not SKIP_IMAGE_VERIFICATION:
        print('Inventorying Product Images:  ')
        product_image_keys = __get_product_image_keys()

    to_process = get_incoming_count()
    print('Integrating Incoming Products:  ')
    progress_bar = ProgressBar(widgets=[Percentage(), ",  ", Counter(), ", ", ETA()], maxval=1 if to_process < 1 else to_process).start()
    incoming_limit = 0
    invalid_incoming_products = []
    image_keys_to_move = []
    created = blist([])
    updated = blist([])
    deleted = blist([])

    try:
        while to_process > 0:
            incoming_products = get_incoming_products(incoming_limit, 2500)
            filtered_incoming_products, these_invalid_incoming_products = validate_products(incoming_products,
                                                                                            product_image_keys)
            existing_products = get_matching_existing_products(filtered_incoming_products)
            these_creates, these_updates, these_image_keys = build_queries(existing_products,
                                                                             filtered_incoming_products)

            # ship the changes off to the staging database
            perform_queries(these_creates, these_updates, [])

            # log the stuff we need to deal with later
            image_keys_to_move += these_image_keys
            invalid_incoming_products += these_invalid_incoming_products

            # record our progress
            to_process -= len(incoming_products)
            progress_bar.update(incoming_limit + len(incoming_products))
            incoming_limit += len(incoming_products)
            created += these_creates
            updated += these_updates

        if progress_bar is not None:
            progress_bar.finish()

        # uniqify the image keys
        image_keys_to_move = set(image_keys_to_move)

        print('Looking for Deleted Products:  ')
        to_process = get_production_products_count()
        production_limit = 0
        progress_bar = ProgressBar(widgets=[Percentage(), ",  ", Counter(), ", ", ETA()], maxval=1 if to_process < 1 else to_process).start()

        while to_process > 0:
            production_products = get_production_products_ids_only(production_limit, 2500) 
            missing_incoming_products = get_missing_incoming_products(production_products)
            these_deletes = build_delete_queries(missing_incoming_products)

            # send these changes off to the staged products table
            perform_queries([], [], these_deletes)

            # record our progress
            to_process -= len(production_products)
            progress_bar.update(production_limit + len(production_products))
            production_limit += len(production_products)
            deleted += these_deletes

    except Exception as e:
        print e
        traceback.print_exc(file=sys.stdout)
        productionDBConnection.rollback()
        incomingDBConnection.rollback()
        sys.exit(1)

    if progress_bar is not None:
        progress_bar.finish()

    print('')
    print('New Products:  '     + str(len(created)))
    print('Updated Products:  ' + str(len(updated)))
    print('Invalid Products:  ' + str(len(invalid_incoming_products)))
    print('Deleted Products:  ' + str(len(deleted)))
    print('Image Updates:     ' + str(len(image_keys_to_move)))

    if len(invalid_incoming_products) > 0:
        print ''
        print '''\n
              ########################\n
              #   Invalid Products   #\n
              ########################\n
              '''

        for product in invalid_incoming_products:
            print 'id: ' + str(product['id']) + ' name: ' + product['name']

    if PRINT:
        file_name = "Product_Updates.sql.txt"
        print "\nWriting SQL queries to file:  {0}...\n".format(file_name)

        with codecs.open(file_name, mode='w', encoding='utf-8') as f:
            try:
                for q in created:
                    f.write(u'{0}\n'.format(q[0] % q[1]))

                for q in updated:
                    f.write(u'{0}\n'.format(q[0] % q[1]))

                for q in deleted:
                    f.write(u'{0}\n'.format(q[0] % q[1]))

            except UnicodeEncodeError as e:
                print e

            f.close()

        with codecs.open("Product_Image_Updates.txt", mode="w", encoding="utf-8") as f:
            try:
                for key in image_keys_to_move:
                    f.write(u'{0}\n'.format(key))
            except UnicodeEncodeError as e:
                print e

            f.close()


def main(argv):
    global SKIP_IMAGE_VERIFICATION
    global PRINT

    try:
        opts, args = getopt.getopt(argv, "hps", ["no_print", "skip_image_verification"])
    except getopt.GetoptError:
        print('productValidation.py -n [opt] -s [opt]')
        sys.exit(2)
    for opt, arg in opts:
        if opt == '-h':
            print('productValidation.py -p [opt] -i [opt]')
            sys.exit()
        elif opt in ("-s", "--skip_image_verification"):
            SKIP_IMAGE_VERIFICATION = True
        elif opt in ("-p", "--no_print"):
            PRINT = False

    print('\nIncoming Product Validation Utility\n')
    run()

    # clean up
    productionDBConnection.close()
    incomingDBConnection.close()


if __name__ == "__main__":
    main(sys.argv[1:])
